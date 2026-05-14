/**
 * tests/unit/gis-service.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for GIS service layer:
 *   - Polygon ingestion + validation
 *   - Geometry validation rules
 *   - Spatial metrics computation
 *   - Polygon bounds extraction
 *   - Invalid geometry rejection
 *
 * Run with:  node --experimental-vm-modules --test tests/unit/gis-service.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makePolygonGeoJSON, assertApprox, assertHasKeys } from "../helpers/test-utils.js";

// ─── Polygon ingestion tests ─────────────────────────────────────────────────

describe("parsePolygonFromLandBoundary", () => {
  it("parses valid GeoJSON Polygon string", async () => {
    const { parsePolygonFromLandBoundary } = await import(
      "../../server/gis/polygon-ingestion.js"
    );
    const geoJson = makePolygonGeoJSON();
    const result = parsePolygonFromLandBoundary(JSON.stringify(geoJson));
    assertHasKeys(result, ["type", "coordinates"], "Parsed polygon");
    assert.equal(result.type, "Polygon");
  });

  it("parses Feature-wrapped polygon", async () => {
    const { parsePolygonFromLandBoundary } = await import(
      "../../server/gis/polygon-ingestion.js"
    );
    const feature = {
      type: "Feature",
      geometry: makePolygonGeoJSON(),
      properties: {},
    };
    const result = parsePolygonFromLandBoundary(JSON.stringify(feature));
    assert.equal(result.type, "Polygon");
  });

  it("throws on invalid JSON", async () => {
    const { parsePolygonFromLandBoundary } = await import(
      "../../server/gis/polygon-ingestion.js"
    );
    assert.throws(() => parsePolygonFromLandBoundary("NOT_JSON_AT_ALL"), /parse/i);
  });

  it("throws on empty string", async () => {
    const { parsePolygonFromLandBoundary } = await import(
      "../../server/gis/polygon-ingestion.js"
    );
    assert.throws(() => parsePolygonFromLandBoundary(""));
  });
});

// ─── Geometry validation tests ────────────────────────────────────────────────

describe("validatePolygonGeometry", () => {
  it("accepts valid polygon within area bounds", async () => {
    const { validatePolygonGeometry } = await import(
      "../../server/gis/geometry-validation.js"
    );
    const geoJson = makePolygonGeoJSON(21.5, 90.3, 0.1);
    const result = validatePolygonGeometry(geoJson);
    assert.ok(result.valid, `Expected valid, got: ${JSON.stringify(result)}`);
  });

  it("rejects polygon with fewer than 4 coordinate points", async () => {
    const { validatePolygonGeometry } = await import(
      "../../server/gis/geometry-validation.js"
    );
    const tinyPoly = {
      type: "Polygon",
      coordinates: [
        [
          [90.3, 21.5],
          [90.35, 21.5],
          [90.3, 21.5], // triangle — not enough to be valid ring
        ],
      ],
    };
    const result = validatePolygonGeometry(tinyPoly as any);
    assert.ok(!result.valid, "Expected invalid polygon to fail");
  });

  it("rejects unclosed polygon ring", async () => {
    const { validatePolygonGeometry } = await import(
      "../../server/gis/geometry-validation.js"
    );
    const unclosed = {
      type: "Polygon",
      coordinates: [
        [
          [90.3, 21.5],
          [90.35, 21.5],
          [90.35, 21.55],
          [90.3, 21.55],
          // Missing closing coord — first ≠ last
        ],
      ],
    };
    const result = validatePolygonGeometry(unclosed as any);
    assert.ok(!result.valid, "Unclosed ring should fail");
  });
});

// ─── Spatial metrics tests ────────────────────────────────────────────────────

describe("computeSpatialMetrics", () => {
  it("returns area in hectares for known polygon", async () => {
    const { computeSpatialMetrics } = await import(
      "../../server/gis/spatial-service.js"
    );
    // Approximately 1 km x 1 km = ~100 ha
    const geoJson = makePolygonGeoJSON(21.5, 90.3, 0.09); // ~10km²
    const metrics = computeSpatialMetrics(geoJson);
    assertHasKeys(metrics, ["areaHa", "perimeterKm", "centroidLat", "centroidLng"], "Spatial metrics");
    assert.ok(metrics.areaHa > 0, "Area should be positive");
    assert.ok(metrics.centroidLat !== 0, "Centroid lat should be set");
    assert.ok(metrics.centroidLng !== 0, "Centroid lng should be set");
  });

  it("centroid is within bounding box", async () => {
    const { computeSpatialMetrics } = await import(
      "../../server/gis/spatial-service.js"
    );
    const geoJson = makePolygonGeoJSON(21.5, 90.3, 0.1);
    const metrics = computeSpatialMetrics(geoJson);
    // Centroid lat should be between 21.5 and 21.59 roughly
    assert.ok(metrics.centroidLat >= 21.4 && metrics.centroidLat <= 21.7);
    assert.ok(metrics.centroidLng >= 90.2 && metrics.centroidLng <= 90.5);
  });
});

// ─── Overlap detection tests ──────────────────────────────────────────────────

describe("detectOverlapWithProjects", () => {
  it("returns no overlap for empty project list", async () => {
    const { detectOverlapWithProjects } = await import(
      "../../server/gis/spatial-service.js"
    );
    const geoJson = makePolygonGeoJSON();
    const result = detectOverlapWithProjects(geoJson, []);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  it("detects overlap with identical polygon", async () => {
    const { detectOverlapWithProjects } = await import(
      "../../server/gis/spatial-service.js"
    );
    const geoJson = makePolygonGeoJSON(21.5, 90.3, 0.1);
    const existingProjects = [
      {
        id: "existing-proj",
        landBoundary: JSON.stringify(makePolygonGeoJSON(21.5, 90.3, 0.1)),
      },
    ];
    const result = detectOverlapWithProjects(geoJson, existingProjects as any);
    // Should find the overlapping project
    assert.ok(result.length > 0, "Should detect identical polygon overlap");
  });

  it("returns no overlap for non-overlapping polygons", async () => {
    const { detectOverlapWithProjects } = await import(
      "../../server/gis/spatial-service.js"
    );
    const geoJson = makePolygonGeoJSON(21.5, 90.3, 0.05);
    const existingProjects = [
      {
        id: "far-away",
        landBoundary: JSON.stringify(makePolygonGeoJSON(10.0, 50.0, 0.05)), // Far away
      },
    ];
    const result = detectOverlapWithProjects(geoJson, existingProjects as any);
    assert.equal(result.length, 0, "Non-overlapping polygons should have no overlap");
  });
});
