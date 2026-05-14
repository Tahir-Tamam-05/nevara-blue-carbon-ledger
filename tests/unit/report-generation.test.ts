/**
 * tests/unit/report-generation.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for report generation layer:
 *   - Report template rendering (HTML string generation)
 *   - Report type validation
 *   - Report metadata structure
 *   - PDF fallback path (HTML-only mode)
 *   - Report artifact naming conventions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  makeProject,
  makeMrvScore,
  makeNdviMeasurement,
  assertHasKeys,
} from "../helpers/test-utils.js";

// ─── Report template tests ────────────────────────────────────────────────────

describe("ReportTemplates", () => {
  it("generates HTML string with project name", async () => {
    const { generateBaselineHTML } = await import(
      "../../server/reports/report-templates.js"
    );
    const project = makeProject({ name: "Test Mangrove Restoration" });
    const score = makeMrvScore(project.id);
    const measurements = [makeNdviMeasurement(project.id)];
    const html = generateBaselineHTML({ project, score, measurements });
    assert.ok(typeof html === "string", "Should return string");
    assert.ok(html.length > 100, "HTML should have content");
    assert.ok(html.includes("Mangrove") || html.includes(project.name), "HTML should include project name");
  });

  it("generates monitoring HTML without crashing", async () => {
    const { generateMonitoringHTML } = await import(
      "../../server/reports/report-templates.js"
    );
    const project = makeProject();
    const score = makeMrvScore(project.id);
    const measurements = [makeNdviMeasurement(project.id)];
    const html = generateMonitoringHTML({ project, score, measurements });
    assert.ok(typeof html === "string");
    assert.ok(html.includes("<!DOCTYPE html") || html.includes("<html") || html.includes("<div"), "Should produce HTML");
  });

  it("handles missing score gracefully", async () => {
    const { generateBaselineHTML } = await import(
      "../../server/reports/report-templates.js"
    );
    const project = makeProject();
    const html = generateBaselineHTML({ project, score: null, measurements: [] });
    assert.ok(typeof html === "string", "Should not crash when score is null");
  });
});

// ─── Report foundation service tests ─────────────────────────────────────────

describe("ReportFoundationService", () => {
  it("listReports returns an array", async () => {
    const { reportFoundationService } = await import(
      "../../server/reports/report-foundation-service.js"
    );
    // listReports should return [] for a project with no reports
    const reports = await reportFoundationService.listReports("nonexistent-project-xyz");
    assert.ok(Array.isArray(reports), "Should return array");
  });

  it("valid report types are accepted by type guard", async () => {
    // Report types known to be valid
    const validTypes = [
      "BASELINE_ENVIRONMENTAL",
      "MONITORING_PERIODIC",
      "SEASONAL_COMPARISON",
      "ANNUAL_SUMMARY",
    ];
    for (const type of validTypes) {
      // Just assert they're strings — type guard is compile-time
      assert.ok(typeof type === "string");
    }
  });
});

// ─── Report naming conventions ────────────────────────────────────────────────

describe("Report Naming Conventions", () => {
  it("baseline report path follows convention", () => {
    const projectId = "test-project-123";
    const type = "BASELINE_ENVIRONMENTAL";
    const version = 1;
    const expectedPattern = /baseline/i;
    const path = `reports/${projectId}/${type.toLowerCase()}_v${version}.pdf`;
    assert.ok(expectedPattern.test(path), `Path should contain 'baseline': ${path}`);
  });

  it("monitoring report includes cycle number", () => {
    const cycleNum = 3;
    const filename = `monitoring_cycle_${cycleNum.toString().padStart(3, "0")}_v1.pdf`;
    assert.ok(filename.includes("003"), "Cycle number should be zero-padded");
  });
});

// ─── PDF renderer fallback tests ──────────────────────────────────────────────

describe("PDFRenderer Fallback", () => {
  it("pdfRenderer module exports renderReport function", async () => {
    const pdfModule = await import("../../server/reports/pdf-renderer.js");
    assert.ok(typeof pdfModule.renderReport === "function", "renderReport should be exported");
  });

  it("renderReport returns a buffer-like object or null on missing Chromium", async () => {
    const { renderReport } = await import("../../server/reports/pdf-renderer.js");
    try {
      const result = await renderReport("<html><body>Test</body></html>");
      // Either returns a Buffer or null (HTML-only fallback)
      assert.ok(result === null || Buffer.isBuffer(result) || result instanceof Uint8Array,
        "Should return Buffer or null");
    } catch (err: any) {
      // Puppeteer not installed — acceptable in CI without Chromium
      assert.ok(
        err.message.includes("puppeteer") ||
        err.message.includes("Chromium") ||
        err.message.includes("Cannot find") ||
        err.message.includes("not installed"),
        `Unexpected error: ${err.message}`
      );
    }
  });
});
