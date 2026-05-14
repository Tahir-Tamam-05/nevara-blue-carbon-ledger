import { parsePolygonFromLandBoundary } from "../gis/polygon-ingestion";
import { geeIntegrationService } from "./gee-integration-service";
import { mrvEventBus } from "./lifecycle-events";
import { MonitoringStateMachine } from "./monitoring-state-machine";
import { monitoringProgressTracker } from "./progress-tracker";
import { analysisQueueService } from "./analysis-queue";
import { monitoringCycleRepository } from "./monitoring-cycle-repository";
import { observationProcessingService } from "./observation-processing-service";
import type { AnalysisJobPayload, MonitoringState, MonitoringTransition, MonitoringCycleType } from "./types";
import { storage } from "../storage";

const DEFAULT_RETRY_LIMIT = 3;
const LOG_PREFIX = "[MRV:Orchestrator]";

class MonitoringStateStore {
  private states = new Map<string, MonitoringState>();

  get(projectId: string): MonitoringState {
    return this.states.get(projectId) ?? "DRAFT";
  }

  transition(projectId: string, transition: MonitoringTransition): MonitoringState {
    const current = this.get(projectId);
    if (!MonitoringStateMachine.canTransition(current, transition)) {
      throw new Error(`Invalid monitoring transition ${transition} from ${current}`);
    }
    const next = MonitoringStateMachine.getNextState(current, transition);
    this.states.set(projectId, next);
    return next;
  }

  force(projectId: string, state: MonitoringState) {
    this.states.set(projectId, state);
  }
}

export class MonitoringOrchestratorService {
  private stateStore = new MonitoringStateStore();
  private started = false;

  async startWorkers(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await analysisQueueService.initialize();
    await analysisQueueService.registerProcessor((payload) => this.processAnalysisJob(payload));
  }

  async triggerBaselineAnalysis(params: {
    projectId: string;
    landBoundary: string;
    triggeredBy: string;
  }): Promise<{ jobId: string; queueMode: "bull" | "memory" }> {
    const parsed = parsePolygonFromLandBoundary(params.landBoundary);
    this.stateStore.force(params.projectId, "POLYGON_SUBMITTED");
    this.stateStore.transition(params.projectId, "START_GIS_ANALYSIS");

    const cycleId = await monitoringCycleRepository.createCycle({
      projectId: params.projectId,
      cycleType: "baseline",
      triggeredBy: params.triggeredBy,
      status: "pending",
      fixedCycleNumber: 0,
    });

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 45);

    const queued = await analysisQueueService.enqueue({
      projectId: params.projectId,
      cycleType: "baseline",
      cycleId,
      polygon: parsed.polygon,
      triggeredBy: params.triggeredBy,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    });

    monitoringProgressTracker.set(params.projectId, 10, "queued", "RUNNING");
    await storage.updateProjectMrvStatus(params.projectId, "RUNNING");
    return { jobId: queued.jobId, queueMode: queued.mode };
  }

  async triggerScheduledMonitoring(params: {
    projectId: string;
    landBoundary: string;
    triggeredBy: string;
  }): Promise<{ jobId: string; queueMode: "bull" | "memory" }> {
    const parsed = parsePolygonFromLandBoundary(params.landBoundary);
    const cycleId = await monitoringCycleRepository.createCycle({
      projectId: params.projectId,
      cycleType: "scheduled",
      triggeredBy: params.triggeredBy,
      status: "pending",
    });

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 45);

    const queued = await analysisQueueService.enqueue({
      projectId: params.projectId,
      cycleType: "scheduled",
      cycleId,
      polygon: parsed.polygon,
      triggeredBy: params.triggeredBy,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    });

    monitoringProgressTracker.set(params.projectId, 10, "queued", "RUNNING");
    await storage.updateProjectMrvStatus(params.projectId, "RUNNING");
    return { jobId: queued.jobId, queueMode: queued.mode };
  }

  async getStatus(projectId: string): Promise<{ status: string; progress: number; step: string }> {
    const project = await storage.getProject(projectId);
    const snapshot = monitoringProgressTracker.get(projectId);
    return {
      status: project?.mrvStatus?.toUpperCase() || "IDLE",
      progress: snapshot?.progress ?? (project?.mrvStatus?.toUpperCase() === "COMPLETED" ? 100 : 0),
      step: snapshot?.label ?? (project?.mrvStatus?.toUpperCase() || "Not started"),
    };
  }

  async cancel(projectId: string): Promise<void> {
    monitoringProgressTracker.set(projectId, 0, "cancelled", "CANCELLED");
    await storage.updateProjectMrvStatus(projectId, "CANCELLED");
  }

  async processDueProjects(limit = 50): Promise<{ processed: number }> {
    const dueProjects = await monitoringCycleRepository.getDueProjects(limit);
    let processed = 0;
    for (const project of dueProjects) {
      if (!project.landBoundary) continue;
      await this.triggerScheduledMonitoring({
        projectId: project.id,
        landBoundary: project.landBoundary,
        triggeredBy: "system:scheduler",
      });
      processed += 1;
    }
    return { processed };
  }

  private async processAnalysisJob(payload: AnalysisJobPayload): Promise<void> {
    const retryCount = payload.retryCount ?? 0;
    mrvEventBus.publish({ type: "job.started", payload });
    this.setProgress(payload.projectId, 20, "collecting imagery", "RUNNING");

    if (payload.cycleType === "baseline" && retryCount === 0) {
      try {
        this.stateStore.transition(payload.projectId, "START_GIS_ANALYSIS");
      } catch {
        this.stateStore.force(payload.projectId, "GIS_ANALYSIS_RUNNING");
      }
    }

    if (payload.cycleId) {
      await monitoringCycleRepository.updateCycleStatus(payload.cycleId, "imagery_collection");
    }

    try {
      await geeIntegrationService.notifyExternalLifecycle("analysis.started", {
        projectId: payload.projectId,
        cycleType: payload.cycleType,
      });

      this.setProgress(payload.projectId, 45, "analyzing", "RUNNING");
      if (payload.cycleId) {
        await monitoringCycleRepository.updateCycleStatus(payload.cycleId, "analyzing");
      }

      const geeResult = payload.cycleType === "scheduled"
        ? await geeIntegrationService.runScheduledMonitoringAnalysis(payload)
        : await geeIntegrationService.runBaselineAnalysis(payload);

      this.setProgress(payload.projectId, 80, "persisting observations", "RUNNING");
      if (!payload.cycleId) {
        throw new Error("Missing cycleId for observation persistence.");
      }
      await observationProcessingService.persistResult(payload.projectId, payload.cycleId, geeResult);

      await monitoringCycleRepository.updateCycleStatus(payload.cycleId, "analysis_complete");
      await storage.updateProjectMrvStatus(payload.projectId, "COMPLETED");

      if (payload.cycleType === "baseline") {
        this.stateStore.transition(payload.projectId, "GIS_ANALYSIS_SUCCESS");
        this.stateStore.transition(payload.projectId, "START_MONITORING");
      }

      const project = await storage.getProject(payload.projectId);
      await monitoringCycleRepository.scheduleNextMonitoring(payload.projectId, project?.monitoringFrequency ?? "monthly");

      this.setProgress(payload.projectId, 100, "complete", "COMPLETED");
      mrvEventBus.publish({ type: "job.completed", payload: { projectId: payload.projectId, result: geeResult } });
      await geeIntegrationService.notifyExternalLifecycle("analysis.completed", {
        projectId: payload.projectId,
        observationCount: geeResult.observations.length,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "analysis failed";
      const nextRetryCount = retryCount + 1;
      mrvEventBus.publish({
        type: "job.failed",
        payload: {
          projectId: payload.projectId,
          error: message,
          retryCount: nextRetryCount,
        },
      });

      if (payload.cycleId) {
        await monitoringCycleRepository.updateCycleStatus(payload.cycleId, "failed", message);
      }

      if (nextRetryCount < DEFAULT_RETRY_LIMIT) {
        this.setProgress(payload.projectId, 15, `retry ${nextRetryCount}/${DEFAULT_RETRY_LIMIT - 1}`, "RUNNING");
        await analysisQueueService.enqueue({
          projectId: payload.projectId,
          cycleType: payload.cycleType,
          cycleId: payload.cycleId,
          polygon: payload.polygon,
          triggeredBy: payload.triggeredBy,
          startDate: payload.startDate,
          endDate: payload.endDate,
          retryCount: nextRetryCount,
        });
      } else {
        if (payload.cycleType === "baseline") {
          try {
            this.stateStore.transition(payload.projectId, "GIS_ANALYSIS_FAIL");
          } catch {
            this.stateStore.force(payload.projectId, "GIS_ANALYSIS_FAILED");
          }
        }
        this.setProgress(payload.projectId, 0, "failed", "FAILED");
        await storage.updateProjectMrvStatus(payload.projectId, "FAILED");
      }

      await geeIntegrationService.notifyExternalLifecycle("analysis.failed", {
        projectId: payload.projectId,
        error: message,
        retryCount: nextRetryCount,
      });
      console.warn(`${LOG_PREFIX} analysis failed`, { projectId: payload.projectId, retryCount: nextRetryCount, error: message });
    }
  }

  private setProgress(projectId: string, progress: number, label: string, status: string) {
    monitoringProgressTracker.set(projectId, progress, label, status);
    mrvEventBus.publish({
      type: "job.progress",
      payload: {
        projectId,
        progress,
        label,
        status: status === "FAILED" ? "failed" : status === "COMPLETED" ? "analysis_complete" : "analyzing",
      },
    });
  }
}

export const monitoringOrchestratorService = new MonitoringOrchestratorService();
