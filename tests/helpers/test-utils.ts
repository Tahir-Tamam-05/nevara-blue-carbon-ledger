/**
 * tests/helpers/test-utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared test utilities: in-memory mocks, factory helpers, assertion helpers.
 * Zero external test-runner dependency — compatible with Node's built-in
 * test runner (`node:test`) which ships with Node 18+.
 *
 * Usage in test files:
 *   import { makeProject, makeNdviMeasurement, assertApprox } from './helpers/test-utils';
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { randomUUID } from "crypto";

// ─── Factory helpers ──────────────────────────────────────────────────────────

export function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    name: "Test Mangrove Project",
    location: "Bangladesh",
    ecosystemType: "mangrove",
    area: 42.5,
    status: "active",
    mrvStatus: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    landBoundary: JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [90.3, 21.5],
          [90.35, 21.5],
          [90.35, 21.55],
          [90.3, 21.55],
          [90.3, 21.5],
        ],
      ],
    }),
    userId: randomUUID(),
    ...overrides,
  };
}

export function makeNdviMeasurement(projectId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    projectId,
    ndviMean: 0.42,
    ndviMin: 0.18,
    ndviMax: 0.78,
    evaMean: 0.31,
    ndwiMean: 0.05,
    ndmiMean: 0.12,
    saviMean: 0.35,
    cloudCoverPct: 8.5,
    imageCount: 14,
    analysisDate: new Date(),
    rawGeeResponse: null,
    ...overrides,
  };
}

export function makeMrvScore(projectId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    projectId,
    trustScore: 78,
    confidence: "HIGH",
    baselineNdvi: 0.22,
    currentNdvi: 0.42,
    ndviDeltaPct: 90.9,
    canopyPct: 65.0,
    ecosystemFactor: 1.2,
    areaHa: 42.5,
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeMonitoringCycle(projectId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    projectId,
    cycleType: "monitoring",
    status: "PENDING",
    triggeredBy: "scheduler",
    startedAt: null,
    completedAt: null,
    failureReason: null,
    retryCount: 0,
    ...overrides,
  };
}

export function makePolygonGeoJSON(lat = 21.5, lng = 90.3, sizeKm = 0.05) {
  const d = sizeKm / 111; // rough degree offset
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng, lat],
        [lng + d, lat],
        [lng + d, lat + d],
        [lng, lat + d],
        [lng, lat],
      ],
    ],
  };
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

export function assertApprox(value: number, expected: number, tolerance = 0.001, label = "") {
  const diff = Math.abs(value - expected);
  if (diff > tolerance) {
    throw new Error(
      `${label ? `[${label}] ` : ""}Expected ${expected} ±${tolerance}, got ${value} (diff=${diff.toFixed(6)})`
    );
  }
}

export function assertDefined<T>(value: T | null | undefined, label = ""): T {
  if (value == null) {
    throw new Error(`${label ? `[${label}] ` : ""}Expected value to be defined, got ${value}`);
  }
  return value;
}

export function assertInRange(value: number, min: number, max: number, label = "") {
  if (value < min || value > max) {
    throw new Error(
      `${label ? `[${label}] ` : ""}Expected ${value} to be in [${min}, ${max}]`
    );
  }
}

export function assertHasKeys(obj: unknown, keys: string[], label = "") {
  for (const key of keys) {
    if (typeof obj !== "object" || obj === null || !(key in obj)) {
      throw new Error(`${label ? `[${label}] ` : ""}Missing key: ${key}`);
    }
  }
}

// ─── Mock HTTP client ─────────────────────────────────────────────────────────

export type MockResponse = { status: number; data: unknown };

export class MockAxios {
  private routes = new Map<string, () => MockResponse>();

  mock(url: string, factory: () => MockResponse) {
    this.routes.set(url, factory);
    return this;
  }

  async get(url: string) {
    const handler = this.routes.get(url);
    if (!handler) throw new Error(`MockAxios: no mock for GET ${url}`);
    const { status, data } = handler();
    if (status >= 400) throw Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
    return { status, data };
  }

  async post(url: string, _body?: unknown) {
    return this.get(url);
  }
}

// ─── Minimal in-memory DB stub ────────────────────────────────────────────────

export class InMemoryStore {
  private tables: Record<string, Record<string, unknown>[]> = {};

  insert(table: string, row: Record<string, unknown>) {
    if (!this.tables[table]) this.tables[table] = [];
    this.tables[table].push(row);
    return row;
  }

  findBy(table: string, key: string, value: unknown) {
    return (this.tables[table] ?? []).filter((r) => r[key] === value);
  }

  all(table: string) {
    return this.tables[table] ?? [];
  }

  clear() {
    this.tables = {};
  }
}

// ─── Test timer utilities ─────────────────────────────────────────────────────

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}
