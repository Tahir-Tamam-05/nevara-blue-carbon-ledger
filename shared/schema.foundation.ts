import {
  bigserial,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const ecoMonitoring = pgSchema("eco_monitoring");

export const monitoringCycleTypeEnum = ecoMonitoring.enum("monitoring_cycle_type", [
  "baseline",
  "scheduled",
  "manual",
  "event_triggered",
]);

export const monitoringCycleStatusEnum = ecoMonitoring.enum("monitoring_cycle_status", [
  "pending",
  "imagery_collection",
  "analyzing",
  "analysis_complete",
  "under_review",
  "verified",
  "flagged",
  "failed",
]);

export const observationTypeEnum = ecoMonitoring.enum("observation_type", [
  "ndvi",
  "evi",
  "savi",
  "ndwi",
  "ndmi",
  "nbr",
  "bsi",
  "land_cover",
  "surface_temp",
  "sar_backscatter",
  "biomass_estimate",
  "flood_extent",
  "moisture_index",
  "canopy_height",
  "erosion_indicator",
  "water_turbidity",
  "vegetation_fraction",
  "phenology_metric",
]);

export const observationQualityFlagEnum = ecoMonitoring.enum("observation_quality_flag", [
  "good",
  "acceptable",
  "low",
  "failed",
]);

export const projectSiteProfiles = ecoMonitoring.table(
  "project_site_profiles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: varchar("project_id").notNull(),
    profileVersion: integer("profile_version").notNull(),
    detectedEcosystemType: varchar("detected_ecosystem_type", { length: 100 }),
    landCoverComposition: jsonb("land_cover_composition").$type<Record<string, unknown>>(),
    dominantLandCover: varchar("dominant_land_cover", { length: 100 }),
    elevationMinM: numeric("elevation_min_m", { precision: 10, scale: 2 }),
    elevationMaxM: numeric("elevation_max_m", { precision: 10, scale: 2 }),
    elevationMeanM: numeric("elevation_mean_m", { precision: 10, scale: 2 }),
    slopeMeanDeg: numeric("slope_mean_deg", { precision: 8, scale: 3 }),
    slopeMaxDeg: numeric("slope_max_deg", { precision: 8, scale: 3 }),
    aspectDominant: varchar("aspect_dominant", { length: 32 }),
    nearestWaterBodyName: text("nearest_water_body_name"),
    nearestWaterBodyDistanceM: numeric("nearest_water_body_distance_m", { precision: 12, scale: 2 }),
    nearestWaterBodyType: varchar("nearest_water_body_type", { length: 32 }),
    climateZone: varchar("climate_zone", { length: 64 }),
    annualRainfallMm: numeric("annual_rainfall_mm", { precision: 10, scale: 2 }),
    soilTypeEstimate: varchar("soil_type_estimate", { length: 128 }),
    floodRiskClass: varchar("flood_risk_class", { length: 32 }),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
    sourceDatasets: jsonb("source_datasets").$type<Array<Record<string, unknown>>>(),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("idx_project_site_profiles_project_id").on(table.projectId),
    computedAtIdx: index("idx_project_site_profiles_computed_at").on(table.computedAt),
  }),
);

export const monitoringCycles = ecoMonitoring.table(
  "monitoring_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: varchar("project_id").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    cycleType: monitoringCycleTypeEnum("cycle_type").notNull(),
    status: monitoringCycleStatusEnum("status").default("pending").notNull(),
    triggeredBy: varchar("triggered_by", { length: 128 }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    imageryAcquiredAt: timestamp("imagery_acquired_at", { withTimezone: true }),
    analysisCompletedAt: timestamp("analysis_completed_at", { withTimezone: true }),
    reviewStartedAt: timestamp("review_started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    satelliteImageryRefs: jsonb("satellite_imagery_refs").$type<Array<Record<string, unknown>>>(),
    cloudCoverPct: numeric("cloud_cover_pct", { precision: 5, scale: 2 }),
    qualityFlags: jsonb("quality_flags").$type<Record<string, unknown>>(),
    errorLog: text("error_log"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectStatusIdx: index("idx_monitoring_cycles_project_status").on(table.projectId, table.status),
    createdAtIdx: index("idx_monitoring_cycles_created_at").on(table.createdAt),
  }),
);

export const environmentalObservations = ecoMonitoring.table(
  "environmental_observations",
  {
    id: uuid("id").defaultRandom().notNull(),
    projectId: varchar("project_id").notNull(),
    monitoringCycleId: uuid("monitoring_cycle_id").notNull(),
    observationType: observationTypeEnum("observation_type").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    valueMean: numeric("value_mean", { precision: 12, scale: 6 }),
    valueMin: numeric("value_min", { precision: 12, scale: 6 }),
    valueMax: numeric("value_max", { precision: 12, scale: 6 }),
    valueStddev: numeric("value_stddev", { precision: 12, scale: 6 }),
    valueMedian: numeric("value_median", { precision: 12, scale: 6 }),
    valueDistribution: jsonb("value_distribution").$type<Record<string, unknown>>(),
    valueUnit: varchar("value_unit", { length: 64 }),
    spatialCoveragePct: numeric("spatial_coverage_pct", { precision: 5, scale: 2 }),
    rasterAssetPath: text("raster_asset_path"),
    thumbnailPath: text("thumbnail_path"),
    tileLayerPath: text("tile_layer_path"),
    sourceDataset: varchar("source_dataset", { length: 128 }),
    sourceImageId: varchar("source_image_id", { length: 256 }),
    sourceDate: date("source_date"),
    sourceResolutionM: integer("source_resolution_m"),
    processingAlgorithm: varchar("processing_algorithm", { length: 128 }),
    processingParameters: jsonb("processing_parameters").$type<Record<string, unknown>>(),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    qualityFlag: observationQualityFlagEnum("quality_flag"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectTypeObservedAtIdx: index("idx_env_obs_project_type_observed_at").on(
      table.projectId,
      table.observationType,
      table.observedAt,
    ),
    monitoringCycleIdx: index("idx_env_obs_monitoring_cycle_id").on(table.monitoringCycleId),
  }),
);

export type ProjectSiteProfile = typeof projectSiteProfiles.$inferSelect;
export type MonitoringCycle = typeof monitoringCycles.$inferSelect;
export type EnvironmentalObservation = typeof environmentalObservations.$inferSelect;
