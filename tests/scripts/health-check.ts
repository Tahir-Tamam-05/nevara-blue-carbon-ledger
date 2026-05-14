#!/usr/bin/env node
/**
 * tests/scripts/health-check.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Deployment health verification script.
 * Polls the health endpoints until the server is ready or times out.
 * Safe to use as a CI/CD post-deploy readiness gate.
 *
 * Usage:
 *   tsx tests/scripts/health-check.ts [--url http://host:port] [--timeout 60]
 *
 * Exit codes:
 *   0 = healthy
 *   1 = unhealthy or timed out
 * ─────────────────────────────────────────────────────────────────────────────
 */

const args = process.argv.slice(2);
const BASE_URL = args.includes("--url")
  ? args[args.indexOf("--url") + 1]
  : process.env.SERVER_URL ?? "http://localhost:5000";
const TIMEOUT_S = args.includes("--timeout")
  ? parseInt(args[args.indexOf("--timeout") + 1], 10)
  : parseInt(process.env.HEALTH_TIMEOUT ?? "60", 10);
const POLL_INTERVAL_MS = 3_000;

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function checkEndpoint(url: string): Promise<{ ok: boolean; body: unknown; status: number }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    const body = await res.json().catch(() => null);
    return { ok: res.status === 200, body, status: res.status };
  } catch (err: any) {
    return { ok: false, body: err.message, status: 0 };
  }
}

async function main() {
  const start = Date.now();
  const deadline = start + TIMEOUT_S * 1_000;

  log(`Health check starting → ${BASE_URL}`);
  log(`Timeout: ${TIMEOUT_S}s | Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  log("─".repeat(50));

  while (Date.now() < deadline) {
    // Step 1: Liveness
    const liveness = await checkEndpoint(`${BASE_URL}/api/health`);
    if (!liveness.ok) {
      log(`⟳ Liveness not ready (HTTP ${liveness.status})`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    const livenessBody = liveness.body as any;
    log(`✓ Liveness OK — uptime=${livenessBody?.uptime?.toFixed(1)}s, version=${livenessBody?.version}`);

    // Step 2: Readiness
    const readiness = await checkEndpoint(`${BASE_URL}/api/health/full`);
    const readinessBody = readiness.body as any;

    if (readiness.status === 200) {
      log(`✓ Readiness OK — status=${readinessBody?.status}`);
      printChecks(readinessBody?.checks);
      log("\n✓ Server is fully operational.\n");
      process.exit(0);
    } else if (readiness.status === 503) {
      log(`⚠ Readiness DEGRADED — status=${readinessBody?.status}`);
      printChecks(readinessBody?.checks);

      // Check if degradation is non-critical (only GEE is degraded — acceptable for startup)
      const criticalFailed = (readinessBody?.checks ?? []).some(
        (c: any) => c.status !== "ok" && c.name !== "gee_service"
      );
      if (!criticalFailed) {
        log("ℹ Only GEE is degraded — acceptable (optional dependency). Marking healthy.");
        process.exit(0);
      }
      log("⟳ Critical dependencies not ready, retrying...");
    } else {
      log(`⟳ Readiness check failed (HTTP ${readiness.status}), retrying...`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  log(`\n✗ Health check timed out after ${TIMEOUT_S}s. Server is not healthy.\n`);
  process.exit(1);
}

function printChecks(checks: any[]) {
  if (!Array.isArray(checks)) return;
  for (const check of checks) {
    const icon = check.status === "ok" ? "  ✓" : "  ✗";
    const latency = check.latencyMs ? ` (${check.latencyMs}ms)` : "";
    const detail = check.detail ? ` — ${check.detail}` : "";
    console.log(`${icon} ${check.name}${latency}${detail}`);
  }
}

main().catch((err) => {
  console.error("Health check script error:", err);
  process.exit(1);
});
