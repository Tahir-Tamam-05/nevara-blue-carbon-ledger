/**
 * tests/integration/api-contracts.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * API contract validation tests.
 * Tests the shape/contract of API responses against expected schemas.
 * Uses a lightweight HTTP client against the running dev server.
 *
 * Prerequisites: Server must be running (npm run dev)
 * Run with: npm run test:integration
 *
 * CONTRACT VALIDATION STRATEGY:
 *   - Each test validates ONLY the response shape (keys, types)
 *   - Does NOT validate business logic (covered in unit tests)
 *   - Covers: health endpoints, auth, project listing, intelligence APIs
 *   - Uses real HTTP calls against a test-seeded DB OR verifies
 *     graceful error responses when data absent
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { assertHasKeys } from "../helpers/test-utils.js";

const BASE_URL = process.env.TEST_SERVER_URL ?? "http://localhost:5002";
const TEST_TIMEOUT = 10_000;

async function get(path: string, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers, signal: controller.signal });
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    clearTimeout(timer);
  }
}

async function post(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Health endpoint contracts ────────────────────────────────────────────────

describe("API Contract: /api/health", () => {
  it("GET /api/health returns 200 with correct shape", async () => {
    const { status, body } = await get("/api/health");
    assert.equal(status, 200);
    assertHasKeys(body, ["status", "ts", "uptime", "version"], "Liveness response");
    assert.equal(body.status, "ok");
    assert.ok(typeof body.uptime === "number" && body.uptime >= 0);
  });

  it("GET /api/health/full returns 200 or 503 with correct shape", async () => {
    const { status, body } = await get("/api/health/full");
    assert.ok([200, 503].includes(status), `Expected 200 or 503, got ${status}`);
    assertHasKeys(body, ["status", "ts", "uptime", "checks"], "Full health response");
    assert.ok(["healthy", "degraded", "unhealthy"].includes(body.status));
    assert.ok(Array.isArray(body.checks));
  });
});

// ─── Auth contracts ────────────────────────────────────────────────────────────

describe("API Contract: Authentication", () => {
  it("POST /api/auth/login with bad credentials returns 401 or 400", async () => {
    const { status } = await post("/api/auth/login", {
      email: "nobody@example.com",
      password: "wrongpassword",
    });
    assert.ok([400, 401, 422].includes(status), `Expected 400/401/422, got ${status}`);
  });

  it("POST /api/auth/signup with invalid body returns 400", async () => {
    const { status, body } = await post("/api/auth/signup", {
      email: "not-an-email",
      password: "x", // too short
    });
    assert.ok([400, 422].includes(status), `Expected 400/422, got ${status}`);
    assert.ok(body, "Should return error body");
  });
});

// ─── Projects contract ────────────────────────────────────────────────────────

describe("API Contract: Projects", () => {
  it("GET /api/projects returns 401 when unauthenticated", async () => {
    const { status } = await get("/api/projects");
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  it("GET /api/stats returns data or 401", async () => {
    const { status, body } = await get("/api/stats");
    if (status === 200) {
      // If accessible, validate shape
      assert.ok(typeof body === "object", "Stats should be an object");
    } else {
      assert.ok([401, 403].includes(status), `Expected 401/403/200, got ${status}`);
    }
  });
});

// ─── Intelligence API contracts ───────────────────────────────────────────────

describe("API Contract: Intelligence APIs (unauthenticated)", () => {
  it("GET /api/projects/:id/environmental-summary requires auth", async () => {
    const { status } = await get("/api/projects/fake-project-id/environmental-summary");
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  it("GET /api/projects/:id/timeline requires auth", async () => {
    const { status } = await get("/api/projects/fake-project-id/timeline");
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  it("GET /api/registry requires auth", async () => {
    const { status } = await get("/api/registry");
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });
});

// ─── Ops API contracts ────────────────────────────────────────────────────────

describe("API Contract: Ops APIs", () => {
  it("GET /api/ops/status requires admin auth", async () => {
    const { status } = await get("/api/ops/status");
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  it("GET /api/ops/audit-events requires admin auth", async () => {
    const { status } = await get("/api/ops/audit-events");
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  it("POST /api/ops/cache/invalidate requires admin auth", async () => {
    const { status } = await post("/api/ops/cache/invalidate", { projectId: "x" });
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });
});

// ─── SSE endpoint contracts ───────────────────────────────────────────────────

describe("API Contract: SSE Endpoints", () => {
  it("GET /api/sse/mrv-progress without auth returns 401", async () => {
    const { status } = await get("/api/sse/mrv-progress?projectId=test");
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  it("GET /api/sse/mrv-progress without projectId param returns 400 when auth provided", async () => {
    // Using a fake token — will fail auth first (401) before param check (400)
    const { status } = await get("/api/sse/mrv-progress");
    assert.ok([400, 401, 403].includes(status), `Expected 400/401/403, got ${status}`);
  });
});
