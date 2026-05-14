import type { Express } from "express";
import axios from "axios";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import multer from "multer";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { loginSchema, signupSchema, projectReviewSchema, creditPurchaseSchema, AUDIT_ACTION_TYPES, type Project, type Transaction } from "@shared/schema";
import { generateToken, requireAuth, requireRole, type AuthRequest } from "./auth";
import {
  computeTransactionId,
  computeProofHash,
  computeMerkleRoot,
  computeBlockHash,
  generateValidatorSignature,
} from "./blockchain";
import { sha256 } from "js-sha256";
import { calculateCarbonSequestration } from "./carbonCalculation";
import { audit } from "./auditLog";
import { parsePolygonFromLandBoundary } from "./gis/polygon-ingestion";
import { validatePolygonGeometry } from "./gis/geometry-validation";
import { computeSpatialMetrics, detectOverlapWithProjects } from "./gis/spatial-service";
import { ecologicalInitializationService } from "./ecology/ecological-initialization-service";
import { monitoringOrchestratorService } from "./mrv/monitoring-orchestrator";
import { verifierWorkflowService } from "./verifier/verifier-workflow-service";
import { projectIntelligenceAggregationService } from "./intelligence/project-intelligence-aggregation-service";
import { reportFoundationService, type FoundationReportType } from "./reports/report-foundation-service";
import { cachedIntelligence } from "./intelligence/intelligence-cache-layer";
import { registerProjectSubscriber, registerAdminSubscriber, pushAuditEvent } from "./realtime/sse-manager";
import { getLivenessResult, getFullHealthResult, getOpsStatus } from "./observability/health-service";
import { appendAuditEvent, getRecentEvents, getEventStats, auditEventEmitter } from "./observability/audit-event-store";
import { getPerformanceSummary } from "./observability/performance-profiler";
import { runAssetCleanup } from "./observability/asset-retention";
import rateLimit from "express-rate-limit";
import { z } from "zod";

// UUID validation regex - matches standard UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

// ─── Async Error Wrapper ────────────────────────────────────────────────────────────
// Wraps async route handlers to forward errors to Express error handler
// This prevents unhandled promise rejections and ensures consistent error responses
function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── Configure multer ─────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Account Lockout Store (Task 1.1) ─────────────────────────────────────────
// In-memory store: email → { count, lockedUntil }
// This is intentionally in-memory so it resets on server restart (acceptable for
// a single-instance deployment; replace with Redis for multi-instance).
interface LockoutEntry {
  count: number;
  lockedUntil: number | null; // Unix timestamp ms, null = not locked
}

const loginAttempts = new Map<string, LockoutEntry>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getLoginAttempts(email: string): LockoutEntry {
  return loginAttempts.get(email) ?? { count: 0, lockedUntil: null };
}

function recordFailedAttempt(email: string): LockoutEntry {
  const entry = getLoginAttempts(email);
  const newCount = entry.count + 1;
  const lockedUntil =
    newCount >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null;
  const updated: LockoutEntry = { count: newCount, lockedUntil };
  loginAttempts.set(email, updated);
  return updated;
}

function resetLoginAttempts(email: string): void {
  loginAttempts.delete(email);
}

function isAccountLocked(email: string): { locked: boolean; remainingMs: number } {
  const entry = getLoginAttempts(email);
  if (!entry.lockedUntil) return { locked: false, remainingMs: 0 };
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    // Lock has expired — reset
    loginAttempts.delete(email);
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: remaining };
}

// ─── In-Memory Cache (Task 7.3) ───────────────────────────────────────────────
// Simple TTL cache for high-traffic read endpoints.
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePattern(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

const cache = new SimpleCache();
const CACHE_TTL_MARKETPLACE = 60 * 1000;  // 60 seconds
const CACHE_TTL_STATS = 5 * 60 * 1000;    // 5 minutes
const PROJECT_SUBMIT_INIT_TIMEOUT_MS = 12_000;
const PROJECT_SUBMIT_DB_TIMEOUT_MS = 10_000;

const contributorSubmissionSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().min(10, "Project description must be at least 10 characters"),
  restorationObjective: z.string().min(5, "Restoration objective is required"),
  organizationName: z.string().optional(),
  restorationNotes: z.string().optional(),
  location: z.string().optional(),
  landBoundary: z.string().min(1, "Polygon boundary is required"),
  monitoringFrequency: z.enum(["biweekly", "monthly", "quarterly"]).optional(),
  ecosystemType: z.enum(["Mangrove", "Seagrass", "Salt Marsh", "Coastal", "Other"]).optional(),
  area: z.coerce.number().positive().optional(),
});

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ─── HEALTH CHECK (Task 5.2) ────────────────────────────────────────────────
  app.get("/health", async (_req, res) => {
    try {
      // Verify DB connectivity by running a lightweight query
      await storage.getAllBlocks();
      return res.json({
        status: "ok",
        db: "connected",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
    } catch (err: any) {
      return res.status(503).json({
        status: "degraded",
        db: "error",
        error: err.message,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ─── AUTH ROUTES - Public ───────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";

      // ── Account Lockout Check (Task 1.1) ──────────────────────────────────
      const lockStatus = isAccountLocked(email);
      if (lockStatus.locked) {
        const remainingMinutes = Math.ceil(lockStatus.remainingMs / 60000);
        // Audit: account was locked when login was attempted
        await audit({
          userId: null,
          actionType: AUDIT_ACTION_TYPES.ACCOUNT_LOCKED,
          entityType: "user",
          entityId: null,
          metadata: { email, ip, remainingMs: lockStatus.remainingMs },
        });
        return res.status(429).json({
          error: `Account temporarily locked due to too many failed login attempts. Try again in ${remainingMinutes} minute(s).`,
          lockedFor: lockStatus.remainingMs,
        });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        recordFailedAttempt(email);
        // Audit: login failure (unknown email)
        await audit({
          userId: null,
          actionType: AUDIT_ACTION_TYPES.LOGIN_FAILURE,
          entityType: "user",
          entityId: null,
          metadata: { email, ip, reason: "user_not_found" },
        });
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Compare hashed passwords
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        const attempt = recordFailedAttempt(email);
        const remaining = MAX_FAILED_ATTEMPTS - attempt.count;
        const isNowLocked = attempt.count >= MAX_FAILED_ATTEMPTS;
        // Audit: login failure (wrong password) — also log if account just got locked
        await audit({
          userId: user.id,
          actionType: isNowLocked
            ? AUDIT_ACTION_TYPES.ACCOUNT_LOCKED
            : AUDIT_ACTION_TYPES.LOGIN_FAILURE,
          entityType: "user",
          entityId: user.id,
          metadata: {
            ip,
            failedAttempts: attempt.count,
            reason: "invalid_password",
            accountLocked: isNowLocked,
          },
        });
        const message = isNowLocked
          ? "Account locked for 15 minutes due to too many failed attempts."
          : `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`;
        return res.status(401).json({ error: message });
      }

      // Successful login — reset lockout counter
      resetLoginAttempts(email);

      // Audit: successful login
      await audit({
        userId: user.id,
        actionType: AUDIT_ACTION_TYPES.LOGIN_SUCCESS,
        entityType: "user",
        entityId: user.id,
        metadata: { ip, role: user.role },
      });

      // Generate JWT token
      const token = generateToken(user);
      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        message: "Login successful",
        token,
        user: userWithoutPassword,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);

      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create user with hashed password
      const user = await storage.createUser(data);
      const token = generateToken(user);
      const { password: _, ...userWithoutPassword } = user;

      // Audit: new user signup
      await audit({
        userId: user.id,
        actionType: AUDIT_ACTION_TYPES.SIGNUP,
        entityType: "user",
        entityId: user.id,
        metadata: { role: user.role, ip: req.ip ?? "unknown" },
      });

      return res.json({
        message: "Account created successfully",
        token,
        user: userWithoutPassword,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/debug/users", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      return res.json(allUsers.map(u => {
        const { password: _, ...rest } = u;
        return rest;
      }));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ─── ROLE CHANGE ROUTE (ADMIN ONLY) ───────────────────────────────────────────
  app.patch("/api/users/:id/role", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      const { role } = req.body;

      // Validate role
      const allowedRoles = ['admin', 'verifier', 'contributor', 'buyer'];
      if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({
          error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`
        });
      }

      // Get existing user
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const oldRole = existingUser.role;

      // Don't allow changing own role (prevent lockout)
      if (id === req.user.id) {
        return res.status(400).json({ error: "Cannot change your own role" });
      }

      // Update user role
      const updatedUser = await storage.updateUser(id, { role });
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user role" });
      }

      // Audit: role changed
      await audit({
        userId: req.user.id,
        actionType: AUDIT_ACTION_TYPES.ROLE_CHANGED,
        entityType: "user",
        entityId: id,
        metadata: {
          targetUserEmail: existingUser.email,
          oldRole,
          newRole: role,
        },
      });

      return res.json({
        message: "Role updated successfully",
        user: { ...updatedUser, password: undefined }
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      // ── Cached stats (Task 7.3) ──────────────────────────────────────────
      const CACHE_KEY = "stats:global";
      const cached = cache.get<object>(CACHE_KEY);
      if (cached) return res.json(cached);

      const projects = await storage.getAllProjects();
      const totalProjects = projects.length;
      const verifiedProjects = projects.filter(p => p.status === "verified").length;
      const totalCO2Captured = projects
        .filter(p => p.status === "verified")
        .reduce((sum, p) => sum + p.co2Captured, 0);

      const result = { totalProjects, verifiedProjects, totalCO2Captured };
      cache.set(CACHE_KEY, result, CACHE_TTL_STATS);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // PROJECT SUBMISSION - Protected route with ecological-first contract
  app.post("/api/projects", requireAuth, upload.any(), async (req: AuthRequest, res) => {
    try {
      const requestStartedAt = Date.now();
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log("[ProjectSubmit] request received", {
        userId: req.user.id,
        contentType: req.headers["content-type"],
      });

      const body = req.body ?? {};
      const parsedSubmission = contributorSubmissionSchema.parse({
        name: body.name,
        description: body.description,
        restorationObjective: body.restorationObjective ?? body.description,
        organizationName: body.organizationName,
        restorationNotes: body.restorationNotes,
        location: body.location,
        landBoundary: body.landBoundary,
        monitoringFrequency: body.monitoringFrequency,
        ecosystemType: body.ecosystemType,
        area: body.area,
      });
      console.log("[ProjectSubmit] validation passed", {
        userId: req.user.id,
        keys: Object.keys(body),
      });

      const files = (req.files ?? []) as Express.Multer.File[];
      const fieldEvidenceFile = files.find((file) => file.fieldname === "fieldEvidence");
      const legacyProofFile = files.find((file) => file.fieldname === "proof");
      const submissionAttachment = fieldEvidenceFile ?? legacyProofFile;

      console.log("[ProjectSubmit] Received submission", {
        userId: req.user.id,
        hasPolygon: Boolean(parsedSubmission.landBoundary),
        monitoringFrequency: parsedSubmission.monitoringFrequency ?? "monthly",
        fileField: submissionAttachment?.fieldname ?? null,
      });

      // GIS polygon ingestion + validation + overlap + area cross-check
      let parsedPolygon: ReturnType<typeof parsePolygonFromLandBoundary> | null = null;
      let metrics: ReturnType<typeof computeSpatialMetrics> | null = null;
      try {
        parsedPolygon = parsePolygonFromLandBoundary(parsedSubmission.landBoundary);
        console.log("[ProjectSubmit] polygon parsed", {
          points: parsedPolygon.polygon.coordinates?.[0]?.length ?? 0,
        });
        const validation = validatePolygonGeometry(parsedPolygon.polygon);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.errors.join(" ") });
        }

        const allProjects = await storage.getAllProjects();
        const overlap = detectOverlapWithProjects(parsedPolygon.polygon, allProjects);
        if (overlap.overlaps && overlap.overlapProjectName) {
          return res.status(400).json({
            error: `GIS Overlap Detected: The selected area overlaps with an existing verified project ("${overlap.overlapProjectName}"). Please adjust boundaries.`
          });
        }

        metrics = computeSpatialMetrics(parsedPolygon.polygon);
      } catch (e) {
        console.error("[ProjectSubmit] GIS ingestion/validation error:", e);
        return res.status(400).json({ error: "Invalid polygon boundary format or geometry." });
      }

      if (!metrics) {
        return res.status(400).json({ error: "Polygon boundary is required for ecological project submission." });
      }

      const calculatedArea = Number(metrics.areaHectares.toFixed(4));
      const fallbackLocation = `${metrics.centroid.lat.toFixed(5)}, ${metrics.centroid.lng.toFixed(5)}`;
      const location = parsedSubmission.location?.trim() ? parsedSubmission.location.trim() : fallbackLocation;
      const ecosystemType = parsedSubmission.ecosystemType ?? "Other";
      const monitoringFrequency = parsedSubmission.monitoringFrequency ?? "monthly";

      const descriptionSections = [
        parsedSubmission.description.trim(),
        `Restoration Objective: ${parsedSubmission.restorationObjective.trim()}`,
        parsedSubmission.organizationName?.trim() ? `Organization: ${parsedSubmission.organizationName.trim()}` : null,
        parsedSubmission.restorationNotes?.trim() ? `Restoration Notes: ${parsedSubmission.restorationNotes.trim()}` : null,
      ].filter((section): section is string => Boolean(section));
      const normalizedDescription = descriptionSections.join("\n\n");

      // Calculate carbon sequestration based on area, ecosystem, and location
      const { annualCO2, lifetimeCO2 } = calculateCarbonSequestration(
        calculatedArea,
        ecosystemType,
        location
      );

      // Handle optional field evidence/proof upload
      let proofFileUrl: string | null = null;
      if (submissionAttachment) {
        // Validate file type
        const allowedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
          'application/msword', // DOC
        ];

        if (!allowedMimeTypes.includes(submissionAttachment.mimetype)) {
          return res.status(400).json({
            error: "Invalid file type. Only PDF, JPG, PNG, and DOCX files are allowed."
          });
        }

        // Check if object storage is configured
        const isObjectStorageConfigured = process.env.PRIVATE_OBJECT_DIR;

        if (isObjectStorageConfigured) {
          try {
            const objectStorage = new ObjectStorageService();
            const fileName = `evidence-${Date.now()}-${submissionAttachment.originalname}`;
            const uploadedUrl = await objectStorage.uploadToPrivate(
              fileName,
              submissionAttachment.buffer,
              submissionAttachment.mimetype
            );
            proofFileUrl = uploadedUrl;
          } catch (uploadError: any) {
            console.error("File upload error:", uploadError);
            return res.status(500).json({
              error: uploadError.message || "Failed to upload proof document"
            });
          }
        } else {
          // Object storage not configured - log warning and skip file upload
          console.warn("⚠️  Object storage not configured. Proof document will not be saved. To enable file uploads, set up object storage and configure PRIVATE_OBJECT_DIR environment variable.");
          // Leave proofFileUrl as null (already set in projectData initialization)
        }
      }

      // Create project with calculated carbon values and ecological-first defaults
      const projectWithCarbon = {
        name: parsedSubmission.name.trim(),
        description: normalizedDescription,
        location,
        area: calculatedArea,
        ecosystemType,
        userId: req.user.id,
        proofFileUrl,
        annualCO2,
        lifetimeCO2,
        co2Captured: lifetimeCO2, // Legacy field, same as lifetime
        landBoundary: parsedSubmission.landBoundary, // GIS polygon data
        monitoringFrequency,
        mrvStatus: "IDLE",
      };

      console.log("[ProjectSubmit] Persisting project", {
        userId: req.user.id,
        name: projectWithCarbon.name,
        area: projectWithCarbon.area,
        ecosystemType: projectWithCarbon.ecosystemType,
      });

      console.log("[ProjectSubmit] DB insert started", { userId: req.user.id });
      const t0Db = Date.now();
      const project = await withTimeout(
        storage.createProject(projectWithCarbon as any),
        PROJECT_SUBMIT_DB_TIMEOUT_MS,
        "project.create"
      );
      console.log("[ProjectSubmit] DB insert completed", {
        projectId: project.id,
        dbMs: Date.now() - t0Db,
      });

      // ── Fire-and-forget: ecological initialization runs in background ─────────
      // We do NOT await this. The HTTP response is returned immediately after
      // project DB persistence. Heavy PostGIS/eco_monitoring inserts happen
      // asynchronously so they cannot stall the contributor submission flow.
      void (async () => {
        const t0Init = Date.now();
        try {
          console.log("[ProjectSubmit:BG] ecological initialization started", { projectId: project.id });
          const ecologicalInit = await withTimeout(
            ecologicalInitializationService.initializeProject(project),
            PROJECT_SUBMIT_INIT_TIMEOUT_MS,
            "ecologicalInitialization"
          );
          console.log("[ProjectSubmit:BG] ecological initialization completed", {
            projectId: project.id,
            initialized: ecologicalInit.initialized,
            mode: ecologicalInit.mode,
            bgMs: Date.now() - t0Init,
          });
          // Update spatial metadata if available (memory mode)
          if (ecologicalInit.mode === "memory" && ecologicalInit.spatial) {
            await storage.updateProject(project.id, {
              areaHectares: ecologicalInit.spatial.areaHectares,
              perimeterKm: ecologicalInit.spatial.perimeterKm,
              centroid: JSON.stringify(ecologicalInit.spatial.centroid),
              bbox: JSON.stringify(ecologicalInit.spatial.bbox),
              monitoringFrequency,
              nextMonitoringDue: new Date(
                Date.now() +
                  (monitoringFrequency === "biweekly"
                    ? 14
                    : monitoringFrequency === "quarterly"
                    ? 90
                    : 30) *
                    24 *
                    60 *
                    60 *
                    1000
              ),
            } as Partial<Project>);
          }
        } catch (initError) {
          console.error("[ProjectSubmit:BG] Ecological initialization failed (non-blocking):", {
            projectId: project.id,
            error: (initError as Error)?.message ?? String(initError),
            bgMs: Date.now() - t0Init,
          });
        }
      })();

      // ── Audit: project submitted (lightweight, runs synchronously) ─────────
      try {
        await audit({
          userId: req.user.id,
          actionType: AUDIT_ACTION_TYPES.PROJECT_SUBMITTED,
          entityType: "project",
          entityId: project.id,
          metadata: {
            projectName: project.name,
            ecosystemType: project.ecosystemType,
            area: project.area,
            lifetimeCO2: project.lifetimeCO2,
            monitoringFrequency,
          },
        });
      } catch (auditErr) {
        console.warn("[ProjectSubmit] audit write failed (non-blocking):", auditErr);
      }

      // Ensure MRV status is IDLE so verifier queue picks this project up
      try {
        await storage.updateProjectMrvStatus(project.id, "IDLE");
      } catch (err) {
        console.warn("[ProjectSubmit] failed to set IDLE MRV status (non-blocking):", err);
      }

      console.log("[ProjectSubmit] Response sent — ecological init running in background", {
        projectId: project.id,
        status: project.status,
        totalMs: Date.now() - requestStartedAt,
      });

      return res.json({
        message: "Project submitted successfully",
        project,
        carbonCalculation: {
          annualCO2,
          lifetimeCO2,
        },
      });
    } catch (error: any) {
      console.error("[ProjectSubmit] Submission error:", {
        message: error?.message,
        totalMs: Date.now() - requestStartedAt,
      });
      return res.status(400).json({ error: error.message || "Failed to submit project" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const { limit, offset } = parsePaginationParams(req);
      const allProjects = await storage.getAllProjects();
      const total = allProjects.length;
      
      // Sort by submittedAt descending (newest first)
      const sorted = [...allProjects].sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      
      const paginatedProjects = sorted.slice(offset, offset + limit);
      
      return res.json({
        data: paginatedProjects,
        pagination: getPaginationMeta(total, limit, offset),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.json(project);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get current user's projects - Protected
  app.get("/api/projects/my", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const projects = await storage.getProjectsByUserId(req.user.id);
      return res.json(projects);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get pending projects - Protected (verifier only)
  app.get("/api/projects/pending", requireAuth, requireRole('verifier', 'admin'), async (req, res) => {
    try {
      const projects = await storage.getProjectsByStatus('pending');
      return res.json(projects);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get verifier's assigned reviews - Protected (verifier/admin only)
  app.get("/api/projects/my-reviews", requireAuth, requireRole('verifier', 'admin'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      console.log("Fetching history for verifier:", req.user.id);
      const projects = await storage.getVerifiedProjectsByVerifierId(req.user.id);
      console.log("Projects found:", projects.length);
      return res.json(projects);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/projects/:id/assign", async (req, res) => {
    try {
      const { id } = req.params;
      const { verifierId } = req.body;

      const updated = await verifierWorkflowService.assignVerifier(
        id,
        verifierId,
        "system:assignment-route",
      );

      // Audit: verifier assigned to project
      await audit({
        userId: null, // Admin action — no auth middleware on this route currently
        actionType: AUDIT_ACTION_TYPES.VERIFIER_ASSIGNED,
        entityType: "project",
        entityId: id,
        metadata: { verifierId },
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/verifier-foundation-review", requireAuth, requireRole("verifier", "admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const persisted = await verifierWorkflowService.submitEnhancedReview(id, req.user.id, req.body);
      return res.json({ success: true, ...persisted });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/review", requireAuth, requireRole("verifier", "admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { action, rejectionReason, comment, clarificationNote } = projectReviewSchema.parse({
        projectId: id,
        ...req.body,
      });

      // Day 4: Check if minting is enabled before approving
      if (action === "approve") {
        const mintingEnabled = await storage.getMintingStatus();
        if (!mintingEnabled) {
          return res.status(403).json({
            error: "Minting temporarily disabled by admin. Approval not allowed at this time.",
            mintingEnabled: false
          });
        }
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // ── Verifier Conflict of Interest Check ──────────────────────────────
      if (req.user?.id === project.userId && req.user?.role !== "admin") {
        console.warn(
          `COI attempt: User ${req.user.id} tried to verify their own project ${id}`
        );
        return res.status(403).json({
          error: "Conflict of Interest: Verifiers cannot verify their own projects.",
        });
      }

      // ── Task 2.3: Project Freeze — block reviews on already-verified projects ──
      if (project.status === "verified") {
        return res.status(400).json({
          error: "Cannot review a project that is already verified. Revoke verification first.",
        });
      }

      // ── Reject action ─────────────────────────────────────────────────────
      if (action === "reject") {
        if (!rejectionReason) {
          return res.status(400).json({
            error: "A rejection reason code is required when rejecting a project.",
          });
        }
        await storage.updateProject(id, {
          status: "rejected",
          rejectionReason: rejectionReason + (comment ? `: ${comment}` : ""),
          clarificationNote: null,
          verifierId: req.user?.id,
        });
        // Audit: project rejected
        await audit({
          userId: req.user?.id,
          actionType: AUDIT_ACTION_TYPES.PROJECT_REJECTED,
          entityType: "project",
          entityId: id,
          metadata: {
            projectName: project.name,
            contributorId: project.userId,
            rejectionReason,
            comment: comment ?? null,
          },
        });
        return res.json({ success: true, message: "Project rejected" });
      }

      // ── Task 2.1: Clarify action — uses dedicated needs_clarification status ──
      if (action === "clarify") {
        if (!clarificationNote) {
          return res.status(400).json({
            error: "A clarification note is required when requesting clarification.",
          });
        }
        await storage.updateProject(id, {
          status: "needs_clarification",
          clarificationNote,
          rejectionReason: null,
          verifierId: req.user?.id,
        });
        // Audit: clarification requested
        await audit({
          userId: req.user?.id,
          actionType: AUDIT_ACTION_TYPES.PROJECT_CLARIFICATION_REQUESTED,
          entityType: "project",
          entityId: id,
          metadata: {
            projectName: project.name,
            contributorId: project.userId,
            clarificationNote,
          },
        });
        return res.json({
          success: true,
          message: "Clarification requested. The contributor has been notified.",
        });
      }

      // ── Task 2.3: Only allow approval if project is in a reviewable state ──
      if (project.status !== "pending" && project.status !== "needs_clarification") {
        return res.status(400).json({
          error: `Cannot approve a project with status '${project.status}'.`,
        });
      }

      const timestamp = new Date();
      const txId = computeTransactionId({
        projectId: project.id,
        userId: project.userId,
        credits: project.co2Captured,
        timestamp,
      });

      const proofHash = computeProofHash(project.proofFileUrl || '');

      const transaction = await storage.createTransaction({
        txId,
        from: 'system',
        to: project.userId,
        credits: project.co2Captured,
        projectId: project.id,
        timestamp,
        proofHash,
        blockId: null,
        status: 'Completed',
        type: 'Mint',
        buyerId: null,
        contributorId: project.userId,
      });

      const pendingTransactions = await storage.getAllTransactions();
      const unblocked = pendingTransactions.filter(tx => !tx.blockId);

      if (unblocked.length >= 1) {
        const lastBlock = await storage.getLastBlock();
        const blockIndex = lastBlock ? lastBlock.index + 1 : 0;
        const previousHash = lastBlock ? lastBlock.blockHash : '0000000000000000';

        const txIds = unblocked.map(tx => tx.txId);
        const merkleRoot = computeMerkleRoot(txIds);

        const blockTimestamp = new Date();
        const { hash: blockHash, input: blockHashInput } = computeBlockHash({
          index: blockIndex,
          timestamp: blockTimestamp,
          merkleRoot,
          previousHash,
          transactionCount: unblocked.length,
        });

        const validatorSignature = generateValidatorSignature(blockHash, project.verifierId || 'system');

        const block = await storage.createBlock({
          index: blockIndex,
          timestamp: blockTimestamp,
          merkleRoot,
          previousHash,
          blockHash,
          blockHashInput,
          validatorSignature,
          transactionCount: unblocked.length,
        });

        for (const tx of unblocked) {
          await storage.updateTransaction(tx.id, { blockId: block.id });
        }
      }

      await storage.updateProject(id, {
        status: "verified",
        creditsEarned: project.lifetimeCO2,
        verifierId: req.user?.id,
      });

      // Invalidate marketplace cache so buyers see the newly verified project
      cache.invalidate("marketplace:verified-projects");
      cache.invalidate("stats:global");

      // Audit: project approved
      await audit({
        userId: req.user?.id,
        actionType: AUDIT_ACTION_TYPES.PROJECT_APPROVED,
        entityType: "project",
        entityId: id,
        metadata: {
          projectName: project.name,
          contributorId: project.userId,
          creditsIssued: project.lifetimeCO2,
          transactionId: transaction.txId,
        },
      });

      return res.json({ success: true, transaction });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/certificate", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);

      if (!project || project.status !== 'verified') {
        return res.status(404).json({ error: "Verified project not found" });
      }

      const transactions = await storage.getAllTransactions();
      const tx = transactions.find(t => t.projectId === id);

      const blocks = await storage.getAllBlocks();
      const block = tx && tx.blockId ? blocks.find(b => b.id === tx.blockId) : undefined;

      const certificate = {
        projectName: project.name,
        projectDescription: project.description,
        co2Captured: project.co2Captured,
        status: project.status,
        submittedAt: project.submittedAt,
        transactionId: tx?.txId || "N/A",
        blockHash: block?.blockHash || "N/A",
        blockIndex: block?.index,
        issuedAt: new Date().toISOString(),
        certificateId: `BC-${project.id}`,
      };

      // Audit: certificate issued (accessed)
      // Note: this endpoint is public — userId may be null for unauthenticated access
      await audit({
        userId: null,
        actionType: AUDIT_ACTION_TYPES.CERTIFICATE_ISSUED,
        entityType: "project",
        entityId: id,
        metadata: {
          certificateId: certificate.certificateId,
          projectName: project.name,
          co2Captured: project.co2Captured,
          transactionId: certificate.transactionId,
        },
      });

      return res.json(certificate);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ─── PUBLIC CERTIFICATE VERIFICATION ENDPOINT (Task 1.5) ───────────────────────
  app.get("/verify/:certificateId", async (req, res) => {
    try {
      const { certificateId } = req.params;

      // Parse certificate ID (format: BCL-YYYY-XXXXXX)
      const certIdMatch = certificateId.match(/^BCL-(\d{4})-(\d+)$/);
      if (!certIdMatch) {
        return res.status(400).json({
          error: "Invalid certificate ID format",
          status: "Invalid"
        });
      }

      const year = parseInt(certIdMatch[1], 10);
      const sequence = parseInt(certIdMatch[2], 10);

      // Find credit transaction by reconstructing the ID from sequence
      // The certificate ID format is BCL-{year}-{sequence} where sequence is derived from purchase.id
      // We need to find the purchase by matching the sequence
      const allTransactions = await storage.getAllCreditTransactions();

      let matchingTx: any = null;
      for (const tx of allTransactions) {
        const txSeq = String(tx.id).slice(-6).padStart(6, '0');
        if (txSeq === certIdMatch[2]) {
          matchingTx = tx;
          break;
        }
      }

      if (!matchingTx) {
        return res.status(404).json({
          error: "Certificate not found",
          status: "Not Found"
        });
      }

      // Get related data
      const buyer = await storage.getUser(matchingTx.buyerId);
      const contributor = await storage.getUser(matchingTx.contributorId);
      const project = await storage.getProject(matchingTx.projectId);

      if (!buyer || !project) {
        return res.status(404).json({
          error: "Certificate data not found",
          status: "Not Found"
        });
      }

      // Determine status based on certificateStatus field
      const status = matchingTx.certificateStatus === 'revoked' ? 'REVOKED' : 'Valid';

      return res.json({
        certificateId: `BCL-${year}-${certIdMatch[2]}`,
        status,
        projectName: project.name,
        buyerName: buyer.name,
        creditsPurchased: matchingTx.credits,
        issueDate: matchingTx.timestamp,
        projectLocation: project.location,
        ecosystemType: project.ecosystemType,
        transactionId: matchingTx.id,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ─── PAGINATION HELPERS ───────────────────────────────────────────────────────
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;

  function parsePaginationParams(req: any) {
    const limit = Math.min(
      parseInt(req.query.limit) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const offset = parseInt(req.query.offset) || 0;
    return { limit, offset };
  }

  function getPaginationMeta(total: number, limit: number, offset: number) {
    return {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  app.get("/api/transactions", async (req, res) => {
    try {
      const { limit, offset } = parsePaginationParams(req);
      const allTransactions = await storage.getAllTransactions();
      const total = allTransactions.length;
      
      // Sort by timestamp descending (newest first)
      const sorted = [...allTransactions].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const paginatedTransactions = sorted.slice(offset, offset + limit);
      
      return res.json({
        data: paginatedTransactions,
        pagination: getPaginationMeta(total, limit, offset),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transactions/my", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const transactions = await storage.getTransactionsByUserId(req.user.id);
      return res.json(transactions);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/blocks", async (req, res) => {
    try {
      const { limit, offset } = parsePaginationParams(req);
      const allBlocks = await storage.getAllBlocks();
      const total = allBlocks.length;
      
      // Sort by index descending (newest first)
      const sorted = [...allBlocks].sort((a, b) => b.index - a.index);
      
      const paginatedBlocks = sorted.slice(offset, offset + limit);
      
      return res.json({
        data: paginatedBlocks,
        pagination: getPaginationMeta(total, limit, offset),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/blockchain/export", async (_req, res) => {
    try {
      const blocks = await storage.getAllBlocks();
      const transactions = await storage.getAllTransactions();
      const projects = await storage.getAllProjects();

      // ── Real Blockchain Integrity Validation (Task 5.1) ──────────────────
      // Validate the entire chain by recomputing each block's hash from its
      // stored blockHashInput and verifying the previousHash linkage.
      let integrityStatus: "verified" | "tampered" = "verified";
      const integrityErrors: string[] = [];

      const sortedBlocks = [...blocks].sort((a, b) => a.index - b.index);

      for (let i = 0; i < sortedBlocks.length; i++) {
        const block = sortedBlocks[i];

        // 1. Recompute hash from stored input and compare
        const recomputedHash = sha256(block.blockHashInput);
        if (recomputedHash !== block.blockHash) {
          integrityStatus = "tampered";
          integrityErrors.push(
            `Block #${block.index}: hash mismatch. Expected ${recomputedHash}, got ${block.blockHash}`
          );
        }

        // 2. Verify previousHash linkage (skip genesis block)
        if (i > 0) {
          const prevBlock = sortedBlocks[i - 1];
          if (block.previousHash !== prevBlock.blockHash) {
            integrityStatus = "tampered";
            integrityErrors.push(
              `Block #${block.index}: previousHash does not match Block #${prevBlock.index} hash`
            );
          }
        }
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalBlocks: blocks.length,
        totalTransactions: transactions.length,
        totalProjects: projects.length,
        blocks: sortedBlocks.map(block => ({
          ...block,
          transactions: transactions.filter(tx => tx.blockId === block.id),
        })),
        integrity: integrityStatus,
        integrityErrors: integrityErrors.length > 0 ? integrityErrors : undefined,
      };

      return res.json(exportData);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ── Blockchain Integrity Check Endpoint (Task 5.1) ──────────────────────────
  app.get("/api/blockchain/integrity", async (_req, res) => {
    try {
      const blocks = await storage.getAllBlocks();
      const sortedBlocks = [...blocks].sort((a, b) => a.index - b.index);

      let status: "verified" | "tampered" = "verified";
      const errors: string[] = [];

      for (let i = 0; i < sortedBlocks.length; i++) {
        const block = sortedBlocks[i];

        const recomputedHash = sha256(block.blockHashInput);
        if (recomputedHash !== block.blockHash) {
          status = "tampered";
          errors.push(`Block #${block.index}: hash mismatch`);
        }

        if (i > 0) {
          const prevBlock = sortedBlocks[i - 1];
          if (block.previousHash !== prevBlock.blockHash) {
            status = "tampered";
            errors.push(`Block #${block.index}: broken chain link`);
          }
        }
      }

      return res.json({
        status,
        totalBlocks: sortedBlocks.length,
        checkedAt: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // VERIFIER DASHBOARD STATUS (Improved Performance & Stats)
  app.get("/api/verifier/status", requireAuth, requireRole('verifier', 'admin'), async (req: AuthRequest, res) => {
    try {
      const mintingEnabled = await storage.getMintingStatus();

      // Get verified and rejected projects by this verifier
      const myReviews = await storage.getVerifiedProjectsByVerifierId(req.user!.id);
      // Enhanced performance aggregation
      const verifiedProjects = myReviews.filter(p => p.status === 'verified');
      const rejectedProjects = myReviews.filter(p => p.status === 'rejected');

      const totalCO2 = verifiedProjects.reduce((sum, p) => sum + (p.co2Captured || 0), 0);

      // Average review time calculation - using submittedAt as a base
      let avgReviewDays = 0;
      if (myReviews.length > 0) {
        const totalMs = myReviews.reduce((sum, p) => {
          const start = new Date(p.submittedAt).getTime();
          const end = Date.now(); // Fallback estimate since project is finalized
          return sum + (end - start);
        }, 0);
        avgReviewDays = totalMs / myReviews.length / (1000 * 60 * 60 * 24);
      }

      // Trust Score: verified projects / (verified + rejected) or 100%
      const totalReviews = verifiedProjects.length + rejectedProjects.length;
      const trustScore = totalReviews > 0
        ? Math.round((verifiedProjects.length / totalReviews) * 100)
        : 100;

      const warnings = await storage.getWarningsByContributorId(req.user!.id);

      return res.json({
        mintingEnabled,
        trustScore,
        warningCount: warnings.length,
        performance: {
          verified: verifiedProjects.length,
          rejected: rejectedProjects.length,
          totalCO2: Math.round(totalCO2 * 100) / 100,
          avgReviewTime: Math.max(0.1, Math.round(avgReviewDays * 10) / 10) || 0,
          pendingReviews: (await storage.getProjectsByStatus('pending')).length
        },
        meta: {
          verifierId: req.user!.id,
          totalInteractions: myReviews.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/verifiers", async (req, res) => {
    try {
      const verifiers = await storage.getUsersByRole('verifier');
      return res.json(verifiers.map(v => ({ ...v, password: undefined })));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // MARKETPLACE ROUTES - Protected (Buyer role)
  app.get("/api/projects/marketplace", requireAuth, requireRole("buyer"), async (_req: AuthRequest, res) => {
    try {
      // ── Cached marketplace listing (Task 7.3) ─────────────────────────────
      const CACHE_KEY = "marketplace:verified-projects";
      const cached = cache.get<object[]>(CACHE_KEY);
      if (cached) return res.json(cached);

      let projects = await storage.getProjectsByStatus("verified");
      projects = projects.filter(p => (p as any).isListed !== false);
      cache.set(CACHE_KEY, projects, CACHE_TTL_MARKETPLACE);
      return res.json(projects);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // BUYER FILTER ROUTE - Filter contributors by credits and plantation type
  app.get("/api/buyer/filter", requireAuth, requireRole('buyer'), async (req: AuthRequest, res) => {
    try {
      const { credits_min, credits_max, plantation_type } = req.query;

      // Get all verified and listed projects
      let projects = (await storage.getProjectsByStatus('verified')).filter(p => (p as any).isListed !== false);

      // Apply filters
      if (credits_min) {
        const min = parseFloat(credits_min as string);
        projects = projects.filter(p => (p.creditsEarned || 0) >= min);
      }

      if (credits_max) {
        const max = parseFloat(credits_max as string);
        projects = projects.filter(p => (p.creditsEarned || 0) <= max);
      }

      if (plantation_type) {
        projects = projects.filter(p => p.plantationType === plantation_type);
      }

      // Sort by credits_earned DESC (highest first)
      projects.sort((a, b) => (b.creditsEarned || 0) - (a.creditsEarned || 0));

      // Return formatted response with requested fields
      const response = projects.map(p => ({
        id: p.id,
        name: p.name,
        location: p.location,
        area_ha: p.area,
        plantation_type: p.plantationType,
        credits_earned: p.creditsEarned,
        carbon_avoided_tpy: p.annualCO2,
      }));

      return res.json(response);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // CREDIT PURCHASE ROUTES
  app.post("/api/credits/purchase", requireAuth, requireRole('buyer'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const validated = creditPurchaseSchema.parse(req.body);
      const { contributorId, projectId, credits, idempotencyKey } = validated;

      // Atomically purchase credits - this updates buyer, contributor, and project balances
      const result = await storage.purchaseCredits(
        req.user.id,
        contributorId,
        projectId,
        credits,
        validated.amount || 0,
        idempotencyKey
      );

      console.log(`[REWARD_DEBUG] Purchase successful. Buyer points: ${result.buyer.rewardPoints}, Contributor points: ${result.contributor.rewardPoints}`);

      // Invalidate marketplace cache — project's available credits have changed
      cache.invalidate("marketplace:verified-projects");

      // Audit: credits purchased and retired
      await audit({
        userId: req.user.id,
        actionType: AUDIT_ACTION_TYPES.CREDITS_PURCHASED,
        entityType: "credit_transaction",
        entityId: result.transaction.id,
        metadata: {
          buyerId: req.user.id,
          contributorId,
          projectId,
          credits,
          projectName: result.project.name,
        },
      });

      return res.json({
        message: "Purchase successful",
        buyer: { ...result.buyer, password: undefined },
        project: result.project,
        transaction: result.transaction,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // Get buyer's purchase history
  app.get("/api/credits/purchases", requireAuth, requireRole('buyer'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const transactions = await storage.getCreditTransactionsByBuyerId(req.user.id);

      // Enrich transactions with contributor and project details for certificate generation
      const enriched = await Promise.all(
        transactions.map(async (tx) => {
          const contributor = await storage.getUser(tx.contributorId);
          const project = await storage.getProject(tx.projectId);
          return {
            ...tx,
            contributorName: contributor?.name || 'Unknown',
            projectName: project?.name || 'Unknown',
            projectLocation: project?.location || 'Unknown Location',
            ecosystemType: project?.ecosystemType || 'Blue Carbon',
            projectArea: project?.area || 0,
            annualCO2: project?.annualCO2 || 0,
          };
        })
      );

      return res.json(enriched);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get contributor's sales history
  app.get("/api/credits/sales", requireAuth, requireRole('contributor'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const transactions = await storage.getCreditTransactionsByContributorId(req.user.id);

      // Enrich transactions with buyer and project details
      const enriched = await Promise.all(
        transactions.map(async (tx) => {
          const buyer = await storage.getUser(tx.buyerId);
          const project = await storage.getProject(tx.projectId);
          return {
            ...tx,
            buyerName: buyer?.name || 'Unknown',
            projectName: project?.name || 'Unknown',
          };
        })
      );

      return res.json(enriched);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // OBJECT STORAGE ROUTES
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/proof-files", async (req, res) => {
    try {
      if (!req.body.proofFileURL) {
        return res.status(400).json({ error: "proofFileURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.proofFileURL,
        {
          owner: 'system',
          visibility: "public",
        },
      );

      res.status(200).json({ objectPath });
    } catch (error: any) {
      console.error("Error setting proof file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ─── DATABASE BACKUP ENDPOINT (Task 4.3) ─────────────────────────────────────
  // Admin-only endpoint to trigger a manual backup export (JSON dump of all tables).
  // This provides a downloadable snapshot of the database state for disaster recovery.
  app.post("/api/admin/backup", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Collect all data from storage
      const [
        allUsers,
        allProjects,
        allTransactions,
        allBlocks,
        allCreditTransactions,
      ] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllProjects(),
        storage.getAllTransactions(),
        storage.getAllBlocks(),
        storage.getAllCreditTransactions(),
      ]);

      // Remove sensitive data (passwords) from users
      const sanitizedUsers = allUsers.map((user) => {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      // Get audit logs from in-memory store
      const auditLogsData = await (async () => {
        try {
          const { memAuditLog } = await import("./auditLog");
          return memAuditLog.getAll();
        } catch {
          return [];
        }
      })();

      // Build backup object with metadata
      const backup = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: req.user.id,
          version: "1.0",
          environment: process.env.NODE_ENV || "development",
        },
        counts: {
          users: sanitizedUsers.length,
          projects: allProjects.length,
          transactions: allTransactions.length,
          blocks: allBlocks.length,
          creditTransactions: allCreditTransactions.length,
          auditLogs: auditLogsData.length,
        },
        data: {
          users: sanitizedUsers,
          projects: allProjects,
          transactions: allTransactions,
          blocks: allBlocks,
          creditTransactions: allCreditTransactions,
          auditLogs: auditLogsData,
        },
      };

      // Set headers for file download
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `bluecarbon-backup-${timestamp}.json`;

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      // Audit: backup was triggered
      await audit({
        userId: req.user.id,
        actionType: "BACKUP_CREATED" as any,
        entityType: "system",
        entityId: null,
        metadata: {
          filename,
          recordCounts: backup.counts,
        },
      });

      return res.json(backup);
    } catch (error: any) {
      console.error("Backup failed:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // ─── CERTIFICATE REVOCATION ENDPOINT (Task 3.1) ─────────────────────────────────────
  // Admin-only endpoint to revoke a certificate. This marks the certificate as revoked
  // in the database without affecting blockchain records or purchase transactions.
  app.post("/api/admin/certificates/:id/revoke", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      const { reason } = req.body;

      // Find the credit transaction
      const transaction = await storage.getCreditTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      // Check if already revoked
      if (transaction.certificateStatus === 'revoked') {
        return res.status(400).json({ error: "Certificate is already revoked" });
      }

      // Update the certificate status
      await storage.updateCreditTransaction(id, { certificateStatus: 'revoked' });

      // Audit log the revocation
      await audit({
        userId: req.user.id,
        actionType: AUDIT_ACTION_TYPES.CERTIFICATE_REVOKED,
        entityType: 'creditTransaction',
        entityId: id,
        metadata: {
          reason: reason || 'No reason provided',
          previousStatus: transaction.certificateStatus,
          newStatus: 'revoked',
        },
      });

      return res.json({
        success: true,
        message: "Certificate revoked successfully",
        certificateId: id,
        status: "revoked",
      });
    } catch (error: any) {
      console.error("Certificate revocation failed:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // ─── ADMIN GOVERNANCE & LEDGER ROUTES (New Upgrade) ───────────────────────────

  app.get("/api/admin/top-buyers", requireAuth, requireRole('admin'), async (_req, res) => {
    try {
      const topBuyers = await storage.getTopBuyers();
      return res.json(topBuyers);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/top-contributors", requireAuth, requireRole('admin'), async (_req, res) => {
    try {
      const topContributors = await storage.getTopContributors();
      return res.json(topContributors);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/ledger - Add audit logging for security tracking
  app.get("/api/admin/ledger", requireAuth, requireRole('admin'), async (req: AuthRequest, _res) => {
    try {
      // Log ledger access for security audit trail
      await audit({
        userId: req.user!.id,
        actionType: "VIEW_LEDGER" as any,
        entityType: "system",
        entityId: "ledger",
        metadata: { timestamp: new Date().toISOString() },
      });
      const ledger = await storage.getAdminLedger();
      return _res.json(ledger);
    } catch (error: any) {
      return _res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/minting-status", requireAuth, requireRole('admin'), async (_req, res) => {
    try {
      const enabled = await storage.getMintingStatus();
      return res.json({ enabled });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/minting-status", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }
      await storage.setMintingStatus(enabled);

      await audit({
        userId: req.user!.id,
        actionType: "MINTING_STATUS_CHANGED" as any,
        entityType: "system",
        entityId: "global",
        metadata: { enabled },
      });

      return res.json({ success: true, enabled });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/projects/:id/remove - Add UUID validation
  app.post("/api/admin/projects/:id/remove", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Validate UUID format for security
      if (!isValidUUID(id)) {
        return res.status(400).json({ error: "Invalid Project ID format" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ error: "Project not found" });

      await storage.updateProject(id, { isListed: false });

      await audit({
        userId: req.user!.id,
        actionType: "PROJECT_REMOVED_FROM_MARKETPLACE" as any,
        entityType: "project",
        entityId: id,
        metadata: { projectName: project.name },
      });

      return res.json({ success: true, message: "Project removed from marketplace" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/warnings - Add strict severity validation
  app.post("/api/admin/warnings", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      const { contributorId, message, severity } = req.body;
      if (!contributorId || !message || !severity) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Strict severity validation - only allow low, medium, critical
      const allowedSeverity = ["low", "medium", "critical"];
      if (!allowedSeverity.includes(severity.toLowerCase())) {
        return res.status(400).json({ error: "Invalid severity. Allowed values: low, medium, critical" });
      }

      const warning = await storage.issueWarning({ contributorId, message, severity: severity.toLowerCase() });

      await audit({
        userId: req.user!.id,
        actionType: "WARNING_ISSUED" as any,
        entityType: "user",
        entityId: contributorId,
        metadata: { message, severity },
      });

      return res.json(warning);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/warnings/:contributorId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { contributorId } = req.params;
      // Admin can see any, contributors can only see their own
      if (req.user!.role !== 'admin' && req.user!.id !== contributorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const warnings = await storage.getWarningsByContributorId(contributorId);
      return res.json(warnings);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/rollback - Add strict type validation
  app.post("/api/admin/rollback", requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    try {
      const { targetId, type, reason } = req.body;
      if (!targetId || !type || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Strict rollback type validation - only allow mint, buy, sell, verify, listing
      const allowedTypes = ["mint", "buy", "sell", "verify", "listing"];
      if (!allowedTypes.includes(type.toLowerCase())) {
        return res.status(400).json({ error: "Invalid rollback type. Allowed values: mint, buy, sell, verify, listing" });
      }

      await storage.rollbackAction({
        adminId: req.user!.id,
        targetId,
        type: type.toLowerCase(),
        reason
      });

      await audit({
        userId: req.user!.id,
        actionType: "ROLLBACK_PERFORMED" as any,
        entityType: type, // Transaction, Project, etc.
        entityId: targetId,
        metadata: { reason, type },
      });

      return res.json({ success: true, message: "Rollback recorded and action performed" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ─── MRV SYSTEM ROUTES (Queue-backed orchestration) ─────────────────────────

  app.post("/api/mrv/trigger", requireAuth, async (req: AuthRequest, res) => {
    try {
      console.log("MRV trigger hit");

      const { projectId } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: "Missing projectId in request body" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!project.landBoundary) {
        return res.status(400).json({ error: "Project has no valid GIS boundary to analyze" });
      }

      const queued = project.baselineCompletedAt
        ? await monitoringOrchestratorService.triggerScheduledMonitoring({
            projectId,
            landBoundary: project.landBoundary,
            triggeredBy: `user:${req.user?.id ?? "unknown"}`,
          })
        : await monitoringOrchestratorService.triggerBaselineAnalysis({
            projectId,
            landBoundary: project.landBoundary,
            triggeredBy: `user:${req.user?.id ?? "unknown"}`,
          });

      return res.json({ status: "started", jobId: queued.jobId, queueMode: queued.queueMode });

    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/mrv/cancel", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { projectId } = req.body;
      if (!projectId) return res.status(400).json({ error: "Missing projectId" });
      await monitoringOrchestratorService.cancel(projectId);
      console.log(`[MRV] Cancel requested for ${projectId}`);
      return res.json({ status: 'CANCELLED' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/mrv/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Not found" });

      const score = await storage.getMrvScore(projectId);
      const measurements = await storage.getNdviMeasurements(projectId);
      const latestNdvi = measurements.length > 0 ? measurements[measurements.length - 1] : null;

      const runtimeStatus = await monitoringOrchestratorService.getStatus(projectId);
      console.log(`[MRV Poll] ${projectId}: mrvStatus=${runtimeStatus.status} progress=${runtimeStatus.progress}%`);

      // Extract tile URL from stored rawGeeResponse
      let ndviTileUrl: string | null = null;
      if (latestNdvi?.rawGeeResponse) {
        try {
          const raw = JSON.parse(latestNdvi.rawGeeResponse);
          ndviTileUrl = raw?.current?.tileUrl ?? null;
        } catch (_) {}
      }

      return res.json({
        status: runtimeStatus.status,
        progress: runtimeStatus.progress,
        step: runtimeStatus.step,
        data: score || null,
        measurements,
        ndvi: latestNdvi?.ndviMean ?? null,
        baselineNdvi: score?.baselineNdvi ?? null,
        ndviTileUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── Rate limiters for heavy intelligence/report endpoints ─────────────────
  const intelligenceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Intelligence query rate limit exceeded. Try again shortly." },
    skip: () => process.env.NODE_ENV === "test",
  });

  const reportLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Report generation rate limit exceeded. Please wait before generating another report." },
    skip: () => process.env.NODE_ENV === "test",
  });

  // ─── Verifier Intelligence + Reporting APIs (cache-enabled) ─────────────────
  app.get("/api/projects/:id/timeline", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const timeline = await cachedIntelligence.getTimeline(req.params.id);
      return res.json(timeline);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/monitoring-timeline", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const timeline = await cachedIntelligence.getMonitoringTimeline(req.params.id);
      return res.json(timeline);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/historical-observations", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const indicator = req.query.indicator ? String(req.query.indicator) : undefined;
      const history = await cachedIntelligence.getHistoricalObservations(req.params.id, indicator);
      return res.json(history);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/indicator-history", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const indicator = req.query.indicator ? String(req.query.indicator) : "ndvi";
      const trend = await cachedIntelligence.getTrendPreparation(req.params.id, indicator);
      return res.json(trend);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/changes", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const change = await cachedIntelligence.getEnvironmentalChangeFoundation(req.params.id);
      return res.json(change);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/baseline-vs-current", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const indicator = req.query.indicator ? String(req.query.indicator) : "ndvi";
      const comparison = await cachedIntelligence.getBaselineVsCurrent(req.params.id, indicator);
      return res.json(comparison);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/environmental-summary", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const summary = await cachedIntelligence.getEnvironmentalSummary(req.params.id);
      return res.json(summary);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/satellite-artifacts", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const artifacts = await cachedIntelligence.getSatelliteArtifacts(req.params.id);
      return res.json(artifacts);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/trend-anomalies", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const anomalies = await cachedIntelligence.getTrendAnomalyMarkers(req.params.id);
      return res.json(anomalies);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/restoration-risk-score", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const score = await cachedIntelligence.getRestorationRiskScore(req.params.id);
      return res.json(score);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/monitoring-alerts", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const persist = String(req.query.persist || "false").toLowerCase() === "true";
      const alerts = await cachedIntelligence.getMonitoringAlerts(req.params.id, persist);
      return res.json(alerts);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/environmental-insights", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const insights = await cachedIntelligence.getAutomatedInsights(req.params.id);
      return res.json(insights);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/restoration-trajectory", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const trajectory = await cachedIntelligence.getLongTermTrajectory(req.params.id);
      return res.json(trajectory);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/seasonal-patterns", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const seasonal = await cachedIntelligence.getSeasonalPatternComparison(req.params.id);
      return res.json(seasonal);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/notification-foundations", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const events = await cachedIntelligence.getNotificationEventFoundations(req.params.id);
      return res.json(events);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/monitoring-recommendations", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const recommendations = await cachedIntelligence.getMonitoringRecommendations(req.params.id);
      return res.json(recommendations);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/intelligence/threshold-rules", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (_req, res) => {
    try {
      const config = await cachedIntelligence.getThresholdRuleConfig();
      return res.json(config);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/intelligence/calibration-presets", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (_req, res) => {
    try {
      const presets = await cachedIntelligence.getCalibrationPresets();
      return res.json(presets);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/calibration-profile", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const profile = await cachedIntelligence.getEffectiveCalibration(req.params.id);
      return res.json(profile);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/intelligence/calibration-profile", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const result = await projectIntelligenceAggregationService.upsertCalibrationProfile({
        scopeType: body.scopeType,
        scopeId: body.scopeId,
        ecosystemKey: body.ecosystemKey,
        profileKey: body.profileKey,
        thresholdOverrides: body.thresholdOverrides,
        anomalyWeights: body.anomalyWeights,
        seasonalTuning: body.seasonalTuning,
        confidenceTuning: body.confidenceTuning,
        createdBy: req.user?.id,
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/field-evidence", requireAuth, requireRole("verifier", "admin"), upload.single("attachment"), intelligenceLimiter, async (req: AuthRequest, res) => {
    try {
      const metrics = req.body.measuredMetrics ? JSON.parse(String(req.body.measuredMetrics)) : {};
      const objectStorage = new ObjectStorageService();
      const uploadPath = req.file
        ? await objectStorage.uploadToPrivate(
            req.file.originalname,
            req.file.buffer,
            req.file.mimetype
          )
        : null;

      const result = await projectIntelligenceAggregationService.addFieldEvidence({
        projectId: req.params.id,
        monitoringCycleId: req.body.monitoringCycleId ?? null,
        uploadedBy: req.user?.id ?? null,
        evidenceType: req.body.evidenceType ?? "FIELD_OBSERVATION",
        observationDate: req.body.observationDate ?? new Date().toISOString(),
        latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
        longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
        measuredMetrics: metrics,
        notes: req.body.notes,
        attachmentPath: uploadPath ?? undefined,
        metadata: { uploadName: req.file?.originalname ?? null },
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/field-vs-satellite", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const indicator = req.query.indicator ? String(req.query.indicator) : "ndvi";
      const result = await cachedIntelligence.getFieldVsSatelliteComparison(req.params.id, indicator);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/ecological-review-note", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const result = await projectIntelligenceAggregationService.addEcologicalReviewNote({
        projectId: req.params.id,
        monitoringCycleId: body.monitoringCycleId ?? null,
        verifierId: req.user?.id ?? null,
        noteType: body.noteType ?? "GENERAL_REVIEW",
        severity: body.severity ?? "INFO",
        note: body.note ?? "",
        tags: body.tags ?? [],
        metadata: body.metadata ?? {},
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/verifier-override-log", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const result = await projectIntelligenceAggregationService.addVerifierOverrideLog({
        projectId: req.params.id,
        monitoringCycleId: body.monitoringCycleId ?? null,
        verifierId: req.user?.id ?? null,
        overrideType: body.overrideType ?? "MANUAL_REVIEW_OVERRIDE",
        previousValue: body.previousValue ?? null,
        newValue: body.newValue ?? null,
        reason: body.reason ?? "Verifier override rationale not provided.",
        metadata: body.metadata ?? {},
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/registry", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (req, res) => {
    try {
      const registry = await cachedIntelligence.getAuditReadyRegistryRecord(req.params.id);
      return res.json(registry);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/registry", requireAuth, requireRole("verifier", "admin"), intelligenceLimiter, async (_req, res) => {
    try {
      const rows = await cachedIntelligence.listAuditReadyRegistry(200);
      return res.json(rows);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/reports", requireAuth, requireRole("verifier", "admin"), async (req, res) => {
    try {
      const reports = await reportFoundationService.listReports(req.params.id);
      return res.json(reports);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/reports/generate", requireAuth, requireRole("verifier", "admin"), async (req, res) => {
    try {
      const reportType = (req.body.reportType || "MONITORING_PERIODIC") as FoundationReportType;
      const generated = await reportFoundationService.generateReport(req.params.id, reportType);
      return res.json(generated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/mrv/report/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Not found" });

      const score = await storage.getMrvScore(projectId);
      const measurements = await storage.getNdviMeasurements(projectId);
      const latestNdvi = measurements.length > 0 ? measurements[measurements.length - 1] : null;

      // Dynamic import to avoid esbuild issues with browser-focused packages
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.text("BlueCarbon MRV Report", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Project Name: ${project.name}`, 20, 40);
      doc.text(`Project ID: ${project.id}`, 20, 50);
      doc.text(`Location: ${project.location}`, 20, 60);
      doc.text(`Ecosystem: ${project.ecosystemType}`, 20, 70);
      doc.text(`Area: ${project.area} hectares`, 20, 80);
      
      doc.setFontSize(16);
      doc.text("Vegetation Analysis (NDVI)", 20, 100);
      doc.setFontSize(12);
      doc.text(`Current NDVI: ${latestNdvi?.ndviMean?.toFixed(4) || 'N/A'}`, 20, 110);
      doc.text(`Baseline NDVI: ${score?.baselineNdvi?.toFixed(4) || 'N/A'}`, 20, 120);
      
      if (score) {
        doc.text(`Variance (Delta %): ${score.ndviDeltaPct?.toFixed(2)}%`, 20, 130);
        doc.setFontSize(16);
        doc.text("Carbon Trust Score", 20, 150);
        doc.setFontSize(14);
        doc.text(`Score: ${score.trustScore} / 100`, 20, 160);
        doc.text(`Confidence Level: ${score.confidence}`, 20, 170);
      }

      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toISOString()}`, 20, 280);

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=mrv_report_${projectId}.pdf`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/mrv/report/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Not found" });

      const score = await storage.getMrvScore(projectId);
      const measurements = await storage.getNdviMeasurements(projectId);
      const latestNdvi = measurements.length > 0 ? measurements[measurements.length - 1] : null;

      // Dynamic import to avoid esbuild issues with browser-focused packages
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.text("BlueCarbon MRV Report", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Project Name: ${project.name}`, 20, 40);
      doc.text(`Project ID: ${project.id}`, 20, 50);
      doc.text(`Location: ${project.location}`, 20, 60);
      doc.text(`Ecosystem: ${project.ecosystemType}`, 20, 70);
      doc.text(`Area: ${project.area} hectares`, 20, 80);
      
      doc.setFontSize(16);
      doc.text("Vegetation Analysis (NDVI)", 20, 100);
      doc.setFontSize(12);
      doc.text(`Current NDVI: ${latestNdvi?.ndviMean?.toFixed(4) || 'N/A'}`, 20, 110);
      doc.text(`Baseline NDVI: ${score?.baselineNdvi?.toFixed(4) || 'N/A'}`, 20, 120);
      
      if (score) {
        doc.text(`Variance (Delta %): ${score.ndviDeltaPct?.toFixed(2)}%`, 20, 130);
        doc.setFontSize(16);
        doc.text("Carbon Trust Score", 20, 150);
        doc.setFontSize(14);
        doc.text(`Score: ${score.trustScore} / 100`, 20, 160);
        doc.text(`Confidence Level: ${score.confidence}`, 20, 170);
      }

      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toISOString()}`, 20, 280);

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=mrv_report_${projectId}.pdf`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/mrv/webhook", async (req, res) => {
    try {
      const { projectId, score } = req.body;
      console.log("[MRV Webhook] received for project", projectId);

      // Guard: do not overwrite a user-cancelled job
      const existing = await storage.getProject(projectId);
      if (existing?.mrvStatus?.toUpperCase() === 'CANCELLED') {
        console.log(`[MRV Webhook] Ignoring — project ${projectId} was cancelled.`);
        return res.json({ success: true, ignored: true });
      }

      await storage.updateProjectMrvStatus(projectId, 'COMPLETED');

      if (score) {
        await storage.createMrvScore({
          projectId,
          trustScore: score.trust_score || score.trustScore || 85,
          confidence: score.confidence || 'HIGH',
          baselineNdvi: score.baseline_ndvi || score.baselineNdvi || 0.4,
          currentNdvi: score.current_ndvi || score.currentNdvi || 0.6,
          ndviDeltaPct: score.ndvi_delta_pct || score.ndviDeltaPct || 15.0,
          canopyPct: score.canopy_pct || score.canopyPct || 60.0,
          ecosystemFactor: score.ecosystem_factor || score.ecosystemFactor || 0.8,
          areaHa: score.area_ha || score.areaHa || 10,
        });
      }

      const updated = await storage.getProject(projectId);
      console.log(`[MRV Webhook] Project ${projectId} updated — mrvStatus: ${updated?.mrvStatus}`);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── Health / Liveness endpoints ─────────────────────────────────────────
  // GET /api/health — fast liveness probe (no DB, suitable for load balancer)
  app.get("/api/health", (_req, res) => {
    res.json(getLivenessResult());
  });

  // GET /api/health/full — readiness probe (checks DB, GEE, queue)
  app.get("/api/health/full", async (_req, res) => {
    try {
      const result = await getFullHealthResult();
      const httpStatus = result.status === "unhealthy" ? 503 : 200;
      res.status(httpStatus).json(result);
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // ─── Admin Operational Panel APIs ─────────────────────────────────────────
  // GET /api/ops/status — full operational status snapshot (admin only)
  app.get("/api/ops/status", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const status = await getOpsStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ops/audit-events — query audit event buffer (admin only)
  app.get("/api/ops/audit-events", requireAuth, requireRole("admin"), (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100")), 500);
    const category = req.query.category as any;
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
    const since = req.query.since ? new Date(String(req.query.since)) : undefined;
    const events = getRecentEvents(limit, { category, projectId, since });
    res.json({ events, stats: getEventStats() });
  });

  // POST /api/ops/cache/invalidate — manually invalidate project cache (admin only)
  app.post("/api/ops/cache/invalidate", requireAuth, requireRole("admin"), (req, res) => {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    cachedIntelligence.invalidate(projectId);
    appendAuditEvent({
      category: "SYSTEM",
      severity: "INFO",
      action: "cache.invalidated",
      detail: `Cache manually invalidated for project ${projectId}`,
      projectId,
    });
    return res.json({ success: true, projectId });
  });

  // ─── Performance Summary ──────────────────────────────────────────────────
  // GET /api/ops/performance — per-route latency histogram (admin)
  app.get("/api/ops/performance", requireAuth, requireRole("admin"), (_req, res) => {
    return res.json({ summary: getPerformanceSummary(), ts: new Date().toISOString() });
  });

  // ─── Asset Cleanup ─────────────────────────────────────────────────────
  // POST /api/ops/cleanup — trigger asset retention cleanup (admin)
  // ?dryRun=false to actually delete (default: dry-run)
  app.post("/api/ops/cleanup", requireAuth, requireRole("admin"), async (req, res) => {
    const dryRun = req.query.dryRun !== "false";
    const results = await runAssetCleanup({ dryRun });
    appendAuditEvent({
      category: "SYSTEM",
      severity: "INFO",
      action: dryRun ? "retention.dryRun.api" : "retention.cleanup.api",
      detail: `Cleanup triggered via API. dryRun=${dryRun}`,
    });
    return res.json({ results, dryRun });
  });

  // ─── SSE Real-time Streaming ───────────────────────────────────────
  // GET /api/sse/mrv-progress?projectId=<id> — project MRV progress stream (verifier/admin)
  app.get("/api/sse/mrv-progress", requireAuth, requireRole("verifier", "admin"), (req, res) => {
    const projectId = req.query.projectId ? String(req.query.projectId) : null;
    if (!projectId) {
      return res.status(400).json({ error: "projectId query parameter required" });
    }
    registerProjectSubscriber(projectId, res);
    appendAuditEvent({
      category: "SYSTEM",
      severity: "INFO",
      action: "sse.subscribed",
      detail: `Verifier SSE subscription started for project ${projectId}`,
      projectId,
    });
  });

  // GET /api/sse/audit — admin audit event stream
  app.get("/api/sse/audit", requireAuth, requireRole("admin"), (req, res) => {
    registerAdminSubscriber(res);
    // Forward future audit events to this SSE stream
    const forwarder = (event: any) => pushAuditEvent(event);
    auditEventEmitter.on("event", forwarder);
    res.on("close", () => {
      auditEventEmitter.off("event", forwarder);
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
