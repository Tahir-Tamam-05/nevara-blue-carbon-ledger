
# NEVARA — Execution Document 03: PostGIS & GIS Engine

> **Source:** `docs/master_architecture.md` — Sections 3.5 & 4  
> **Cross-references:** See `02-database.md` for schema context, `04-gee-pipeline.md` for GEE auto-detection

---

# 3.5 PostGIS Migration (Raw SQL)

> **Depends on:** `02-database.md` — `projects` table must exist before running these migrations.

```sql
-- Migration: add PostGIS columns and spatial indexes
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE projects  
  ADD COLUMN polygon geometry(Polygon, 4326),
  ADD COLUMN centroid geometry(Point, 4326),
  ADD COLUMN bbox geometry(Polygon, 4326);

CREATE INDEX idx_projects_polygon_gist ON projects USING GIST(polygon);
CREATE INDEX idx_projects_centroid_gist ON projects USING GIST(centroid);

-- Auto-compute centroid and bbox on polygon insert/update
CREATE OR REPLACE FUNCTION compute_project_spatial_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.polygon IS NOT NULL THEN
    NEW.centroid := ST_Centroid(NEW.polygon);
    NEW.bbox := ST_Envelope(NEW.polygon);
    NEW.area_hectares := ST_Area(NEW.polygon::geography) / 10000.0;
    NEW.perimeter_km := ST_Perimeter(NEW.polygon::geography) / 1000.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_spatial
  BEFORE INSERT OR UPDATE OF polygon ON projects
  FOR EACH ROW EXECUTE FUNCTION compute_project_spatial_fields();

-- Partition environmental_observations by year
CREATE TABLE environmental_observations (
  id UUID DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  monitoring_cycle_id UUID NOT NULL,
  observation_type VARCHAR(50) NOT NULL,
  observed_at TIMESTAMP NOT NULL,
  -- ... all other columns ...
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, observed_at)
) PARTITION BY RANGE (observed_at);

CREATE TABLE env_obs_2024 PARTITION OF environmental_observations
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE env_obs_2025 PARTITION OF environmental_observations
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE env_obs_2026 PARTITION OF environmental_observations
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

---

# 4. GIS ENGINE

## 4.1 Architecture

The GIS Engine is split into two tiers:

1. **Client-Side GIS (Leaflet + Turf.js)** — Real-time polygon drawing, preview area calculation, visual feedback
2. **Server-Side GIS (PostGIS + Python GEE)** — Authoritative spatial computation, satellite analysis, spatial queries

```
┌─────────────────────────────────────────────┐
│              CLIENT-SIDE GIS LAYER           │
│                                              │
│  Leaflet.draw → polygon GeoJSON              │
│  Turf.js → preview area, centroid, bbox      │
│  Visual feedback → area overlay, bounds      │
│                                              │
│  OUTPUT: GeoJSON Feature sent to API         │
└─────────────────────┬───────────────────────┘
                      │ POST /api/v1/projects
                      ▼
┌─────────────────────────────────────────────┐
│           SERVER-SIDE GIS PIPELINE           │
│                                              │
│  Step 1: VALIDATION                          │
│    • Valid GeoJSON geometry?                  │
│    • Valid polygon (closed ring, no self-     │
│      intersections)?                         │
│    • Area within bounds (1 ha – 50,000 ha)?  │
│    • Not in excluded regions?                 │
│    • Topology cleanup (ST_MakeValid)          │
│                                              │
│  Step 2: SPATIAL COMPUTATION (PostGIS)       │
│    • ST_Area(geog) → area in m²              │
│    • ST_Centroid → centroid point             │
│    • ST_Envelope → bounding box              │
│    • ST_Perimeter(geog) → perimeter          │
│    • ST_Transform for projections            │
│                                              │
│  Step 3: REVERSE GEOCODING                   │
│    • Nominatim API (self-hosted or rate-limited) │
│    • centroid → country, admin region, place name│
│    • timezone lookup (tz_lookup or API)       │
│                                              │
│  Step 4: AUTO-DETECTION TRIGGER              │
│    • Queue GEE analysis job                  │
│    • {polygon, project_id} → Bull queue      │
│                                              │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│        GEE AUTO-DETECTION (Python Worker)    │
│                                              │
│  Input: polygon GeoJSON                      │
│                                              │
│  4a. LAND COVER CLASSIFICATION               │
│    • ESA WorldCover 10m → land cover %       │
│    • Dynamic World → probabilistic classes   │
│    • Derive dominant ecosystem type          │
│                                              │
│  4b. TERRAIN ANALYSIS                        │
│    • SRTM DEM 30m → elevation stats         │
│    • Slope computation → mean, max           │
│    • Aspect → dominant direction             │
│                                              │
│  4c. WATER PROXIMITY                         │
│    • JRC Global Surface Water → water mask   │
│    • Distance to nearest water pixel         │
│    • Water body identification               │
│    • OR: OpenStreetMap Overpass API for named │
│          water features                      │
│                                              │
│  4d. VEGETATION BASELINE                     │
│    • Sentinel-2 latest clear composite       │
│    • NDVI, NDWI computation                  │
│    • Baseline values stored                  │
│                                              │
│  4e. MOISTURE / CLIMATE INDICATORS           │
│    • CHIRPS rainfall data → annual avg       │
│    • ERA5 surface temp → mean temp           │
│    • Sentinel-1 SAR → soil moisture proxy    │
│                                              │
│  OUTPUT: project_site_profile record         │
│          + initial observations              │
└─────────────────────────────────────────────┘
```

## 4.2 Polygon Validation Rules

```typescript
// services/gis/polygon-validator.ts

interface PolygonValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  cleaned?: GeoJSON.Polygon; // ST_MakeValid result
}

const VALIDATION_RULES = {
  MIN_AREA_HA: 0.5,
  MAX_AREA_HA: 50000,
  MIN_VERTICES: 4, // 3 + closing point
  MAX_VERTICES: 10000,
  MAX_SELF_INTERSECTIONS: 0,
  COORDINATE_BOUNDS: {
    lat: [-60, 75],  // Exclude polar regions
    lng: [-180, 180],
  },
  EXCLUDED_REGIONS: [] // Optional: military zones, restricted areas
};

async function validatePolygon(geojson: GeoJSON.Polygon): Promise<PolygonValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Schema validation
  if (geojson.type !== 'Polygon') errors.push('Geometry must be Polygon type');
  
  // 2. Ring closure
  const ring = geojson.coordinates[0];
  if (!coordinatesEqual(ring[0], ring[ring.length - 1])) {
    errors.push('Polygon ring must be closed');
  }
  
  // 3. Vertex count
  if (ring.length < VALIDATION_RULES.MIN_VERTICES) {
    errors.push(`Minimum ${VALIDATION_RULES.MIN_VERTICES - 1} vertices required`);
  }
  
  // 4. Self-intersection check (PostGIS)
  const isSimple = await db.execute(
    sql`SELECT ST_IsSimple(ST_GeomFromGeoJSON(${JSON.stringify(geojson)}))`
  );
  if (!isSimple) {
    // Attempt auto-fix
    const cleaned = await db.execute(
      sql`SELECT ST_AsGeoJSON(ST_MakeValid(ST_GeomFromGeoJSON(${JSON.stringify(geojson)})))`
    );
    warnings.push('Polygon had self-intersections; auto-corrected');
  }
  
  // 5. Area bounds
  const areaHa = await db.execute(
    sql`SELECT ST_Area(ST_GeomFromGeoJSON(${JSON.stringify(geojson)})::geography) / 10000.0`
  );
  if (areaHa < VALIDATION_RULES.MIN_AREA_HA) errors.push('Area too small');
  if (areaHa > VALIDATION_RULES.MAX_AREA_HA) errors.push('Area too large');
  
  // 6. Coordinate bounds
  const bbox = turf.bbox(geojson);
  if (bbox[1] < VALIDATION_RULES.COORDINATE_BOUNDS.lat[0]) {
    errors.push('Polygon extends beyond supported latitude range');
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

## 4.3 Spatial Query Library

```typescript
// services/gis/spatial-queries.ts

class SpatialQueryService {
  
  // Find projects within distance of a point
  async findProjectsNear(lat: number, lng: number, radiusKm: number) {
    return db.execute(sql`
      SELECT id, name, registry_id,
             ST_Distance(centroid::geography, ST_Point(${lng}, ${lat})::geography) / 1000 as distance_km
      FROM projects
      WHERE ST_DWithin(centroid::geography, ST_Point(${lng}, ${lat})::geography, ${radiusKm * 1000})
      ORDER BY distance_km
    `);
  }
  
  // Check polygon overlap with existing projects
  async checkOverlap(polygon: GeoJSON.Polygon) {
    return db.execute(sql`
      SELECT id, name, registry_id,
             ST_Area(ST_Intersection(polygon, ST_GeomFromGeoJSON(${JSON.stringify(polygon)}))::geography) / 10000 as overlap_ha
      FROM projects
      WHERE ST_Intersects(polygon, ST_GeomFromGeoJSON(${JSON.stringify(polygon)}))
        AND archived_at IS NULL
    `);
  }
  
  // Water body proximity analysis
  async nearestWaterFeature(centroid: { lat: number; lng: number }) {
    // Uses Overpass API for OpenStreetMap water features
    const query = `
      [out:json][timeout:25];
      (
        way["natural"="water"](around:5000, ${centroid.lat}, ${centroid.lng});
        relation["natural"="water"](around:5000, ${centroid.lat}, ${centroid.lng});
        way["waterway"](around:5000, ${centroid.lat}, ${centroid.lng});
      );
      out center;
    `;
    // Parse and return nearest feature with name, type, distance
  }
}
```
