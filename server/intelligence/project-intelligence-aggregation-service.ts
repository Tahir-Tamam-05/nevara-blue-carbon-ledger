import { sql } from "drizzle-orm";
import { historicalObservationQueryService } from "./historical-observation-query";
import { historicalAnalysisService } from "./historical-analysis-service";
import { storage } from "../storage";
import {
  computeEcosystemHealthIndex,
  buildAllMultiCycleComparisons,
  computeEnvironmentalQualityScore,
} from "../mrv/change-detection-engine";
import { anomalyDetectionFoundationService } from "./anomaly-detection-foundation-service";
import { environmentalThresholdRuleEngine } from "./environmental-threshold-rule-engine";
import { ecologicalCalibrationService } from "./ecological-calibration-service";
import { fieldValidationFoundationService } from "./field-validation-foundation-service";

function linearTrend(values: Array<{ x: number; y: number }>) {
  if (values.length < 2) return { slope: 0, direction: "stable" as const };
  const n = values.length;
  const sx = values.reduce((a, b) => a + b.x, 0);
  const sy = values.reduce((a, b) => a + b.y, 0);
  const sxy = values.reduce((a, b) => a + b.x * b.y, 0);
  const sx2 = values.reduce((a, b) => a + b.x * b.x, 0);
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx || 1);
  const direction = slope > 0.001 ? "improving" : slope < -0.001 ? "declining" : "stable";
  return { slope, direction };
}

export class ProjectIntelligenceAggregationService {
  private async db() {
    const { db } = await import("../db");
    return db;
  }

  async getTimeline(projectId: string) {
    const project = await storage.getProject(projectId);
    const baseEvents: Array<{ type: string; date: string; title: string; description: string }> = [];
    if (project) {
      baseEvents.push({
        type: "PROJECT_CREATED",
        date: project.submittedAt?.toISOString?.() ?? new Date().toISOString(),
        title: "Project submitted",
        description: project.name,
      });
      if (project.baselineCompletedAt) {
        baseEvents.push({
          type: "BASELINE",
          date: project.baselineCompletedAt.toISOString(),
          title: "Baseline completed",
          description: "Baseline monitoring initialization completed",
        });
      }
    }

    if (!(process.env.USE_DATABASE === "true" && process.env.DATABASE_URL)) {
      return baseEvents.sort((a, b) => a.date.localeCompare(b.date));
    }

    const db = await this.db();
    const timelineResult = await db.execute(sql`
      SELECT
        occurred_at AS "date",
        event_type AS "type",
        title,
        description,
        payload
      FROM eco_monitoring.project_timeline_events
      WHERE project_id = ${projectId}
      ORDER BY occurred_at ASC
      LIMIT 500
    `);
    const dbRows = (timelineResult.rows ?? []) as Array<{ type: string; date: string; title: string; description: string }>;
    return [...baseEvents, ...dbRows].sort((a, b) => a.date.localeCompare(b.date));
  }

  async getHistoricalObservations(projectId: string, indicator?: string) {
    return historicalObservationQueryService.listByProject(projectId, indicator);
  }

  async getMonitoringTimeline(projectId: string) {
    if (!(process.env.USE_DATABASE === "true" && process.env.DATABASE_URL)) return [];
    const db = await this.db();
    const result = await db.execute(sql`
      SELECT
        id,
        cycle_number AS "cycleNumber",
        cycle_type AS "cycleType",
        status,
        started_at AS "startedAt",
        completed_at AS "completedAt",
        cloud_cover_pct AS "cloudCoverPct"
      FROM eco_monitoring.monitoring_cycles
      WHERE project_id = ${projectId}
      ORDER BY cycle_number ASC
    `);
    return result.rows ?? [];
  }

  async getBaselineVsCurrent(projectId: string, indicator = "ndvi") {
    const rows = await historicalObservationQueryService.listByProject(projectId, indicator);
    if (rows.length === 0) return null;
    const baseline = rows[0];
    const current = rows[rows.length - 1];
    const baselineValue = baseline.valueMean ?? 0;
    const currentValue = current.valueMean ?? 0;
    const delta = currentValue - baselineValue;
    const deltaPct = baselineValue !== 0 ? (delta / baselineValue) * 100 : 0;
    return { baseline, current, delta, deltaPct };
  }

  async getEnvironmentalChangeFoundation(projectId: string) {
    const ndvi = await this.getBaselineVsCurrent(projectId, "ndvi");
    if (!ndvi) return { classification: "insufficient_data", details: null };
    let classification = "stable";
    if (ndvi.deltaPct >= 15) classification = "significant_improvement";
    else if (ndvi.deltaPct >= 5) classification = "moderate_improvement";
    else if (ndvi.deltaPct <= -15) classification = "significant_decline";
    else if (ndvi.deltaPct <= -5) classification = "moderate_decline";
    return { classification, details: ndvi };
  }

  async getTrendPreparation(projectId: string, indicator = "ndvi") {
    const rows = await historicalObservationQueryService.listByProject(projectId, indicator, 180);
    const points = rows
      .filter((row) => typeof row.valueMean === "number")
      .map((row, idx) => ({ x: idx + 1, y: row.valueMean as number }));
    const trend = linearTrend(points);
    return {
      indicator,
      points: rows.map((r) => ({ date: r.observedAt, value: r.valueMean })),
      trend,
    };
  }

  /**
   * Full environmental summary including EHI, quality score, and multi-indicator trends.
   */
  async getEnvironmentalSummary(projectId: string) {
    const project = await storage.getProject(projectId);
    const comparison = await this.getBaselineVsCurrent(projectId, "ndvi");
    const trend = await this.getTrendPreparation(projectId, "ndvi");
    const monitoringTimeline = await this.getMonitoringTimeline(projectId);

    // Load historical snapshots for EHI
    const historicalSnapshots = await historicalAnalysisService.getHistoricalSnapshots(projectId, 36);
    const ehi = computeEcosystemHealthIndex(historicalSnapshots);
    const multiCycleTrends = buildAllMultiCycleComparisons(historicalSnapshots);
    const [anomalyMarkers, restorationRisk, automatedInsights, trajectory, seasonalPatterns] = await Promise.all([
      anomalyDetectionFoundationService.detectTrendAnomalyMarkers(projectId),
      anomalyDetectionFoundationService.computeRestorationRiskScore(projectId),
      anomalyDetectionFoundationService.generateAutomatedInsights(projectId),
      anomalyDetectionFoundationService.classifyLongTermTrajectory(projectId),
      anomalyDetectionFoundationService.compareSeasonalPatterns(projectId),
    ]);

    // Quality score from latest NDVI
    const latestNdvi = (comparison as { current?: { valueMean?: number } } | null)?.current?.valueMean ?? null;
    const qualityScore = computeEnvironmentalQualityScore({
      ndviMean: latestNdvi,
      ndmiMean: null,
      ndwiMean: null,
      greenCoverPct: null,
      spatialCoveragePct: 70,
      confidence: 0.65,
    });
    const confidenceRefined = Math.max(
      0.1,
      Math.min(
        0.98,
        (ehi.confidence * 0.5) +
          ((qualityScore.score / 100) * 0.3) +
          ((1 - Math.min(0.6, anomalyMarkers.length / 10)) * 0.2)
      )
    );

    return {
      projectId,
      registryId: project?.registryId ?? null,
      location: project?.location ?? null,
      ecosystemType: project?.ecosystemType ?? null,
      baselineVsCurrent: comparison,
      trend,
      monitoringTimelineCount: Array.isArray(monitoringTimeline) ? monitoringTimeline.length : 0,
      status: project?.mrvStatus ?? "NONE",
      ecosystemHealthIndex: ehi.ecosystemHealthIndex,
      ecosystemTrajectory: ehi.overallTrajectory,
      qualityScore,
      multiCycleTrends,
      trendAnomalyMarkers: anomalyMarkers,
      restorationRisk,
      automatedInsights,
      longTermTrajectory: trajectory,
      seasonalPatterns,
      confidenceRefined: Number(confidenceRefined.toFixed(3)),
    };
  }

  async getSatelliteArtifacts(projectId: string) {
    const rows = await historicalObservationQueryService.listArtifactsByProject(projectId, 180);
    return rows.map((row) => ({
      observationType: row.observationType,
      observedAt: row.observedAt,
      rasterAssetPath: row.rasterAssetPath,
      thumbnailPath: row.thumbnailPath,
      tileLayerPath: row.tileLayerPath,
      sourceDataset: row.sourceDataset,
    }));
  }

  async getTrendAnomalyMarkers(projectId: string) {
    return anomalyDetectionFoundationService.detectTrendAnomalyMarkers(projectId);
  }

  async getRestorationRiskScore(projectId: string) {
    return anomalyDetectionFoundationService.computeRestorationRiskScore(projectId);
  }

  async getMonitoringAlerts(projectId: string, persistToTimeline = false) {
    return anomalyDetectionFoundationService.generateMonitoringAlerts(projectId, persistToTimeline);
  }

  async getAutomatedInsights(projectId: string) {
    return anomalyDetectionFoundationService.generateAutomatedInsights(projectId);
  }

  async getLongTermTrajectory(projectId: string) {
    return anomalyDetectionFoundationService.classifyLongTermTrajectory(projectId);
  }

  async getSeasonalPatternComparison(projectId: string) {
    return anomalyDetectionFoundationService.compareSeasonalPatterns(projectId);
  }

  async getNotificationEventFoundations(projectId: string) {
    return anomalyDetectionFoundationService.getNotificationEventFoundations(projectId);
  }

  async getMonitoringRecommendations(projectId: string) {
    return anomalyDetectionFoundationService.getIntelligentMonitoringRecommendations(projectId);
  }

  async getThresholdRuleEngineConfig() {
    return {
      thresholds: environmentalThresholdRuleEngine.getConfig(),
      seasonalWindows: environmentalThresholdRuleEngine.getSeasonWindows(),
    };
  }

  async getCalibrationPresets() {
    return ecologicalCalibrationService.listPresetProfiles();
  }

  async getEffectiveCalibration(projectId: string) {
    return ecologicalCalibrationService.getEffectiveCalibration(projectId);
  }

  async upsertCalibrationProfile(params: {
    scopeType: "project" | "organization";
    scopeId: string;
    ecosystemKey: string;
    profileKey: "lakes" | "wetlands" | "mangroves" | "barren_restoration" | "custom";
    thresholdOverrides?: Record<string, unknown>;
    anomalyWeights?: Record<string, unknown>;
    seasonalTuning?: Record<string, unknown>;
    confidenceTuning?: Record<string, unknown>;
    createdBy?: string;
  }) {
    return ecologicalCalibrationService.upsertCalibrationProfile({
      ...params,
      thresholdOverrides: params.thresholdOverrides as any,
      anomalyWeights: params.anomalyWeights as any,
      seasonalTuning: params.seasonalTuning as any,
      confidenceTuning: params.confidenceTuning as any,
    });
  }

  async addFieldEvidence(params: {
    projectId: string;
    monitoringCycleId?: string | null;
    uploadedBy?: string | null;
    evidenceType: string;
    observationDate: string;
    latitude?: number;
    longitude?: number;
    measuredMetrics?: Record<string, unknown>;
    notes?: string;
    attachmentPath?: string;
    metadata?: Record<string, unknown>;
  }) {
    return fieldValidationFoundationService.addFieldEvidence(params);
  }

  async addEcologicalReviewNote(params: {
    projectId: string;
    monitoringCycleId?: string | null;
    verifierId?: string | null;
    noteType: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
    note: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) {
    return fieldValidationFoundationService.addReviewNote(params);
  }

  async addVerifierOverrideLog(params: {
    projectId: string;
    monitoringCycleId?: string | null;
    verifierId?: string | null;
    overrideType: string;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    return fieldValidationFoundationService.addOverrideLog(params);
  }

  async getFieldVsSatelliteComparison(projectId: string, indicator = "ndvi") {
    return fieldValidationFoundationService.getFieldVsSatelliteComparison(projectId, indicator);
  }

  /**
   * Full temporal analysis bundle for report generation.
   */
  async getFullTemporalAnalysis(projectId: string) {
    return historicalAnalysisService.getFullTemporalAnalysis(projectId);
  }

  async getAuditReadyRegistryRecord(projectId: string) {
    const project = await storage.getProject(projectId);
    const timeline = await this.getTimeline(projectId);
    const summary = await this.getEnvironmentalSummary(projectId);
    const artifacts = await this.getSatelliteArtifacts(projectId);
    return {
      registryId: project?.registryId ?? `UNASSIGNED-${projectId}`,
      project,
      summary,
      timeline,
      artifacts,
      generatedAt: new Date().toISOString(),
    };
  }

  async listAuditReadyRegistry(limit = 100) {
    const projects = await storage.getAllProjects();
    return projects
      .filter((p) => !p.deletedAt)
      .slice(0, limit)
      .map((p) => ({
        projectId: p.id,
        registryId: p.registryId ?? null,
        name: p.name,
        status: p.status,
        monitoringDue: p.nextMonitoringDue,
        baselineCompletedAt: p.baselineCompletedAt,
      }));
  }
}

export const projectIntelligenceAggregationService = new ProjectIntelligenceAggregationService();
