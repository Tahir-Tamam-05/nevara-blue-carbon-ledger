
# NEVARA — Execution Document 02: Database Design

> **Source:** `docs/master_architecture.md` — Section 3  
> **Cross-references:** See `03-postgis.md` for PostGIS setup, `01-foundation.md` for overall architecture

---

# 3. DATABASE DESIGN

## 3.1 Design Philosophy

The database design follows a **temporal-observation** model. Every measurement, classification, and assessment is an immutable **observation** tied to:
- A project
- A timestamp (`observed_at`)
- A source (satellite, verifier, system, contributor)
- A provenance chain (dataset, algorithm, parameters)

Nothing is overwritten. Current state is always the latest observation. Historical state is always queryable.

## 3.2 Entity Relationship Diagram

```
┌─────────────────────┐       ┌──────────────────────────┐
│ organizations       │       │ users                     │
│─────────────────────│       │──────────────────────────│
│ id (PK)             │──┐    │ id (PK)                  │
│ name                │  │    │ email                    │
│ type                │  │    │ role                     │
│ registration_no     │  │    │ organization_id (FK)     │
│ contact_info        │  │    │ ...                      │
│ created_at          │  │    └──────────────────────────┘
└─────────────────────┘  │
                         │
    ┌────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ projects                                                          │
│──────────────────────────────────────────────────────────────────│
│ id (PK, UUID)                                                     │
│ name                                                              │
│ description                                                       │
│ organization_id (FK)                                              │
│ contributor_id (FK → users)                                       │
│ restoration_goal (ENUM: lake, barren_land, wetland, mangrove,     │
│                         coastal, riparian, grassland, forest,      │
│                         peatland, other)                           │
│ status (ENUM - see state machine)                                 │
│ polygon (GEOMETRY(Polygon, 4326)) ← PostGIS                      │
│ centroid (GEOMETRY(Point, 4326))  ← auto-computed                 │
│ area_hectares (NUMERIC)           ← auto-computed                 │
│ perimeter_km (NUMERIC)            ← auto-computed                 │
│ bbox (GEOMETRY(Polygon, 4326))    ← auto-computed                 │
│ country                           ← auto-derived                  │
│ admin_region                      ← auto-derived                  │
│ timezone                          ← auto-derived                  │
│ monitoring_frequency (ENUM: biweekly, monthly, quarterly)         │
│ next_monitoring_due (TIMESTAMP)                                   │
│ baseline_completed_at (TIMESTAMP)                                 │
│ registry_id (VARCHAR, unique)     ← e.g., NEV-2025-LK-00142      │
│ created_at (TIMESTAMP)                                            │
│ updated_at (TIMESTAMP)                                            │
│ archived_at (TIMESTAMP, nullable)                                 │
│                                                                    │
│ INDEXES:                                                           │
│   GIST(polygon), GIST(centroid), btree(status), btree(registry_id)│
│   btree(organization_id), btree(next_monitoring_due)               │
└──────────────────────────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────────────────────────────────────────────────┐
│ project_site_profiles                                             │
│──────────────────────────────────────────────────────────────────│
│ id (PK)                                                           │
│ project_id (FK)                                                   │
│ profile_version (INT)                                             │
│ detected_ecosystem_type (VARCHAR)   ← from WorldCover/DynamicWorld│
│ land_cover_composition (JSONB)      ← {tree:32%, water:15%,...}   │
│ dominant_land_cover (VARCHAR)                                     │
│ elevation_min_m (NUMERIC)                                         │
│ elevation_max_m (NUMERIC)                                         │
│ elevation_mean_m (NUMERIC)                                        │
│ slope_mean_deg (NUMERIC)                                          │
│ slope_max_deg (NUMERIC)                                           │
│ aspect_dominant (VARCHAR)                                         │
│ nearest_water_body_name (VARCHAR)                                 │
│ nearest_water_body_distance_m (NUMERIC)                           │
│ nearest_water_body_type (VARCHAR)  ← lake, river, wetland, coast  │
│ climate_zone (VARCHAR)                                            │
│ annual_rainfall_mm (NUMERIC)                                      │
│ soil_type_estimate (VARCHAR)       ← from SoilGrids if available  │
│ flood_risk_class (VARCHAR)                                        │
│ computed_at (TIMESTAMP)                                           │
│ source_datasets (JSONB)            ← [{name, date, resolution}]   │
│ confidence_score (NUMERIC)                                        │
│                                                                    │
│ UNIQUE(project_id, profile_version)                                │
└──────────────────────────────────────────────────────────────────┘
          │
          │ 1:N (project_id on all below)
          ▼
┌──────────────────────────────────────────────────────────────────┐
│ monitoring_cycles                                                 │
│──────────────────────────────────────────────────────────────────│
│ id (PK, UUID)                                                     │
│ project_id (FK)                                                   │
│ cycle_number (INT)             ← 0 = baseline, 1,2,3... = monitor │
│ cycle_type (ENUM: baseline, scheduled, manual, event_triggered)   │
│ status (ENUM: pending, imagery_collection, analyzing,             │
│              analysis_complete, under_review, verified,            │
│              flagged, failed)                                      │
│ triggered_by (VARCHAR)         ← system/user_id/event_name        │
│ started_at (TIMESTAMP)                                            │
│ imagery_acquired_at (TIMESTAMP)                                   │
│ analysis_completed_at (TIMESTAMP)                                 │
│ review_started_at (TIMESTAMP)                                     │
│ completed_at (TIMESTAMP)                                          │
│ satellite_imagery_refs (JSONB)  ← [{dataset, image_id, date, ...}]│
│ cloud_cover_pct (NUMERIC)                                         │
│ quality_flags (JSONB)                                             │
│ error_log (TEXT, nullable)                                        │
│ created_at (TIMESTAMP)                                            │
│                                                                    │
│ UNIQUE(project_id, cycle_number)                                   │
│ INDEX btree(project_id, status)                                    │
└──────────────────────────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────────────────────────────────────────────────┐
│ environmental_observations                                        │
│──────────────────────────────────────────────────────────────────│
│ id (PK, UUID)                                                     │
│ project_id (FK)                                                   │
│ monitoring_cycle_id (FK)                                          │
│ observation_type (ENUM:                                           │
│   ndvi, evi, savi, ndwi, ndmi, nbr, bsi,                         │
│   land_cover, surface_temp, sar_backscatter,                      │
│   biomass_estimate, flood_extent, moisture_index,                 │
│   canopy_height, erosion_indicator, water_turbidity,              │
│   vegetation_fraction, phenology_metric)                          │
│ observed_at (TIMESTAMP)           ← satellite acquisition date    │
│ value_mean (NUMERIC)                                              │
│ value_min (NUMERIC)                                               │
│ value_max (NUMERIC)                                               │
│ value_stddev (NUMERIC)                                            │
│ value_median (NUMERIC)                                            │
│ value_distribution (JSONB)        ← histogram bins                │
│ value_unit (VARCHAR)              ← 'index', '°C', 'mm', 'dB'    │
│ spatial_coverage_pct (NUMERIC)    ← % of polygon with valid data  │
│ raster_asset_path (VARCHAR)       ← path to GeoTIFF              │
│ thumbnail_path (VARCHAR)          ← path to PNG preview           │
│ tile_layer_path (VARCHAR)         ← path to XYZ tile directory    │
│ source_dataset (VARCHAR)          ← 'COPERNICUS/S2_SR_HARMONIZED' │
│ source_image_id (VARCHAR)                                         │
│ source_date (DATE)                                                │
│ source_resolution_m (INT)                                         │
│ processing_algorithm (VARCHAR)    ← 'cloud_masked_median_composite│
│ processing_parameters (JSONB)     ← {cloud_threshold: 20, ...}    │
│ confidence (NUMERIC)                                              │
│ quality_flag (VARCHAR)            ← good, acceptable, low, failed │
│ created_at (TIMESTAMP)                                            │
│                                                                    │
│ INDEX btree(project_id, observation_type, observed_at)             │
│ INDEX btree(monitoring_cycle_id)                                   │
│ PARTITION BY RANGE(observed_at) — yearly partitions                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ change_detections                                                 │
│──────────────────────────────────────────────────────────────────│
│ id (PK)                                                           │
│ project_id (FK)                                                   │
│ from_cycle_id (FK → monitoring_cycles)                            │
│ to_cycle_id (FK → monitoring_cycles)                              │
│ observation_type (ENUM — same as above)                           │
│ delta_mean (NUMERIC)                                              │
│ delta_pct (NUMERIC)                                               │
│ delta_classification (ENUM:                                       │
│   significant_improvement, moderate_improvement, stable,          │
│   moderate_decline, significant_decline, anomalous)               │
│ change_map_path (VARCHAR)         ← diff raster                   │
│ analysis_method (VARCHAR)                                         │
│ from_date (DATE)                                                  │
│ to_date (DATE)                                                    │
│ created_at (TIMESTAMP)                                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ verifier_reviews                                                  │
│──────────────────────────────────────────────────────────────────│
│ id (PK)                                                           │
│ monitoring_cycle_id (FK)                                          │
│ project_id (FK)                                                   │
│ verifier_id (FK → users)                                          │
│ assigned_at (TIMESTAMP)                                           │
│ started_at (TIMESTAMP)                                            │
│ decision (ENUM: pending, approved, conditionally_approved,        │
│               revision_requested, flagged, rejected)              │
│ decision_at (TIMESTAMP)                                           │
│ confidence_rating (INT, 1-5)                                      │
│ findings (JSONB)                   ← structured findings          │
│ internal_notes (TEXT)                                              │
│ public_summary (TEXT)                                              │
│ risk_flags (JSONB)                 ← [{type, severity, note}]     │
│ recommended_actions (JSONB)                                       │
│ reviewed_observations (JSONB)      ← [obs_id: {comment, flag}]   │
│ next_review_recommendation (VARCHAR) ← 'standard' | 'expedited'  │
│ created_at (TIMESTAMP)                                            │
│ updated_at (TIMESTAMP)                                            │
│                                                                    │
│ INDEX btree(verifier_id, decision)                                 │
│ INDEX btree(project_id)                                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ reports                                                           │
│──────────────────────────────────────────────────────────────────│
│ id (PK, UUID)                                                     │
│ project_id (FK)                                                   │
│ monitoring_cycle_id (FK, nullable) ← null for summary reports     │
│ report_type (ENUM: baseline_assessment, monitoring_report,        │
│   seasonal_comparison, annual_summary, restoration_progress,      │
│   environmental_risk, custom)                                     │
│ version (INT)                                                     │
│ title (VARCHAR)                                                   │
│ status (ENUM: generating, draft, finalized, superseded, error)    │
│ generated_at (TIMESTAMP)                                          │
│ finalized_at (TIMESTAMP)                                          │
│ file_path_pdf (VARCHAR)                                           │
│ file_path_html (VARCHAR)                                          │
│ file_size_bytes (BIGINT)                                          │
│ content_hash (VARCHAR)             ← SHA-256 for integrity        │
│ metadata (JSONB)                   ← sections included, page count│
│ generated_by (VARCHAR)             ← system/user_id               │
│ created_at (TIMESTAMP)                                            │
│                                                                    │
│ UNIQUE(project_id, report_type, version)                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ field_evidence                                                    │
│──────────────────────────────────────────────────────────────────│
│ id (PK)                                                           │
│ project_id (FK)                                                   │
│ monitoring_cycle_id (FK, nullable)                                │
│ uploaded_by (FK → users)                                          │
│ evidence_type (ENUM: photo, document, lab_report, drone_image,    │
│                       video, gps_track, field_form)               │
│ file_path (VARCHAR)                                               │
│ file_name (VARCHAR)                                               │
│ file_size_bytes (BIGINT)                                          │
│ mime_type (VARCHAR)                                                │
│ capture_location (GEOMETRY(Point, 4326), nullable)                │
│ capture_date (DATE, nullable)                                     │
│ description (TEXT)                                                 │
│ tags (TEXT[])                                                     │
│ created_at (TIMESTAMP)                                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ audit_log                                                         │
│──────────────────────────────────────────────────────────────────│
│ id (PK, BIGSERIAL)                                                │
│ project_id (FK, nullable)                                         │
│ actor_id (FK → users, nullable)                                   │
│ actor_type (ENUM: user, system, scheduler, gee_service)           │
│ action (VARCHAR)                   ← e.g., 'monitoring.triggered' │
│ entity_type (VARCHAR)              ← 'project', 'observation'...  │
│ entity_id (UUID)                                                  │
│ details (JSONB)                                                   │
│ ip_address (INET, nullable)                                       │
│ created_at (TIMESTAMP DEFAULT NOW())                              │
│                                                                    │
│ INDEX btree(project_id, created_at)                                │
│ INDEX btree(action)                                                │
│ PARTITION BY RANGE(created_at) — monthly partitions                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ project_timeline_events                                           │
│──────────────────────────────────────────────────────────────────│
│ id (PK)                                                           │
│ project_id (FK)                                                   │
│ event_type (ENUM: created, polygon_submitted, baseline_started,   │
│   baseline_complete, monitoring_triggered, analysis_complete,     │
│   verifier_assigned, review_complete, report_generated,           │
│   field_evidence_uploaded, status_changed, flag_raised,           │
│   flag_resolved, archived)                                        │
│ event_data (JSONB)                                                │
│ created_by (FK → users, nullable)                                 │
│ created_at (TIMESTAMP)                                            │
│                                                                    │
│ INDEX btree(project_id, created_at)                                │
└──────────────────────────────────────────────────────────────────┘
```

## 3.3 Future-Ready Extension Points (Not Implemented Now)

```sql
-- These tables exist in schema design docs but are NOT created yet.
-- They show how carbon scoring and credit minting will attach.

-- carbon_estimates (FK → monitoring_cycles)
-- sequestration_calculations (FK → carbon_estimates)   
-- credit_issuances (FK → projects) — ALREADY EXISTS, untouched
-- marketplace_listings (FK → credit_issuances) — ALREADY EXISTS, untouched
```

## 3.4 Drizzle Schema Example (Key Tables)

```typescript
// schema/projects.ts
import { pgTable, uuid, varchar, text, numeric, timestamp, 
         integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const restorationGoalEnum = pgEnum('restoration_goal', [
  'lake_restoration', 'barren_land_restoration', 'wetland_recovery',
  'mangrove_restoration', 'coastal_restoration', 'riparian_restoration',
  'grassland_restoration', 'forest_restoration', 'peatland_restoration', 'other'
]);

export const projectStatusEnum = pgEnum('project_status', [
  'draft', 'polygon_submitted', 'auto_detection_running',
  'auto_detection_complete', 'baseline_running', 'baseline_complete',
  'active_monitoring', 'monitoring_paused', 'under_review',
  'flagged', 'archived'
]);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  organizationId: uuid('organization_id').references(() => organizations.id),
  contributorId: uuid('contributor_id').references(() => users.id).notNull(),
  restorationGoal: restorationGoalEnum('restoration_goal').notNull(),
  status: projectStatusEnum('status').default('draft').notNull(),
  // PostGIS columns handled via raw SQL in migrations
  // polygon: GEOMETRY(Polygon, 4326)
  // centroid: GEOMETRY(Point, 4326)
  areaHectares: numeric('area_hectares', { precision: 12, scale: 4 }),
  perimeterKm: numeric('perimeter_km', { precision: 10, scale: 4 }),
  country: varchar('country', { length: 100 }),
  adminRegion: varchar('admin_region', { length: 255 }),
  timezone: varchar('timezone', { length: 64 }),
  monitoringFrequency: varchar('monitoring_frequency', { length: 20 }).default('monthly'),
  nextMonitoringDue: timestamp('next_monitoring_due'),
  baselineCompletedAt: timestamp('baseline_completed_at'),
  registryId: varchar('registry_id', { length: 30 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  archivedAt: timestamp('archived_at'),
});

// Observations table with partitioning (migration uses raw SQL)
export const environmentalObservations = pgTable('environmental_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  monitoringCycleId: uuid('monitoring_cycle_id')
    .references(() => monitoringCycles.id).notNull(),
  observationType: varchar('observation_type', { length: 50 }).notNull(),
  observedAt: timestamp('observed_at').notNull(),
  valueMean: numeric('value_mean', { precision: 10, scale: 6 }),
  valueMin: numeric('value_min', { precision: 10, scale: 6 }),
  valueMax: numeric('value_max', { precision: 10, scale: 6 }),
  valueStddev: numeric('value_stddev', { precision: 10, scale: 6 }),
  valueMedian: numeric('value_median', { precision: 10, scale: 6 }),
  valueDistribution: jsonb('value_distribution'),
  valueUnit: varchar('value_unit', { length: 20 }),
  spatialCoveragePct: numeric('spatial_coverage_pct', { precision: 5, scale: 2 }),
  rasterAssetPath: varchar('raster_asset_path', { length: 512 }),
  thumbnailPath: varchar('thumbnail_path', { length: 512 }),
  tileLayerPath: varchar('tile_layer_path', { length: 512 }),
  sourceDataset: varchar('source_dataset', { length: 255 }),
  sourceImageId: varchar('source_image_id', { length: 255 }),
  sourceDate: timestamp('source_date'),
  sourceResolutionM: integer('source_resolution_m'),
  processingAlgorithm: varchar('processing_algorithm', { length: 255 }),
  processingParameters: jsonb('processing_parameters'),
  confidence: numeric('confidence', { precision: 5, scale: 4 }),
  qualityFlag: varchar('quality_flag', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```
