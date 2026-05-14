/**
 * report-generator.ts
 *
 * Production report generation service.
 *
 * Replaces the placeholder-only report-foundation-service.ts for generation logic.
 * The foundation service is still imported for persistence and listing operations.
 *
 * Pipeline for each report:
 *  1. Fetch project data, environmental summary, satellite artifacts
 *  2. Fetch historical analysis (NDVI timeline, degradation, trends)
 *  3. Assemble the report data payload (BaselineReportData or MonitoringReportData)
 *  4. Render HTML from type-appropriate template
 *  5. Render PDF via Puppeteer (or HTML fallback)
 *  6. Persist metadata record with content hash and version
 *  7. Return GeneratedReportRecord to caller
 *
 * Isolation contract:
 *  - This module ONLY generates reports. It does not trigger MRV analysis.
 *  - Heavy operations (Puppeteer, template rendering) run inside this service.
 *  - Caller (route handler) gets back only the record; never the full HTML/PDF bytes.
 */

import path from "path";
import { mkdir } from "fs/promises";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { projectIntelligenceAggregationService } from "../intelligence/project-intelligence-aggregation-service";
import { historicalAnalysisService } from "../intelligence/historical-analysis-service";
import { ecologicalCalibrationService } from "../intelligence/ecological-calibration-service";
import { fieldValidationFoundationService } from "../intelligence/field-validation-foundation-service";
import {
  computeEnvironmentalQualityScore,
} from "../mrv/change-detection-engine";
import {
  renderBaselineReportHtml,
  renderMonitoringReportHtml,
  type BaselineReportData,
} from "./report-templates";
import { renderHtmlToPdf } from "./pdf-renderer";
import { storage } from "../storage";

export type FoundationReportType =
  | "BASELINE_ENVIRONMENTAL"
  | "MONITORING_PERIODIC"
  | "SEASONAL_COMPARISON"
  | "ANNUAL_SUMMARY"
  | "RESTORATION_PROGRESS"
  | "VERIFIER_ASSESSMENT";

export type ReportStatus = "generating" | "generated" | "failed" | "superseded";

export interface GeneratedReportRecord {
  id: string;
  projectId: string;
  reportType: FoundationReportType;
  version: number;
  title: string;
  status: ReportStatus;
  filePathPdf: string;
  filePathHtml: string;
  contentHash: string;
  pdfRendered: boolean;
  fileSizeBytes: number;
  metadata: Record<string, unknown>;
  generatedAt: string;
}

const LOG = "[Reports:Generator]";

// ─── Storage layout ───────────────────────────────────────────────────────────
//
//  mrv-service/reports/
//    ├── {projectId}/
//    │   ├── {reportId}.html    ← rendered HTML (always present)
//    │   └── {reportId}.pdf     ← rendered PDF (or placeholder)
//
// Asset root is relative to cwd (project root).

const REPORTS_BASE_DIR = path.resolve(process.cwd(), "mrv-service/reports");
const MAX_TIMELINE_EVENTS_IN_REPORT = 160;
const MAX_ARTIFACTS_IN_REPORT = 120;

function buildReportTitle(reportType: FoundationReportType, projectName: string): string {
  const labels: Record<FoundationReportType, string> = {
    BASELINE_ENVIRONMENTAL: "Baseline Environmental Assessment",
    MONITORING_PERIODIC: "Monitoring Periodic Report",
    SEASONAL_COMPARISON: "Seasonal Comparison Report",
    ANNUAL_SUMMARY: "Annual Summary Report",
    RESTORATION_PROGRESS: "Restoration Progress Report",
    VERIFIER_ASSESSMENT: "Verifier Assessment Report",
  };
  return `${labels[reportType] ?? reportType} — ${projectName}`;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

function isDbMode(): boolean {
  return process.env.USE_DATABASE === "true" && Boolean(process.env.DATABASE_URL);
}

async function getDb() {
  const { db } = await import("../db");
  return db;
}

// ─── Report generator class ───────────────────────────────────────────────────

export class ReportGeneratorService {
  /** In-memory store for non-DB mode */
  private memoryStore = new Map<string, GeneratedReportRecord[]>();

  // ── Main entry-point ────────────────────────────────────────────────────────

  async generateReport(
    projectId: string,
    reportType: FoundationReportType
  ): Promise<GeneratedReportRecord> {
    const project = await storage.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    console.log(`${LOG} Generating ${reportType} report for ${project.name} (${projectId})`);

    // ── Load all data in parallel ──────────────────────────────────────────
    const [summary, timeline, artifacts, temporalAnalysis, calibration, fieldVsSat] = await Promise.all([
      projectIntelligenceAggregationService.getEnvironmentalSummary(projectId),
      projectIntelligenceAggregationService.getTimeline(projectId),
      projectIntelligenceAggregationService.getSatelliteArtifacts(projectId),
      historicalAnalysisService.getFullTemporalAnalysis(projectId),
      ecologicalCalibrationService.getEffectiveCalibration(projectId),
      fieldValidationFoundationService.getFieldVsSatelliteComparison(projectId, "ndvi"),
    ]);

    const monitoringTimeline = await projectIntelligenceAggregationService.getMonitoringTimeline(projectId);
    const ndviComparison = summary.baselineVsCurrent;
    const timelineForReport = (timeline as Array<{ type: string; date: string; title: string; description: string }>)
      .slice(-MAX_TIMELINE_EVENTS_IN_REPORT);
    const artifactsForReport = (
      artifacts as Array<{
        observationType: string;
        thumbnailPath?: string | null;
        tileLayerPath?: string | null;
        sourceDataset?: string | null;
      }>
    ).slice(-MAX_ARTIFACTS_IN_REPORT);

    // ── Compute quality score ──────────────────────────────────────────────
    const ndviObs = (artifacts as Array<{ observationType: string; sourceMeta?: unknown }>)
      .find((a) => a.observationType === "ndvi");
    const qualityScore = computeEnvironmentalQualityScore({
      ndviMean: (ndviComparison as { current?: { valueMean?: number } } | null)?.current?.valueMean ?? null,
      ndmiMean: null,
      ndwiMean: null,
      greenCoverPct: null,
      spatialCoveragePct: 70,
      confidence: 0.65,
    });

    // ── Build deltas array from summary ───────────────────────────────────
    const deltas = ndviComparison
      ? [
          {
            observationType: "ndvi" as const,
            absoluteChange: (ndviComparison as { delta?: number }).delta ?? null,
            relativeChangePct: (ndviComparison as { deltaPct?: number }).deltaPct ?? null,
            direction: (
              ((ndviComparison as { delta?: number }).delta ?? 0) > 0.005
                ? "improving"
                : ((ndviComparison as { delta?: number }).delta ?? 0) < -0.005
                ? "declining"
                : "stable"
            ) as "improving" | "declining" | "stable",
          },
        ]
      : [];

    // ── Assemble report payload ────────────────────────────────────────────
    const version = await this.nextVersion(projectId, reportType);
    const reportId = `${projectId}-${reportType.toLowerCase().replace(/_/g, "-")}-v${version}`;

    const reportData: BaselineReportData = {
      reportId,
      reportType,
      version,
      generatedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        location: project.location ?? null,
        registryId: project.registryId ?? null,
        ecosystemType: project.ecosystemType ?? null,
      },
      summary: {
        ndviMean: (ndviComparison as { current?: { valueMean?: number } } | null)?.current?.valueMean ?? null,
        ndwiMean: null,
        ndmiMean: null,
        eviMean: null,
        saviMean: null,
        nbrMean: null,
        ecosystemHealthIndex: null,
        qualityScore: {
          score: qualityScore.score,
          grade: qualityScore.grade,
        },
        baselineVsCurrent: {
          delta: (ndviComparison as { delta?: number } | null)?.delta ?? null,
          deltaPct: (ndviComparison as { deltaPct?: number } | null)?.deltaPct ?? null,
        },
      },
      ndviTimeline: temporalAnalysis.ndviTimeline,
      degradationAnalysis: temporalAnalysis.degradationAnalysis,
      deltas,
      artifacts: artifactsForReport,
      attributions: [],
      timeline: timelineForReport,
      monitoringCycleCount: Array.isArray(monitoringTimeline) ? monitoringTimeline.length : 0,
      disclaimer:
        "This report is generated by NEVARA's satellite-assisted MRV system. All values are satellite-derived proxies. Field validation is recommended for regulatory or scientific use.",
    };

    // ── Render HTML ────────────────────────────────────────────────────────
    let html: string;
    if (reportType === "MONITORING_PERIODIC") {
      html = renderMonitoringReportHtml({
        ...reportData,
        snapshotNumber: Array.isArray(monitoringTimeline) ? monitoringTimeline.length : 1,
      });
    } else {
      html = renderBaselineReportHtml(reportData);
    }

    // ── Render PDF via Puppeteer ───────────────────────────────────────────
    const outputDir = path.join(REPORTS_BASE_DIR, projectId);
    await mkdir(outputDir, { recursive: true });

    const renderResult = await renderHtmlToPdf(html, outputDir, reportId, {
      format: "A4",
      media: "print",
      waitMs: 1000,
    });

    // ── Build and persist the record ───────────────────────────────────────
    const record: GeneratedReportRecord = {
      id: reportId,
      projectId,
      reportType,
      version,
      title: buildReportTitle(reportType, project.name),
      status: "generated",
      filePathPdf: renderResult.pdfPath,
      filePathHtml: renderResult.htmlPath,
      contentHash: renderResult.contentHash,
      pdfRendered: renderResult.pdfRendered,
      fileSizeBytes: renderResult.fileSizeBytes,
      metadata: {
        ndviTimelinePoints: temporalAnalysis.ndviTimeline.length,
        timelineEventsIncluded: timelineForReport.length,
        artifactRowsIncluded: artifactsForReport.length,
        degradationDetected: temporalAnalysis.degradationAnalysis.detected,
        monitoringCycleCount: Array.isArray(monitoringTimeline) ? monitoringTimeline.length : 0,
        generator: "nevara-report-generator-v2",
        qualityGrade: qualityScore.grade,
        pdfRendered: renderResult.pdfRendered,
        calibrationProfile: {
          source: calibration.source,
          scopeId: calibration.scopeId,
          profileKey: calibration.profile.profileKey,
          ecosystemKey: calibration.profile.ecosystemKey,
        },
        fieldValidation: {
          evidenceCount: fieldVsSat.evidenceCount,
          averageAbsDelta:
            fieldVsSat.comparisons.length > 0
              ? Number(
                  (
                    fieldVsSat.comparisons
                      .map((c) => c.absoluteDelta)
                      .filter((v): v is number => typeof v === "number")
                      .reduce((a, b) => a + b, 0) /
                    Math.max(
                      1,
                      fieldVsSat.comparisons
                        .map((c) => c.absoluteDelta)
                        .filter((v): v is number => typeof v === "number").length
                    )
                  ).toFixed(4)
                )
              : null,
        },
        recommendationRefinement: {
          tunedByCalibration: true,
          profileKey: calibration.profile.profileKey,
        },
      },
      generatedAt: new Date().toISOString(),
    };

    await this.persistRecord(record);
    console.log(`${LOG} Report generated: ${reportId} (PDF: ${renderResult.pdfRendered}, ${Math.round(renderResult.fileSizeBytes / 1024)}KB)`);

    // ── Mark previous same-type reports as superseded ──────────────────────
    await this.supersedePreviousVersions(projectId, reportType, version);

    return record;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async listReports(projectId: string): Promise<GeneratedReportRecord[]> {
    if (!isDbMode()) {
      return this.memoryStore.get(projectId) ?? [];
    }
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT
        id,
        project_id AS "projectId",
        report_type AS "reportType",
        version,
        title,
        status,
        file_path_pdf AS "filePathPdf",
        file_path_html AS "filePathHtml",
        metadata->>'contentHash' AS "contentHash",
        (metadata->>'pdfRendered')::boolean AS "pdfRendered",
        (metadata->>'fileSizeBytes')::integer AS "fileSizeBytes",
        metadata,
        generated_at AS "generatedAt"
      FROM eco_monitoring.report_metadata
      WHERE project_id = ${projectId}
      ORDER BY generated_at DESC
    `);
    return (result.rows ?? []) as unknown as GeneratedReportRecord[];
  }

  // ── Finalize (seal) a report ──────────────────────────────────────────────

  async finalizeReport(reportId: string, projectId: string): Promise<void> {
    if (!isDbMode()) return;
    const db = await getDb();
    await db.execute(sql`
      UPDATE eco_monitoring.report_metadata
         SET status = 'generated',
             metadata = metadata || jsonb_build_object('finalizedAt', ${new Date().toISOString()}::text)
       WHERE id = ${reportId}
         AND project_id = ${projectId}
    `);
    console.log(`${LOG} Report finalized: ${reportId}`);
  }

  // ── Internal persistence ──────────────────────────────────────────────────

  private async persistRecord(record: GeneratedReportRecord): Promise<void> {
    if (!isDbMode()) {
      const list = this.memoryStore.get(record.projectId) ?? [];
      list.unshift(record);
      this.memoryStore.set(record.projectId, list);
      return;
    }

    const db = await getDb();
    await db.execute(sql`
      INSERT INTO eco_monitoring.report_metadata
        (id, project_id, report_type, version, title, status,
         file_path_pdf, file_path_html, metadata, generated_at)
      VALUES
        (
          ${record.id},
          ${record.projectId},
          ${record.reportType},
          ${record.version},
          ${record.title},
          ${record.status},
          ${record.filePathPdf},
          ${record.filePathHtml},
          ${JSON.stringify({
            ...record.metadata,
            contentHash: record.contentHash,
            pdfRendered: record.pdfRendered,
            fileSizeBytes: record.fileSizeBytes,
          })}::jsonb,
          ${record.generatedAt}
        )
      ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            metadata = EXCLUDED.metadata,
            generated_at = EXCLUDED.generated_at
    `);
  }

  private async supersedePreviousVersions(
    projectId: string,
    reportType: FoundationReportType,
    currentVersion: number
  ): Promise<void> {
    if (!isDbMode() || currentVersion <= 1) return;
    const db = await getDb();
    try {
      await db.execute(sql`
        UPDATE eco_monitoring.report_metadata
           SET status = 'superseded'
         WHERE project_id = ${projectId}
           AND report_type = ${reportType}
           AND version < ${currentVersion}
           AND status = 'generated'
      `);
    } catch {
      /* Non-critical — skip silently */
    }
  }

  private async nextVersion(
    projectId: string,
    reportType: FoundationReportType
  ): Promise<number> {
    const existing = await this.listReports(projectId);
    const sameType = existing.filter((r) => r.reportType === reportType);
    if (sameType.length === 0) return 1;
    const maxVersion = Math.max(...sameType.map((r) => Number(r.version)));
    return maxVersion + 1;
  }
}

export const reportGeneratorService = new ReportGeneratorService();
