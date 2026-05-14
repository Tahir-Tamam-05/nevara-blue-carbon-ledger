/**
 * tests/unit/mrv-workflow.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for MRV workflow core logic:
 *   - Monitoring state machine transitions
 *   - Progress tracker
 *   - Lifecycle event bus
 *   - Analysis queue (memory mode)
 *   - Observation delta calculations
 *
 * Run with:  node --experimental-vm-modules --test tests/unit/mrv-workflow.test.ts
 * Or via:   npm run test:unit
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  makeProject,
  makeNdviMeasurement,
  makeMrvScore,
  makeMonitoringCycle,
  assertApprox,
  assertInRange,
  assertHasKeys,
  InMemoryStore,
  wait,
} from "../helpers/test-utils.js";

// ─── State machine tests ─────────────────────────────────────────────────────

describe("MonitoringStateMachine", () => {
  it("allows valid baseline transitions", async () => {
    // Import is dynamic to avoid loading the full server bootstrap
    const { MonitoringStateMachine } = await import(
      "../../server/mrv/monitoring-state-machine.js"
    );

    assert.ok(MonitoringStateMachine.canTransition("DRAFT", "START_GIS_ANALYSIS"));
    assert.ok(MonitoringStateMachine.canTransition("GIS_ANALYSIS", "COMPLETE_GIS_ANALYSIS"));
    assert.ok(MonitoringStateMachine.canTransition("GIS_COMPLETE", "START_GEE_ANALYSIS"));
  });

  it("rejects invalid transitions", async () => {
    const { MonitoringStateMachine } = await import(
      "../../server/mrv/monitoring-state-machine.js"
    );
    assert.equal(MonitoringStateMachine.canTransition("DRAFT", "COMPLETE_GEE_ANALYSIS"), false);
    assert.equal(MonitoringStateMachine.canTransition("COMPLETED", "START_GIS_ANALYSIS"), false);
  });

  it("getNextState returns correct next state", async () => {
    const { MonitoringStateMachine } = await import(
      "../../server/mrv/monitoring-state-machine.js"
    );
    const next = MonitoringStateMachine.getNextState("DRAFT", "START_GIS_ANALYSIS");
    assert.equal(next, "GIS_ANALYSIS");
  });
});

// ─── Progress tracker tests ──────────────────────────────────────────────────

describe("MonitoringProgressTracker", () => {
  it("stores and retrieves progress", async () => {
    const { monitoringProgressTracker } = await import(
      "../../server/mrv/progress-tracker.js"
    );
    const projectId = "test-project-pt-1";
    monitoringProgressTracker.set(projectId, 45, "Computing NDVI", "RUNNING");
    const snap = monitoringProgressTracker.get(projectId);
    assert.ok(snap !== null);
    assert.equal(snap?.progress, 45);
    assert.equal(snap?.label, "Computing NDVI");
    assert.equal(snap?.status, "RUNNING");
    monitoringProgressTracker.clear(projectId);
  });

  it("returns null for unknown project", async () => {
    const { monitoringProgressTracker } = await import(
      "../../server/mrv/progress-tracker.js"
    );
    const snap = monitoringProgressTracker.get("does-not-exist");
    assert.equal(snap, null);
  });

  it("clears correctly", async () => {
    const { monitoringProgressTracker } = await import(
      "../../server/mrv/progress-tracker.js"
    );
    const id = "test-project-clear";
    monitoringProgressTracker.set(id, 80, "Finalizing", "RUNNING");
    monitoringProgressTracker.clear(id);
    assert.equal(monitoringProgressTracker.get(id), null);
  });
});

// ─── Lifecycle event bus tests ────────────────────────────────────────────────

describe("MRVEventBus", () => {
  it("emits and receives events", async () => {
    const { mrvEventBus } = await import("../../server/mrv/lifecycle-events.js");
    const received: unknown[] = [];
    mrvEventBus.on("job.enqueued", (payload: unknown) => received.push(payload));

    mrvEventBus.publish({
      type: "job.enqueued",
      payload: {
        projectId: "bus-test-1",
        jobId: "j1",
        cycleId: "c1",
        cycleType: "baseline",
        geoJsonPolygon: {},
        triggeredBy: "test",
        retryCount: 0,
      } as any,
    });

    await wait(10);
    assert.equal(received.length, 1);
    assert.equal((received[0] as any).projectId, "bus-test-1");
  });

  it("emits 'all' wildcard", async () => {
    const { mrvEventBus } = await import("../../server/mrv/lifecycle-events.js");
    const allEvents: unknown[] = [];
    mrvEventBus.on("all", (event: unknown) => allEvents.push(event));

    mrvEventBus.publish({
      type: "job.completed",
      payload: {
        projectId: "wildcard-test",
        result: {} as any,
      },
    });

    await wait(10);
    const matching = allEvents.filter(
      (e: any) => e.type === "job.completed" && e.payload.projectId === "wildcard-test"
    );
    assert.ok(matching.length >= 1);
  });
});

// ─── NDVI delta calculation tests ────────────────────────────────────────────

describe("NDVI Delta Calculations", () => {
  it("computes delta percentage correctly", () => {
    const baseline = 0.22;
    const current = 0.42;
    const deltaPct = ((current - baseline) / baseline) * 100;
    assertApprox(deltaPct, 90.909, 0.01, "NDVI delta pct");
  });

  it("handles zero baseline gracefully", () => {
    const baseline = 0;
    const current = 0.1;
    const deltaPct = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;
    assert.equal(deltaPct, 0);
  });

  it("generates expected observation structure", () => {
    const measurement = makeNdviMeasurement("proj-1");
    assertHasKeys(measurement, [
      "id", "projectId", "ndviMean", "ndviMin", "ndviMax", "evaMean",
      "ndwiMean", "ndmiMean", "saviMean", "cloudCoverPct",
    ], "NdviMeasurement");
    assertInRange(measurement.ndviMean, -1, 1, "ndviMean range");
    assertInRange(measurement.cloudCoverPct, 0, 100, "cloudCoverPct range");
  });
});

// ─── MRV score validation tests ───────────────────────────────────────────────

describe("MRV Score Validation", () => {
  it("trust score is in valid range", () => {
    const score = makeMrvScore("proj-1");
    assertInRange(score.trustScore, 0, 100, "trustScore");
  });

  it("confidence is one of expected values", () => {
    const score = makeMrvScore("proj-1");
    const valid = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"];
    assert.ok(valid.includes(score.confidence), `confidence=${score.confidence} not in ${valid}`);
  });

  it("ndvi delta is positive for improving project", () => {
    const score = makeMrvScore("proj-1", {
      baselineNdvi: 0.2,
      currentNdvi: 0.45,
      ndviDeltaPct: 125,
    });
    assert.ok(score.ndviDeltaPct > 0, "ndviDeltaPct should be positive");
  });
});

// ─── Monitoring cycle factory tests ──────────────────────────────────────────

describe("Monitoring Cycle Factory", () => {
  it("creates cycle with correct defaults", () => {
    const cycle = makeMonitoringCycle("proj-1");
    assert.equal(cycle.status, "PENDING");
    assert.equal(cycle.retryCount, 0);
    assert.equal(cycle.cycleType, "monitoring");
  });

  it("overrides work correctly", () => {
    const cycle = makeMonitoringCycle("proj-1", { status: "COMPLETED", retryCount: 2 });
    assert.equal(cycle.status, "COMPLETED");
    assert.equal(cycle.retryCount, 2);
  });
});

// ─── Analysis queue (memory mode) tests ──────────────────────────────────────

describe("AnalysisQueueService (memory mode)", () => {
  it("enqueues jobs without Redis", async () => {
    const { AnalysisQueueService } = await import("../../server/mrv/analysis-queue.js");
    const queue = new AnalysisQueueService();
    // Force memory mode by not setting REDIS_URL
    const originalRedis = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    await queue.initialize();

    const processed: string[] = [];
    await queue.registerProcessor(async (payload) => {
      processed.push(payload.projectId);
    });

    const result = await queue.enqueue({
      projectId: "queue-test-1",
      cycleId: "c1",
      cycleType: "baseline",
      geoJsonPolygon: {},
      triggeredBy: "test",
    });

    assert.equal(result.mode, "memory");
    await wait(100);
    assert.ok(processed.includes("queue-test-1"), "Job was processed");

    if (originalRedis) process.env.REDIS_URL = originalRedis;
  });

  it("getStats returns correct mode and pending count", async () => {
    const { AnalysisQueueService } = await import("../../server/mrv/analysis-queue.js");
    const queue = new AnalysisQueueService();
    delete process.env.REDIS_URL;
    await queue.initialize();
    const stats = queue.getStats();
    assert.equal(stats.mode, "memory");
    assert.ok(typeof stats.pending === "number");
    assert.ok(typeof stats.active === "number");
  });
});
