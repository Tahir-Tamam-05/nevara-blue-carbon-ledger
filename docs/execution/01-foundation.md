
# NEVARA — Execution Document 01: Foundation & System Architecture

> **Source:** `docs/master_architecture.md` — Sections 1 & 2  
> **Cross-references:** See `02-database.md` for schema, `04-gee-pipeline.md` for GEE modules, `09-scheduler.md` for scheduling

---

# 1. EXECUTIVE ARCHITECTURE OVERVIEW

## 1.1 Fundamental Paradigm Shift

NEVARA transitions from a **credit-minting pipeline** to a **continuous ecological intelligence registry**. The core abstraction changes from:

```
OLD: Project → Single Analysis → Credit → Marketplace
NEW: Project → Permanent Case File → Continuous Monitoring → Historical Intelligence → Reports → (Future: Credits)
```

Every restoration project becomes a **living environmental dossier** — continuously enriched with satellite observations, environmental indices, verifier assessments, and field evidence.

## 1.2 Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Observation-First** | Every piece of data is an immutable observation tied to a timestamp and source |
| **Temporally-Native** | Every entity has `valid_from` / `valid_to`; nothing is overwritten |
| **GIS-Centric** | PostGIS geometries are first-class citizens in every query |
| **Pipeline-Modular** | Each analysis module is an independent, replaceable unit |
| **API-First** | Every capability exposed as a versioned REST endpoint |
| **Scientifically Attributable** | Every derived metric carries provenance (dataset, algorithm, parameters, confidence) |
| **Future-Compatible** | Carbon scoring, sequestration, and minting can re-attach without schema changes |

## 1.3 High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CONTRIBUTOR INTERFACE                         │
│  (Project Name, Description, Org, Restoration Goal, Polygon, Files) │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     INGESTION & AUTO-DETECTION                       │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │ Polygon      │  │ Reverse      │  │ GEE Initial Fetch         │   │
│  │ Validation & │  │ Geocoding &  │  │ (Sentinel-2 Latest +      │   │
│  │ Area Calc    │  │ Admin        │  │  ESA WorldCover +          │   │
│  │ (Turf.js +   │  │ Boundaries   │  │  Dynamic World +           │   │
│  │  PostGIS)    │  │ (Nominatim)  │  │  SRTM DEM)                │   │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬───────────────┘   │
│         │                │                       │                    │
│         └────────────────┼───────────────────────┘                    │
│                          ▼                                            │
│              ┌───────────────────────┐                                │
│              │  AUTO-DERIVED PROFILE │                                │
│              │  • Coordinates        │                                │
│              │  • Ecosystem Class    │                                │
│              │  • Area (ha)          │                                │
│              │  • Land Cover %       │                                │
│              │  • Water Proximity    │                                │
│              │  • Elevation/Slope    │                                │
│              │  • NDVI Baseline      │                                │
│              │  • Moisture Index     │                                │
│              └───────────┬───────────┘                                │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    GIS + ANALYSIS PIPELINE                            │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ NDVI     │ │ NDWI /   │ │ Land     │ │ Terrain  │ │ Historical│  │
│  │ Module   │ │ Moisture │ │ Cover    │ │ Analysis │ │ Change    │  │
│  │          │ │ Module   │ │ Module   │ │ Module   │ │ Detection │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       └─────────────┼───────────┼─────────────┼─────────────┘        │
│                     ▼           ▼             ▼                       │
│              ┌──────────────────────────────────┐                     │
│              │   OBSERVATION STORE (PostgreSQL)  │                     │
│              │   Immutable, Timestamped, Sourced │                     │
│              └──────────────────┬───────────────┘                     │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
          ┌──────────────┐ ┌───────────┐ ┌──────────────┐
          │  MONITORING   │ │ VERIFIER  │ │  REPORTING   │
          │  SCHEDULER    │ │ DASHBOARD │ │  ENGINE      │
          │  (Cron/Queue) │ │           │ │              │
          └──────────────┘ └───────────┘ └──────────────┘
                                               │
                                               ▼
                                 ┌──────────────────────┐
                                 │  PERMANENT REGISTRY   │
                                 │  (Environmental Case  │
                                 │   Files)              │
                                 └──────────────────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                             ┌────────────┐       ┌────────────────┐
                             │ FUTURE:    │       │ FUTURE:        │
                             │ Carbon     │       │ Credit Minting │
                             │ Scoring    │       │ & Marketplace  │
                             └────────────┘       └────────────────┘
```

---

# 2. SYSTEM ARCHITECTURE

## 2.1 Service Topology

NEVARA's enhanced architecture remains **monorepo-deployable on EC2** but is internally modularized into distinct service boundaries that can later be extracted into microservices.

```
┌─────────────────────────────────────────────────────────────────┐
│                         EC2 INSTANCE                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              NGINX (Reverse Proxy + Static)              │    │
│  └────────────┬──────────────┬──────────────┬──────────────┘    │
│               │              │              │                    │
│  ┌────────────▼────────┐  ┌─▼────────────┐ │                    │
│  │  REACT FRONTEND     │  │ TILE SERVER  │ │                    │
│  │  (PM2 - Port 3000)  │  │ (Port 8080)  │ │                    │
│  └─────────────────────┘  └──────────────┘ │                    │
│                                             │                    │
│  ┌──────────────────────────────────────────▼──────────────┐    │
│  │           NODE.JS API SERVER (PM2 - Port 4000)           │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │    │
│  │  │ Project  │ │ GIS      │ │ MRV      │ │ Report    │  │    │
│  │  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │    │
│  │  │ Verifier │ │ Registry │ │ Audit    │ │ Scheduler │  │    │
│  │  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │  SERVICE LAYER                                    │   │    │
│  │  │  ProjectService | GISService | MRVOrchestrator   │   │    │
│  │  │  VerifierService | ReportService | RegistryService│   │    │
│  │  │  SchedulerService | AuditService                  │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │  DATA ACCESS (Drizzle ORM + PostGIS extensions)  │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                              │                                    │
│                              │ HTTP / gRPC                        │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │        PYTHON GEE SERVICE (PM2 - Port 5000)              │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │    │
│  │  │ Imagery  │ │ Index    │ │ Land     │ │ Change    │  │    │
│  │  │ Fetcher  │ │ Computer │ │ Classif. │ │ Detector  │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │    │
│  │  │ Terrain  │ │ Moisture │ │ Raster   │               │    │
│  │  │ Analyzer │ │ Analyzer │ │ Exporter │               │    │
│  │  └──────────┘ └──────────┘ └──────────┘               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                              │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐    │
│  │  BULL QUEUE (Redis-backed Job Queue)                      │    │
│  │  • analysis-queue                                         │    │
│  │  • monitoring-queue                                       │    │
│  │  • report-queue                                           │    │
│  │  • tile-generation-queue                                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  POSTGRESQL 15 + PostGIS 3.4                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  REDIS 7 (Queue backend + Caching)                        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  FILE STORAGE (S3 or local /data/nevara/)                 │    │
│  │  • /rasters/  • /tiles/  • /reports/  • /uploads/         │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## 2.2 Internal Module Dependency Graph

```
ProjectModule
    ├── depends on → GISModule (auto-detection)
    ├── depends on → GEEModule (satellite analysis)
    └── emits → ProjectCreatedEvent

GISModule
    ├── Turf.js (client-side preview)
    ├── PostGIS (server-side authoritative)
    └── Nominatim (reverse geocoding)

GEEModule (Python Service)
    ├── ImageryFetcher
    ├── IndexComputer (NDVI, NDWI, NDMI, EVI, SAVI, BSI, NBR)
    ├── LandClassifier (ESA WorldCover, Dynamic World)
    ├── TerrainAnalyzer (SRTM)
    ├── MoistureAnalyzer (Sentinel-1 SAR)
    ├── ChangeDetector (temporal differencing)
    ├── HistoricalProfiler (multi-year composites)
    └── RasterExporter (GeoTIFF, PNG tiles)

MRVOrchestrator
    ├── StateMachine (XState-based)
    ├── depends on → GEEModule
    ├── depends on → SchedulerModule
    └── emits → AnalysisCompleteEvent, MonitoringDueEvent

VerifierModule
    ├── depends on → MRVOrchestrator (state transitions)
    ├── depends on → ObservationStore (historical data)
    └── emits → VerificationCompleteEvent

ReportModule
    ├── depends on → ObservationStore
    ├── depends on → GISModule (map renders)
    ├── depends on → VerifierModule (decisions)
    └── generates → PDF/HTML reports

RegistryModule
    ├── depends on → all above
    └── provides → permanent case file API

SchedulerModule
    ├── node-cron for scheduling
    ├── Bull queue for execution
    └── triggers → MRVOrchestrator.runMonitoringCycle()
```

## 2.3 Communication Patterns

| From | To | Method | Why |
|------|----|--------|-----|
| Node API → Python GEE | HTTP REST (internal port 5000) | Loose coupling, language boundary |
| Node API → PostgreSQL | Drizzle ORM | Type-safe, existing pattern |
| Node API → Redis | ioredis | Queue + cache |
| Node API → Bull Queue | Bull library | Async job processing |
| Frontend → Node API | REST + WebSocket (for progress) | Existing pattern + real-time updates |
| Scheduler → Bull Queue | Bull producer | Decoupled scheduling |
| Bull Workers → Python GEE | HTTP REST | Workers call GEE service |

---

## RECOMMENDED LIBRARIES & TOOLS

### Node.js Backend

| Library | Purpose |
|---------|---------|
| `@turf/turf` | Client + server-side spatial operations |
| `drizzle-orm` | Database ORM (already used) |
| `node-cron` | Monitoring scheduler |
| `bull` + `ioredis` | Job queue for async analysis (or `pg-boss` for Postgres-only) |
| `puppeteer` | PDF report generation from HTML templates |
| `handlebars` | Report HTML templating |
| `sharp` | Image processing for thumbnails |
| `axios` | HTTP client for Python service calls |
| `zod` | Input validation schemas |
| `winston` | Structured logging |

### Python MRV Engine

| Library | Purpose |
|---------|---------|
| `earthengine-api` | Google Earth Engine Python API |
| `flask` or `fastapi` | REST API framework |
| `numpy` | Numerical computation for statistics |
| `rasterio` | GeoTIFF read/write (local rasters) |
| `gdal2tiles` | Tile generation from rasters |
| `shapely` | Geometry operations |
| `pyproj` | Coordinate transformations |
| `requests` | HTTP for callbacks |

### Frontend

| Library | Purpose |
|---------|---------|
| `leaflet` | Map rendering (already used) |
| `react-leaflet` | React bindings for Leaflet |
| `leaflet-draw` | Polygon drawing (already used) |
| `recharts` | Charts for NDVI history, indicators |
| `react-circular-progressbar` | Health score gauge |
| `react-dropzone` | File upload for field evidence |
| `date-fns` | Date formatting |

---

## STORAGE ARCHITECTURE

```
/data/nevara/
├── rasters/
│   └── {project_id}/
│       ├── baseline_ndvi.tif
│       ├── baseline_rgb.tif
│       ├── snapshot_001_ndvi.tif
│       ├── snapshot_001_change.tif
│       └── ...
├── tiles/
│   └── {project_id}/
│       └── {layer_type}/
│           └── {z}/{x}/{y}.png
├── thumbnails/
│   └── {project_id}/
│       ├── baseline_ndvi_thumb.png
│       ├── baseline_rgb_thumb.png
│       └── snapshot_001_ndvi_thumb.png
├── reports/
│   └── {project_id}/
│       ├── baseline_v1.pdf
│       ├── monitoring_001_v1.pdf
│       └── quarterly_2025Q2_v1.pdf
├── field_evidence/
│   └── {project_id}/
│       ├── photo_001.jpg
│       └── document_001.pdf
└── colormaps/
    ├── ndvi_rdylgn.txt
    ├── water_blues.txt
    └── temp_spectral.txt
```

---

## SCALABILITY CONSIDERATIONS

| Concern | Strategy |
|---------|----------|
| **GEE Rate Limits** | Batch analysis in queue; use high-volume endpoint; retry with exponential backoff |
| **Raster Storage Growth** | Store thumbnails always; full-res GeoTIFFs optionally; tile directories cleaned after 90 days (re-generatable) |
| **Database Growth** | Partition `monitoring_snapshots` and `environmental_analyses` by year; archive old audit logs |
| **Concurrent Analysis Jobs** | Bull queue with concurrency=3; Python service can process 3 projects simultaneously |
| **Report PDF Storage** | Store in S3 (or local /data/nevara/reports/); ~2-5MB per report; manageable for thousands of projects |
| **Monitoring Scheduler Load** | Process due projects in batches of 50; stagger monitoring dates to avoid GEE spikes |
| **Frontend Map Performance** | Pre-generated XYZ tiles at zoom 10-16; lazy-load layers; limit snapshot history to last 12 in map view |
