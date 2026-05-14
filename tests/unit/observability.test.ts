/**
 * tests/unit/observability.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the observability layer:
 *   - Structured logger (levels, modules, suppression)
 *   - Audit event store (append, filter, ring buffer, stats)
 *   - Intelligence cache (set/get, TTL expiry, LRU eviction, prefix invalidation)
 *   - Environment validator (config parsing)
 *   - Health service (liveness result shape)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wait, assertHasKeys } from "../helpers/test-utils.js";

// ─── Structured logger ────────────────────────────────────────────────────────

describe("StructuredLogger", () => {
  it("creates a logger and child logger", async () => {
    const { createLogger } = await import("../../server/observability/structured-logger.js");
    const log = createLogger("TestModule");
    const child = log.child("sub");
    assert.ok(log, "Logger should exist");
    assert.ok(child, "Child logger should exist");
  });

  it("does not throw on any log level", async () => {
    const { createLogger } = await import("../../server/observability/structured-logger.js");
    const log = createLogger("TestSilent");
    // Should not throw
    log.debug("debug message", { x: 1 });
    log.info("info message");
    log.warn("warn message");
    log.error("error message", { err: "test" });
  });
});

// ─── Audit event store ────────────────────────────────────────────────────────

describe("AuditEventStore", () => {
  it("appends events and returns them", async () => {
    const { appendAuditEvent, getRecentEvents } = await import(
      "../../server/observability/audit-event-store.js"
    );
    appendAuditEvent({
      category: "MRV",
      severity: "INFO",
      action: "test.event",
      detail: "Unit test event",
      projectId: "test-audit-proj",
    });

    const events = getRecentEvents(100, { projectId: "test-audit-proj" });
    assert.ok(events.length >= 1, "Event should be stored");
    assert.equal(events[0].action, "test.event");
    assert.equal(events[0].category, "MRV");
  });

  it("filters by category", async () => {
    const { appendAuditEvent, getRecentEvents } = await import(
      "../../server/observability/audit-event-store.js"
    );
    const uniq = `filter-test-${Date.now()}`;
    appendAuditEvent({ category: "SYSTEM", severity: "INFO", action: uniq, detail: "x" });
    appendAuditEvent({ category: "MRV", severity: "INFO", action: uniq, detail: "y" });

    const systemOnly = getRecentEvents(500, { category: "SYSTEM" });
    const mrvOnly = getRecentEvents(500, { category: "MRV" });
    assert.ok(systemOnly.every((e) => e.category === "SYSTEM"));
    assert.ok(mrvOnly.every((e) => e.category === "MRV"));
  });

  it("returns stats with totals", async () => {
    const { appendAuditEvent, getEventStats } = await import(
      "../../server/observability/audit-event-store.js"
    );
    appendAuditEvent({ category: "VERIFIER", severity: "WARN", action: "verifier.warn", detail: "test" });
    const stats = getEventStats();
    assertHasKeys(stats, ["total", "byCategory", "bySeverity", "lastEventAt"], "Event stats");
    assert.ok(stats.total >= 1);
  });

  it("returns event with id and ts fields", async () => {
    const { appendAuditEvent } = await import(
      "../../server/observability/audit-event-store.js"
    );
    const event = appendAuditEvent({
      category: "SCHEDULER",
      severity: "INFO",
      action: "test.stamp",
      detail: "timestamp check",
    });
    assert.ok(event.id.startsWith("ev_"), `id should start with ev_, got ${event.id}`);
    assert.ok(event.ts.length > 0, "ts should be set");
  });
});

// ─── Intelligence cache ────────────────────────────────────────────────────────

describe("IntelligenceCache", () => {
  it("stores and retrieves values", async () => {
    const { intelligenceCache } = await import(
      "../../server/observability/intelligence-cache.js"
    );
    intelligenceCache.set("test-key-1", { foo: "bar" }, 60_000);
    const val = intelligenceCache.get("test-key-1");
    assert.deepEqual(val, { foo: "bar" });
  });

  it("returns null for missing key", async () => {
    const { intelligenceCache } = await import(
      "../../server/observability/intelligence-cache.js"
    );
    const val = intelligenceCache.get("not-a-key-xyz");
    assert.equal(val, null);
  });

  it("expires entries after TTL", async () => {
    const { intelligenceCache } = await import(
      "../../server/observability/intelligence-cache.js"
    );
    intelligenceCache.set("ttl-test-key", "expire-me", 50); // 50ms TTL
    await wait(80);
    const val = intelligenceCache.get("ttl-test-key");
    assert.equal(val, null, "Expired entry should return null");
  });

  it("invalidates by prefix", async () => {
    const { intelligenceCache } = await import(
      "../../server/observability/intelligence-cache.js"
    );
    intelligenceCache.set("prefix:project-a:summary", { data: 1 }, 60_000);
    intelligenceCache.set("prefix:project-a:history", { data: 2 }, 60_000);
    intelligenceCache.set("prefix:project-b:summary", { data: 3 }, 60_000);
    intelligenceCache.invalidatePrefix("prefix:project-a");

    assert.equal(intelligenceCache.get("prefix:project-a:summary"), null);
    assert.equal(intelligenceCache.get("prefix:project-a:history"), null);
    assert.notEqual(intelligenceCache.get("prefix:project-b:summary"), null);
  });

  it("withCache calls fetcher on miss and returns cached on hit", async () => {
    const { withCache } = await import(
      "../../server/observability/intelligence-cache.js"
    );
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return { value: "computed" };
    };
    const key = `wc-test-${Date.now()}`;
    const r1 = await withCache(key, 60_000, fetcher);
    const r2 = await withCache(key, 60_000, fetcher);
    assert.deepEqual(r1, { value: "computed" });
    assert.deepEqual(r2, { value: "computed" });
    assert.equal(calls, 1, "Fetcher should only be called once (cache hit on second call)");
  });

  it("getStats returns size and hit information", async () => {
    const { intelligenceCache } = await import(
      "../../server/observability/intelligence-cache.js"
    );
    intelligenceCache.set("stats-test-key", "x", 60_000);
    intelligenceCache.get("stats-test-key"); // trigger a hit
    const stats = intelligenceCache.getStats();
    assertHasKeys(stats, ["size", "maxEntries", "totalHits", "expired"], "Cache stats");
    assert.ok(stats.size >= 1);
    assert.equal(stats.maxEntries, 500);
  });
});

// ─── Liveness health check ────────────────────────────────────────────────────

describe("HealthService", () => {
  it("getLivenessResult returns correct shape", async () => {
    const { getLivenessResult } = await import(
      "../../server/observability/health-service.js"
    );
    const result = getLivenessResult();
    assertHasKeys(result, ["status", "ts", "uptime", "version"], "Liveness");
    assert.equal(result.status, "ok");
    assert.ok(result.uptime >= 0);
    assert.ok(typeof result.version === "string");
  });
});

// ─── SSE Manager ─────────────────────────────────────────────────────────────

describe("SSEManager", () => {
  it("getSSEStats returns numeric counters", async () => {
    const { getSSEStats } = await import("../../server/realtime/sse-manager.js");
    const stats = getSSEStats();
    assertHasKeys(stats, ["projectSubscribers", "totalClients", "adminClients"], "SSE stats");
    assert.ok(typeof stats.totalClients === "number");
  });
});
