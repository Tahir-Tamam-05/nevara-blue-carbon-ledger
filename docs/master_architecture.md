

\# NEVARA — Ecological Monitoring & MRV System Architecture

\#\# Complete Technical Blueprint v2.0

\---

\# TABLE OF CONTENTS

1\. \[Executive Architecture Overview\](\#1-executive-architecture-overview)  
2\. \[System Architecture\](\#2-system-architecture)  
3\. \[Database Design\](\#3-database-design)  
4\. \[GIS Engine\](\#4-gis-engine)  
5\. \[Google Earth Engine Workflow\](\#5-google-earth-engine-workflow)  
6\. \[Open Source Datasets Encyclopedia\](\#6-open-source-datasets-encyclopedia)  
7\. \[Environmental Analysis Modules\](\#7-environmental-analysis-modules)  
8\. \[MRV Workflow & State Machine\](\#8-mrv-workflow--state-machine)  
9\. \[Verifier Dashboard Enhancement\](\#9-verifier-dashboard-enhancement)  
10\. \[Contributor Dashboard Enhancement\](\#10-contributor-dashboard-enhancement)  
11\. \[Reporting Engine\](\#11-reporting-engine)  
12\. \[Permanent Project Registry\](\#12-permanent-project-registry)  
13\. \[Future-Ready Architecture\](\#13-future-ready-architecture)  
14\. \[API Planning\](\#14-api-planning)  
15\. \[Infrastructure & Scalability\](\#15-infrastructure--scalability)

\---

\# 1\. EXECUTIVE ARCHITECTURE OVERVIEW

\#\# 1.1 Fundamental Paradigm Shift

NEVARA transitions from a \*\*credit-minting pipeline\*\* to a \*\*continuous ecological intelligence registry\*\*. The core abstraction changes from:

\`\`\`  
OLD: Project → Single Analysis → Credit → Marketplace  
NEW: Project → Permanent Case File → Continuous Monitoring → Historical Intelligence → Reports → (Future: Credits)  
\`\`\`

Every restoration project becomes a \*\*living environmental dossier\*\* — continuously enriched with satellite observations, environmental indices, verifier assessments, and field evidence.

\#\# 1.2 Architecture Principles

| Principle | Implementation |  
|-----------|---------------|  
| \*\*Observation-First\*\* | Every piece of data is an immutable observation tied to a timestamp and source |  
| \*\*Temporally-Native\*\* | Every entity has \`valid\_from\` / \`valid\_to\`; nothing is overwritten |  
| \*\*GIS-Centric\*\* | PostGIS geometries are first-class citizens in every query |  
| \*\*Pipeline-Modular\*\* | Each analysis module is an independent, replaceable unit |  
| \*\*API-First\*\* | Every capability exposed as a versioned REST endpoint |  
| \*\*Scientifically Attributable\*\* | Every derived metric carries provenance (dataset, algorithm, parameters, confidence) |  
| \*\*Future-Compatible\*\* | Carbon scoring, sequestration, and minting can re-attach without schema changes |

\#\# 1.3 High-Level Data Flow

\`\`\`  
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
│  │ Validation & │  │ Geocoding &  │  │ (Sentinel-2 Latest \+      │   │  
│  │ Area Calc    │  │ Admin        │  │  ESA WorldCover \+          │   │  
│  │ (Turf.js \+   │  │ Boundaries   │  │  Dynamic World \+           │   │  
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
│                    GIS \+ ANALYSIS PIPELINE                            │  
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
\`\`\`

\---

\# 2\. SYSTEM ARCHITECTURE

\#\# 2.1 Service Topology

NEVARA's enhanced architecture remains \*\*monorepo-deployable on EC2\*\* but is internally modularized into distinct service boundaries that can later be extracted into microservices.

\`\`\`  
┌─────────────────────────────────────────────────────────────────┐  
│                         EC2 INSTANCE                             │  
│                                                                  │  
│  ┌─────────────────────────────────────────────────────────┐    │  
│  │              NGINX (Reverse Proxy \+ Static)              │    │  
│  └────────────┬──────────────┬──────────────┬──────────────┘    │  
│               │              │              │                    │  
│  ┌────────────▼────────┐  ┌─▼────────────┐ │                    │  
│  │  REACT FRONTEND     │  │ TILE SERVER  │ │                    │  
│  │  (PM2 \- Port 3000\)  │  │ (Port 8080\)  │ │                    │  
│  └─────────────────────┘  └──────────────┘ │                    │  
│                                             │                    │  
│  ┌──────────────────────────────────────────▼──────────────┐    │  
│  │           NODE.JS API SERVER (PM2 \- Port 4000\)           │    │  
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
│  │  │  DATA ACCESS (Drizzle ORM \+ PostGIS extensions)  │   │    │  
│  │  └──────────────────────────────────────────────────┘   │    │  
│  └──────────────────────────────────────────────────────────┘    │  
│                              │                                    │  
│                              │ HTTP / gRPC                        │  
│                              ▼                                    │  
│  ┌──────────────────────────────────────────────────────────┐    │  
│  │        PYTHON GEE SERVICE (PM2 \- Port 5000\)              │    │  
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
│  │  POSTGRESQL 15 \+ PostGIS 3.4                              │    │  
│  └──────────────────────────────────────────────────────────┘    │  
│                                                                  │  
│  ┌──────────────────────────────────────────────────────────┐    │  
│  │  REDIS 7 (Queue backend \+ Caching)                        │    │  
│  └──────────────────────────────────────────────────────────┘    │  
│                                                                  │  
│  ┌──────────────────────────────────────────────────────────┐    │  
│  │  FILE STORAGE (S3 or local /data/nevara/)                 │    │  
│  │  • /rasters/  • /tiles/  • /reports/  • /uploads/         │    │  
│  └──────────────────────────────────────────────────────────┘    │  
└──────────────────────────────────────────────────────────────────┘  
\`\`\`

\#\# 2.2 Internal Module Dependency Graph

\`\`\`  
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
\`\`\`

\#\# 2.3 Communication Patterns

| From | To | Method | Why |  
|------|----|--------|-----|  
| Node API → Python GEE | HTTP REST (internal port 5000\) | Loose coupling, language boundary |  
| Node API → PostgreSQL | Drizzle ORM | Type-safe, existing pattern |  
| Node API → Redis | ioredis | Queue \+ cache |  
| Node API → Bull Queue | Bull library | Async job processing |  
| Frontend → Node API | REST \+ WebSocket (for progress) | Existing pattern \+ real-time updates |  
| Scheduler → Bull Queue | Bull producer | Decoupled scheduling |  
| Bull Workers → Python GEE | HTTP REST | Workers call GEE service |

\---

\# 3\. DATABASE DESIGN

\#\# 3.1 Design Philosophy

The database design follows a \*\*temporal-observation\*\* model. Every measurement, classification, and assessment is an immutable \*\*observation\*\* tied to:  
\- A project  
\- A timestamp (\`observed\_at\`)  
\- A source (satellite, verifier, system, contributor)  
\- A provenance chain (dataset, algorithm, parameters)

Nothing is overwritten. Current state is always the latest observation. Historical state is always queryable.

\#\# 3.2 Entity Relationship Diagram

\`\`\`  
┌─────────────────────┐       ┌──────────────────────────┐  
│ organizations       │       │ users                     │  
│─────────────────────│       │──────────────────────────│  
│ id (PK)             │──┐    │ id (PK)                  │  
│ name                │  │    │ email                    │  
│ type                │  │    │ role                     │  
│ registration\_no     │  │    │ organization\_id (FK)     │  
│ contact\_info        │  │    │ ...                      │  
│ created\_at          │  │    └──────────────────────────┘  
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
│ organization\_id (FK)                                              │  
│ contributor\_id (FK → users)                                       │  
│ restoration\_goal (ENUM: lake, barren\_land, wetland, mangrove,     │  
│                         coastal, riparian, grassland, forest,      │  
│                         peatland, other)                           │  
│ status (ENUM \- see state machine)                                 │  
│ polygon (GEOMETRY(Polygon, 4326)) ← PostGIS                      │  
│ centroid (GEOMETRY(Point, 4326))  ← auto-computed                 │  
│ area\_hectares (NUMERIC)           ← auto-computed                 │  
│ perimeter\_km (NUMERIC)            ← auto-computed                 │  
│ bbox (GEOMETRY(Polygon, 4326))    ← auto-computed                 │  
│ country                           ← auto-derived                  │  
│ admin\_region                      ← auto-derived                  │  
│ timezone                          ← auto-derived                  │  
│ monitoring\_frequency (ENUM: biweekly, monthly, quarterly)         │  
│ next\_monitoring\_due (TIMESTAMP)                                   │  
│ baseline\_completed\_at (TIMESTAMP)                                 │  
│ registry\_id (VARCHAR, unique)     ← e.g., NEV-2025-LK-00142      │  
│ created\_at (TIMESTAMP)                                            │  
│ updated\_at (TIMESTAMP)                                            │  
│ archived\_at (TIMESTAMP, nullable)                                 │  
│                                                                    │  
│ INDEXES:                                                           │  
│   GIST(polygon), GIST(centroid), btree(status), btree(registry\_id)│  
│   btree(organization\_id), btree(next\_monitoring\_due)               │  
└──────────────────────────────────────────────────────────────────┘  
          │  
          │ 1:N  
          ▼  
┌──────────────────────────────────────────────────────────────────┐  
│ project\_site\_profiles                                             │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK)                                                           │  
│ project\_id (FK)                                                   │  
│ profile\_version (INT)                                             │  
│ detected\_ecosystem\_type (VARCHAR)   ← from WorldCover/DynamicWorld│  
│ land\_cover\_composition (JSONB)      ← {tree:32%, water:15%,...}   │  
│ dominant\_land\_cover (VARCHAR)                                     │  
│ elevation\_min\_m (NUMERIC)                                         │  
│ elevation\_max\_m (NUMERIC)                                         │  
│ elevation\_mean\_m (NUMERIC)                                        │  
│ slope\_mean\_deg (NUMERIC)                                          │  
│ slope\_max\_deg (NUMERIC)                                           │  
│ aspect\_dominant (VARCHAR)                                         │  
│ nearest\_water\_body\_name (VARCHAR)                                 │  
│ nearest\_water\_body\_distance\_m (NUMERIC)                           │  
│ nearest\_water\_body\_type (VARCHAR)  ← lake, river, wetland, coast  │  
│ climate\_zone (VARCHAR)                                            │  
│ annual\_rainfall\_mm (NUMERIC)                                      │  
│ soil\_type\_estimate (VARCHAR)       ← from SoilGrids if available  │  
│ flood\_risk\_class (VARCHAR)                                        │  
│ computed\_at (TIMESTAMP)                                           │  
│ source\_datasets (JSONB)            ← \[{name, date, resolution}\]   │  
│ confidence\_score (NUMERIC)                                        │  
│                                                                    │  
│ UNIQUE(project\_id, profile\_version)                                │  
└──────────────────────────────────────────────────────────────────┘  
          │  
          │ 1:N (project\_id on all below)  
          ▼  
┌──────────────────────────────────────────────────────────────────┐  
│ monitoring\_cycles                                                 │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK, UUID)                                                     │  
│ project\_id (FK)                                                   │  
│ cycle\_number (INT)             ← 0 \= baseline, 1,2,3... \= monitor │  
│ cycle\_type (ENUM: baseline, scheduled, manual, event\_triggered)   │  
│ status (ENUM: pending, imagery\_collection, analyzing,             │  
│              analysis\_complete, under\_review, verified,            │  
│              flagged, failed)                                      │  
│ triggered\_by (VARCHAR)         ← system/user\_id/event\_name        │  
│ started\_at (TIMESTAMP)                                            │  
│ imagery\_acquired\_at (TIMESTAMP)                                   │  
│ analysis\_completed\_at (TIMESTAMP)                                 │  
│ review\_started\_at (TIMESTAMP)                                     │  
│ completed\_at (TIMESTAMP)                                          │  
│ satellite\_imagery\_refs (JSONB)  ← \[{dataset, image\_id, date, ...}\]│  
│ cloud\_cover\_pct (NUMERIC)                                         │  
│ quality\_flags (JSONB)                                             │  
│ error\_log (TEXT, nullable)                                        │  
│ created\_at (TIMESTAMP)                                            │  
│                                                                    │  
│ UNIQUE(project\_id, cycle\_number)                                   │  
│ INDEX btree(project\_id, status)                                    │  
└──────────────────────────────────────────────────────────────────┘  
          │  
          │ 1:N  
          ▼  
┌──────────────────────────────────────────────────────────────────┐  
│ environmental\_observations                                        │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK, UUID)                                                     │  
│ project\_id (FK)                                                   │  
│ monitoring\_cycle\_id (FK)                                          │  
│ observation\_type (ENUM:                                           │  
│   ndvi, evi, savi, ndwi, ndmi, nbr, bsi,                         │  
│   land\_cover, surface\_temp, sar\_backscatter,                      │  
│   biomass\_estimate, flood\_extent, moisture\_index,                 │  
│   canopy\_height, erosion\_indicator, water\_turbidity,              │  
│   vegetation\_fraction, phenology\_metric)                          │  
│ observed\_at (TIMESTAMP)           ← satellite acquisition date    │  
│ value\_mean (NUMERIC)                                              │  
│ value\_min (NUMERIC)                                               │  
│ value\_max (NUMERIC)                                               │  
│ value\_stddev (NUMERIC)                                            │  
│ value\_median (NUMERIC)                                            │  
│ value\_distribution (JSONB)        ← histogram bins                │  
│ value\_unit (VARCHAR)              ← 'index', '°C', 'mm', 'dB'    │  
│ spatial\_coverage\_pct (NUMERIC)    ← % of polygon with valid data  │  
│ raster\_asset\_path (VARCHAR)       ← path to GeoTIFF              │  
│ thumbnail\_path (VARCHAR)          ← path to PNG preview           │  
│ tile\_layer\_path (VARCHAR)         ← path to XYZ tile directory    │  
│ source\_dataset (VARCHAR)          ← 'COPERNICUS/S2\_SR\_HARMONIZED' │  
│ source\_image\_id (VARCHAR)                                         │  
│ source\_date (DATE)                                                │  
│ source\_resolution\_m (INT)                                         │  
│ processing\_algorithm (VARCHAR)    ← 'cloud\_masked\_median\_composite│  
│ processing\_parameters (JSONB)     ← {cloud\_threshold: 20, ...}    │  
│ confidence (NUMERIC)                                              │  
│ quality\_flag (VARCHAR)            ← good, acceptable, low, failed │  
│ created\_at (TIMESTAMP)                                            │  
│                                                                    │  
│ INDEX btree(project\_id, observation\_type, observed\_at)             │  
│ INDEX btree(monitoring\_cycle\_id)                                   │  
│ PARTITION BY RANGE(observed\_at) — yearly partitions                │  
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐  
│ change\_detections                                                 │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK)                                                           │  
│ project\_id (FK)                                                   │  
│ from\_cycle\_id (FK → monitoring\_cycles)                            │  
│ to\_cycle\_id (FK → monitoring\_cycles)                              │  
│ observation\_type (ENUM — same as above)                           │  
│ delta\_mean (NUMERIC)                                              │  
│ delta\_pct (NUMERIC)                                               │  
│ delta\_classification (ENUM:                                       │  
│   significant\_improvement, moderate\_improvement, stable,          │  
│   moderate\_decline, significant\_decline, anomalous)               │  
│ change\_map\_path (VARCHAR)         ← diff raster                   │  
│ analysis\_method (VARCHAR)                                         │  
│ from\_date (DATE)                                                  │  
│ to\_date (DATE)                                                    │  
│ created\_at (TIMESTAMP)                                            │  
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐  
│ verifier\_reviews                                                  │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK)                                                           │  
│ monitoring\_cycle\_id (FK)                                          │  
│ project\_id (FK)                                                   │  
│ verifier\_id (FK → users)                                          │  
│ assigned\_at (TIMESTAMP)                                           │  
│ started\_at (TIMESTAMP)                                            │  
│ decision (ENUM: pending, approved, conditionally\_approved,        │  
│               revision\_requested, flagged, rejected)              │  
│ decision\_at (TIMESTAMP)                                           │  
│ confidence\_rating (INT, 1-5)                                      │  
│ findings (JSONB)                   ← structured findings          │  
│ internal\_notes (TEXT)                                              │  
│ public\_summary (TEXT)                                              │  
│ risk\_flags (JSONB)                 ← \[{type, severity, note}\]     │  
│ recommended\_actions (JSONB)                                       │  
│ reviewed\_observations (JSONB)      ← \[obs\_id: {comment, flag}\]   │  
│ next\_review\_recommendation (VARCHAR) ← 'standard' | 'expedited'  │  
│ created\_at (TIMESTAMP)                                            │  
│ updated\_at (TIMESTAMP)                                            │  
│                                                                    │  
│ INDEX btree(verifier\_id, decision)                                 │  
│ INDEX btree(project\_id)                                            │  
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐  
│ reports                                                           │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK, UUID)                                                     │  
│ project\_id (FK)                                                   │  
│ monitoring\_cycle\_id (FK, nullable) ← null for summary reports     │  
│ report\_type (ENUM: baseline\_assessment, monitoring\_report,        │  
│   seasonal\_comparison, annual\_summary, restoration\_progress,      │  
│   environmental\_risk, custom)                                     │  
│ version (INT)                                                     │  
│ title (VARCHAR)                                                   │  
│ status (ENUM: generating, draft, finalized, superseded, error)    │  
│ generated\_at (TIMESTAMP)                                          │  
│ finalized\_at (TIMESTAMP)                                          │  
│ file\_path\_pdf (VARCHAR)                                           │  
│ file\_path\_html (VARCHAR)                                          │  
│ file\_size\_bytes (BIGINT)                                          │  
│ content\_hash (VARCHAR)             ← SHA-256 for integrity        │  
│ metadata (JSONB)                   ← sections included, page count│  
│ generated\_by (VARCHAR)             ← system/user\_id               │  
│ created\_at (TIMESTAMP)                                            │  
│                                                                    │  
│ UNIQUE(project\_id, report\_type, version)                           │  
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐  
│ field\_evidence                                                    │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK)                                                           │  
│ project\_id (FK)                                                   │  
│ monitoring\_cycle\_id (FK, nullable)                                │  
│ uploaded\_by (FK → users)                                          │  
│ evidence\_type (ENUM: photo, document, lab\_report, drone\_image,    │  
│                       video, gps\_track, field\_form)               │  
│ file\_path (VARCHAR)                                               │  
│ file\_name (VARCHAR)                                               │  
│ file\_size\_bytes (BIGINT)                                          │  
│ mime\_type (VARCHAR)                                                │  
│ capture\_location (GEOMETRY(Point, 4326), nullable)                │  
│ capture\_date (DATE, nullable)                                     │  
│ description (TEXT)                                                 │  
│ tags (TEXT\[\])                                                     │  
│ created\_at (TIMESTAMP)                                            │  
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐  
│ audit\_log                                                         │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK, BIGSERIAL)                                                │  
│ project\_id (FK, nullable)                                         │  
│ actor\_id (FK → users, nullable)                                   │  
│ actor\_type (ENUM: user, system, scheduler, gee\_service)           │  
│ action (VARCHAR)                   ← e.g., 'monitoring.triggered' │  
│ entity\_type (VARCHAR)              ← 'project', 'observation'...  │  
│ entity\_id (UUID)                                                  │  
│ details (JSONB)                                                   │  
│ ip\_address (INET, nullable)                                       │  
│ created\_at (TIMESTAMP DEFAULT NOW())                              │  
│                                                                    │  
│ INDEX btree(project\_id, created\_at)                                │  
│ INDEX btree(action)                                                │  
│ PARTITION BY RANGE(created\_at) — monthly partitions                │  
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐  
│ project\_timeline\_events                                           │  
│──────────────────────────────────────────────────────────────────│  
│ id (PK)                                                           │  
│ project\_id (FK)                                                   │  
│ event\_type (ENUM: created, polygon\_submitted, baseline\_started,   │  
│   baseline\_complete, monitoring\_triggered, analysis\_complete,     │  
│   verifier\_assigned, review\_complete, report\_generated,           │  
│   field\_evidence\_uploaded, status\_changed, flag\_raised,           │  
│   flag\_resolved, archived)                                        │  
│ event\_data (JSONB)                                                │  
│ created\_by (FK → users, nullable)                                 │  
│ created\_at (TIMESTAMP)                                            │  
│                                                                    │  
│ INDEX btree(project\_id, created\_at)                                │  
└──────────────────────────────────────────────────────────────────┘  
\`\`\`

\#\# 3.3 Future-Ready Extension Points (Not Implemented Now)

\`\`\`sql  
\-- These tables exist in schema design docs but are NOT created yet.  
\-- They show how carbon scoring and credit minting will attach.

\-- carbon\_estimates (FK → monitoring\_cycles)  
\-- sequestration\_calculations (FK → carbon\_estimates)    
\-- credit\_issuances (FK → projects) — ALREADY EXISTS, untouched  
\-- marketplace\_listings (FK → credit\_issuances) — ALREADY EXISTS, untouched  
\`\`\`

\#\# 3.4 Drizzle Schema Example (Key Tables)

\`\`\`typescript  
// schema/projects.ts  
import { pgTable, uuid, varchar, text, numeric, timestamp,   
         integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';  
import { sql } from 'drizzle-orm';

export const restorationGoalEnum \= pgEnum('restoration\_goal', \[  
  'lake\_restoration', 'barren\_land\_restoration', 'wetland\_recovery',  
  'mangrove\_restoration', 'coastal\_restoration', 'riparian\_restoration',  
  'grassland\_restoration', 'forest\_restoration', 'peatland\_restoration', 'other'  
\]);

export const projectStatusEnum \= pgEnum('project\_status', \[  
  'draft', 'polygon\_submitted', 'auto\_detection\_running',  
  'auto\_detection\_complete', 'baseline\_running', 'baseline\_complete',  
  'active\_monitoring', 'monitoring\_paused', 'under\_review',  
  'flagged', 'archived'  
\]);

export const projects \= pgTable('projects', {  
  id: uuid('id').primaryKey().defaultRandom(),  
  name: varchar('name', { length: 255 }).notNull(),  
  description: text('description'),  
  organizationId: uuid('organization\_id').references(() \=\> organizations.id),  
  contributorId: uuid('contributor\_id').references(() \=\> users.id).notNull(),  
  restorationGoal: restorationGoalEnum('restoration\_goal').notNull(),  
  status: projectStatusEnum('status').default('draft').notNull(),  
  // PostGIS columns handled via raw SQL in migrations  
  // polygon: GEOMETRY(Polygon, 4326\)  
  // centroid: GEOMETRY(Point, 4326\)  
  areaHectares: numeric('area\_hectares', { precision: 12, scale: 4 }),  
  perimeterKm: numeric('perimeter\_km', { precision: 10, scale: 4 }),  
  country: varchar('country', { length: 100 }),  
  adminRegion: varchar('admin\_region', { length: 255 }),  
  timezone: varchar('timezone', { length: 64 }),  
  monitoringFrequency: varchar('monitoring\_frequency', { length: 20 }).default('monthly'),  
  nextMonitoringDue: timestamp('next\_monitoring\_due'),  
  baselineCompletedAt: timestamp('baseline\_completed\_at'),  
  registryId: varchar('registry\_id', { length: 30 }).unique(),  
  createdAt: timestamp('created\_at').defaultNow().notNull(),  
  updatedAt: timestamp('updated\_at').defaultNow().notNull(),  
  archivedAt: timestamp('archived\_at'),  
});

// Observations table with partitioning (migration uses raw SQL)  
export const environmentalObservations \= pgTable('environmental\_observations', {  
  id: uuid('id').primaryKey().defaultRandom(),  
  projectId: uuid('project\_id').references(() \=\> projects.id).notNull(),  
  monitoringCycleId: uuid('monitoring\_cycle\_id')  
    .references(() \=\> monitoringCycles.id).notNull(),  
  observationType: varchar('observation\_type', { length: 50 }).notNull(),  
  observedAt: timestamp('observed\_at').notNull(),  
  valueMean: numeric('value\_mean', { precision: 10, scale: 6 }),  
  valueMin: numeric('value\_min', { precision: 10, scale: 6 }),  
  valueMax: numeric('value\_max', { precision: 10, scale: 6 }),  
  valueStddev: numeric('value\_stddev', { precision: 10, scale: 6 }),  
  valueMedian: numeric('value\_median', { precision: 10, scale: 6 }),  
  valueDistribution: jsonb('value\_distribution'),  
  valueUnit: varchar('value\_unit', { length: 20 }),  
  spatialCoveragePct: numeric('spatial\_coverage\_pct', { precision: 5, scale: 2 }),  
  rasterAssetPath: varchar('raster\_asset\_path', { length: 512 }),  
  thumbnailPath: varchar('thumbnail\_path', { length: 512 }),  
  tileLayerPath: varchar('tile\_layer\_path', { length: 512 }),  
  sourceDataset: varchar('source\_dataset', { length: 255 }),  
  sourceImageId: varchar('source\_image\_id', { length: 255 }),  
  sourceDate: timestamp('source\_date'),  
  sourceResolutionM: integer('source\_resolution\_m'),  
  processingAlgorithm: varchar('processing\_algorithm', { length: 255 }),  
  processingParameters: jsonb('processing\_parameters'),  
  confidence: numeric('confidence', { precision: 5, scale: 4 }),  
  qualityFlag: varchar('quality\_flag', { length: 20 }),  
  createdAt: timestamp('created\_at').defaultNow().notNull(),  
});  
\`\`\`

\#\# 3.5 PostGIS Migration (Raw SQL)

\`\`\`sql  
\-- Migration: add PostGIS columns and spatial indexes  
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE projects   
  ADD COLUMN polygon geometry(Polygon, 4326),  
  ADD COLUMN centroid geometry(Point, 4326),  
  ADD COLUMN bbox geometry(Polygon, 4326);

CREATE INDEX idx\_projects\_polygon\_gist ON projects USING GIST(polygon);  
CREATE INDEX idx\_projects\_centroid\_gist ON projects USING GIST(centroid);

\-- Auto-compute centroid and bbox on polygon insert/update  
CREATE OR REPLACE FUNCTION compute\_project\_spatial\_fields()  
RETURNS TRIGGER AS $$  
BEGIN  
  IF NEW.polygon IS NOT NULL THEN  
    NEW.centroid := ST\_Centroid(NEW.polygon);  
    NEW.bbox := ST\_Envelope(NEW.polygon);  
    NEW.area\_hectares := ST\_Area(NEW.polygon::geography) / 10000.0;  
    NEW.perimeter\_km := ST\_Perimeter(NEW.polygon::geography) / 1000.0;  
  END IF;  
  RETURN NEW;  
END;  
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg\_project\_spatial  
  BEFORE INSERT OR UPDATE OF polygon ON projects  
  FOR EACH ROW EXECUTE FUNCTION compute\_project\_spatial\_fields();

\-- Partition environmental\_observations by year  
CREATE TABLE environmental\_observations (  
  id UUID DEFAULT gen\_random\_uuid(),  
  project\_id UUID NOT NULL,  
  monitoring\_cycle\_id UUID NOT NULL,  
  observation\_type VARCHAR(50) NOT NULL,  
  observed\_at TIMESTAMP NOT NULL,  
  \-- ... all other columns ...  
  created\_at TIMESTAMP DEFAULT NOW(),  
  PRIMARY KEY (id, observed\_at)  
) PARTITION BY RANGE (observed\_at);

CREATE TABLE env\_obs\_2024 PARTITION OF environmental\_observations  
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');  
CREATE TABLE env\_obs\_2025 PARTITION OF environmental\_observations  
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');  
CREATE TABLE env\_obs\_2026 PARTITION OF environmental\_observations  
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');  
\`\`\`

\---

\# 4\. GIS ENGINE

\#\# 4.1 Architecture

The GIS Engine is split into two tiers:

1\. \*\*Client-Side GIS (Leaflet \+ Turf.js)\*\* — Real-time polygon drawing, preview area calculation, visual feedback  
2\. \*\*Server-Side GIS (PostGIS \+ Python GEE)\*\* — Authoritative spatial computation, satellite analysis, spatial queries

\`\`\`  
┌─────────────────────────────────────────────────┐  
│              CLIENT-SIDE GIS LAYER               │  
│                                                  │  
│  Leaflet.draw → polygon GeoJSON                  │  
│  Turf.js → preview area, centroid, bbox          │  
│  Visual feedback → area overlay, bounds          │  
│                                                  │  
│  OUTPUT: GeoJSON Feature sent to API             │  
└─────────────────────┬───────────────────────────┘  
                      │ POST /api/v1/projects  
                      ▼  
┌─────────────────────────────────────────────────┐  
│           SERVER-SIDE GIS PIPELINE               │  
│                                                  │  
│  Step 1: VALIDATION                              │  
│    • Valid GeoJSON geometry?                      │  
│    • Valid polygon (closed ring, no self-         │  
│      intersections)?                             │  
│    • Area within bounds (1 ha – 50,000 ha)?      │  
│    • Not in excluded regions?                     │  
│    • Topology cleanup (ST\_MakeValid)              │  
│                                                  │  
│  Step 2: SPATIAL COMPUTATION (PostGIS)           │  
│    • ST\_Area(geog) → area in m²                  │  
│    • ST\_Centroid → centroid point                 │  
│    • ST\_Envelope → bounding box                  │  
│    • ST\_Perimeter(geog) → perimeter              │  
│    • ST\_Transform for projections                │  
│                                                  │  
│  Step 3: REVERSE GEOCODING                       │  
│    • Nominatim API (self-hosted or rate-limited) │  
│    • centroid → country, admin region, place name│  
│    • timezone lookup (tz\_lookup or API)           │  
│                                                  │  
│  Step 4: AUTO-DETECTION TRIGGER                  │  
│    • Queue GEE analysis job                      │  
│    • {polygon, project\_id} → Bull queue          │  
│                                                  │  
└─────────────────────┬───────────────────────────┘  
                      │  
                      ▼  
┌─────────────────────────────────────────────────┐  
│        GEE AUTO-DETECTION (Python Worker)        │  
│                                                  │  
│  Input: polygon GeoJSON                          │  
│                                                  │  
│  4a. LAND COVER CLASSIFICATION                   │  
│    • ESA WorldCover 10m → land cover %           │  
│    • Dynamic World → probabilistic classes       │  
│    • Derive dominant ecosystem type              │  
│                                                  │  
│  4b. TERRAIN ANALYSIS                            │  
│    • SRTM DEM 30m → elevation stats             │  
│    • Slope computation → mean, max               │  
│    • Aspect → dominant direction                 │  
│                                                  │  
│  4c. WATER PROXIMITY                             │  
│    • JRC Global Surface Water → water mask       │  
│    • Distance to nearest water pixel             │  
│    • Water body identification                   │  
│    • OR: OpenStreetMap Overpass API for named     │  
│          water features                          │  
│                                                  │  
│  4d. VEGETATION BASELINE                         │  
│    • Sentinel-2 latest clear composite           │  
│    • NDVI, NDWI computation                      │  
│    • Baseline values stored                      │  
│                                                  │  
│  4e. MOISTURE / CLIMATE INDICATORS               │  
│    • CHIRPS rainfall data → annual avg           │  
│    • ERA5 surface temp → mean temp               │  
│    • Sentinel-1 SAR → soil moisture proxy        │  
│                                                  │  
│  OUTPUT: project\_site\_profile record             │  
│          \+ initial observations                  │  
└─────────────────────────────────────────────────┘  
\`\`\`

\#\# 4.2 Polygon Validation Rules

\`\`\`typescript  
// services/gis/polygon-validator.ts

interface PolygonValidationResult {  
  valid: boolean;  
  errors: string\[\];  
  warnings: string\[\];  
  cleaned?: GeoJSON.Polygon; // ST\_MakeValid result  
}

const VALIDATION\_RULES \= {  
  MIN\_AREA\_HA: 0.5,  
  MAX\_AREA\_HA: 50000,  
  MIN\_VERTICES: 4, // 3 \+ closing point  
  MAX\_VERTICES: 10000,  
  MAX\_SELF\_INTERSECTIONS: 0,  
  COORDINATE\_BOUNDS: {  
    lat: \[-60, 75\],  // Exclude polar regions  
    lng: \[-180, 180\],  
  },  
  EXCLUDED\_REGIONS: \[\] // Optional: military zones, restricted areas  
};

async function validatePolygon(geojson: GeoJSON.Polygon): Promise\<PolygonValidationResult\> {  
  const errors: string\[\] \= \[\];  
  const warnings: string\[\] \= \[\];  
    
  // 1\. Schema validation  
  if (geojson.type \!== 'Polygon') errors.push('Geometry must be Polygon type');  
    
  // 2\. Ring closure  
  const ring \= geojson.coordinates\[0\];  
  if (\!coordinatesEqual(ring\[0\], ring\[ring.length \- 1\])) {  
    errors.push('Polygon ring must be closed');  
  }  
    
  // 3\. Vertex count  
  if (ring.length \< VALIDATION\_RULES.MIN\_VERTICES) {  
    errors.push(\`Minimum ${VALIDATION\_RULES.MIN\_VERTICES \- 1} vertices required\`);  
  }  
    
  // 4\. Self-intersection check (PostGIS)  
  const isSimple \= await db.execute(  
    sql\`SELECT ST\_IsSimple(ST\_GeomFromGeoJSON(${JSON.stringify(geojson)}))\`  
  );  
  if (\!isSimple) {  
    // Attempt auto-fix  
    const cleaned \= await db.execute(  
      sql\`SELECT ST\_AsGeoJSON(ST\_MakeValid(ST\_GeomFromGeoJSON(${JSON.stringify(geojson)})))\`  
    );  
    warnings.push('Polygon had self-intersections; auto-corrected');  
  }  
    
  // 5\. Area bounds  
  const areaHa \= await db.execute(  
    sql\`SELECT ST\_Area(ST\_GeomFromGeoJSON(${JSON.stringify(geojson)})::geography) / 10000.0\`  
  );  
  if (areaHa \< VALIDATION\_RULES.MIN\_AREA\_HA) errors.push('Area too small');  
  if (areaHa \> VALIDATION\_RULES.MAX\_AREA\_HA) errors.push('Area too large');  
    
  // 6\. Coordinate bounds  
  const bbox \= turf.bbox(geojson);  
  if (bbox\[1\] \< VALIDATION\_RULES.COORDINATE\_BOUNDS.lat\[0\]) {  
    errors.push('Polygon extends beyond supported latitude range');  
  }  
    
  return { valid: errors.length \=== 0, errors, warnings };  
}  
\`\`\`

\#\# 4.3 Spatial Query Library

\`\`\`typescript  
// services/gis/spatial-queries.ts

class SpatialQueryService {  
    
  // Find projects within distance of a point  
  async findProjectsNear(lat: number, lng: number, radiusKm: number) {  
    return db.execute(sql\`  
      SELECT id, name, registry\_id,  
             ST\_Distance(centroid::geography, ST\_Point(${lng}, ${lat})::geography) / 1000 as distance\_km  
      FROM projects  
      WHERE ST\_DWithin(centroid::geography, ST\_Point(${lng}, ${lat})::geography, ${radiusKm \* 1000})  
      ORDER BY distance\_km  
    \`);  
  }  
    
  // Check polygon overlap with existing projects  
  async checkOverlap(polygon: GeoJSON.Polygon) {  
    return db.execute(sql\`  
      SELECT id, name, registry\_id,  
             ST\_Area(ST\_Intersection(polygon, ST\_GeomFromGeoJSON(${JSON.stringify(polygon)}))::geography) / 10000 as overlap\_ha  
      FROM projects  
      WHERE ST\_Intersects(polygon, ST\_GeomFromGeoJSON(${JSON.stringify(polygon)}))  
        AND archived\_at IS NULL  
    \`);  
  }  
    
  // Water body proximity analysis  
  async nearestWaterFeature(centroid: { lat: number; lng: number }) {  
    // Uses Overpass API for OpenStreetMap water features  
    const query \= \`  
      \[out:json\]\[timeout:25\];  
      (  
        way\["natural"="water"\](around:5000, ${centroid.lat}, ${centroid.lng});  
        relation\["natural"="water"\](around:5000, ${centroid.lat}, ${centroid.lng});  
        way\["waterway"\](around:5000, ${centroid.lat}, ${centroid.lng});  
      );  
      out center;  
    \`;  
    // Parse and return nearest feature with name, type, distance  
  }  
}  
\`\`\`

\---

\# 5\. GOOGLE EARTH ENGINE WORKFLOW

\#\# 5.1 Python GEE Service Architecture

\`\`\`  
gee-service/  
├── app.py                      \# Flask/FastAPI entry point  
├── config/  
│   ├── settings.py             \# GEE credentials, paths, thresholds  
│   └── datasets.py             \# Dataset catalog with metadata  
├── core/  
│   ├── auth.py                 \# GEE authentication (service account)  
│   ├── geometry.py             \# GeoJSON → ee.Geometry conversion  
│   └── export.py               \# Raster export utilities  
├── modules/  
│   ├── imagery\_fetcher.py      \# Multi-dataset imagery acquisition  
│   ├── cloud\_masking.py        \# Per-dataset cloud masking  
│   ├── index\_computer.py       \# Spectral index calculations  
│   ├── land\_classifier.py      \# Land cover / ecosystem detection  
│   ├── terrain\_analyzer.py     \# DEM-based analysis  
│   ├── moisture\_analyzer.py    \# SAR \+ optical moisture  
│   ├── change\_detector.py      \# Temporal change analysis  
│   ├── historical\_profiler.py  \# Multi-year trend analysis  
│   ├── flood\_analyzer.py       \# Flood extent and frequency  
│   ├── temperature\_analyzer.py \# Surface temperature analysis  
│   └── biomass\_estimator.py    \# Vegetation biomass proxy  
├── pipelines/  
│   ├── auto\_detection.py       \# Initial site characterization  
│   ├── baseline\_analysis.py    \# Full baseline assessment  
│   ├── monitoring\_analysis.py  \# Periodic monitoring cycle  
│   └── historical\_analysis.py  \# Deep historical reconstruction  
├── exporters/  
│   ├── geotiff\_exporter.py     \# Export rasters as GeoTIFF  
│   ├── tile\_generator.py       \# Generate XYZ/TMS tiles  
│   └── thumbnail\_generator.py  \# Generate PNG previews  
├── utils/  
│   ├── quality.py              \# Quality assessment functions  
│   ├── statistics.py           \# Zonal statistics computation  
│   └── colormap.py             \# Visualization palettes  
└── routes/  
    ├── analysis.py             \# Analysis trigger endpoints  
    ├── status.py               \# Job status endpoints  
    └── tiles.py                \# Tile serving endpoints  
\`\`\`

\#\# 5.2 Authentication & Initialization

\`\`\`python  
\# core/auth.py  
import ee  
import json  
from config.settings import GEE\_SERVICE\_ACCOUNT, GEE\_KEY\_PATH

def initialize\_gee():  
    """Initialize GEE with service account credentials."""  
    credentials \= ee.ServiceAccountCredentials(  
        GEE\_SERVICE\_ACCOUNT,  
        GEE\_KEY\_PATH  
    )  
    ee.Initialize(  
        credentials=credentials,  
        opt\_url='https://earthengine-highvolume.googleapis.com'  \# High-volume endpoint  
    )  
      
\# core/geometry.py  
def geojson\_to\_ee\_geometry(geojson: dict) \-\> ee.Geometry:  
    """Convert GeoJSON polygon to ee.Geometry with validation."""  
    if geojson\['type'\] \== 'Polygon':  
        return ee.Geometry.Polygon(geojson\['coordinates'\])  
    elif geojson\['type'\] \== 'MultiPolygon':  
        return ee.Geometry.MultiPolygon(geojson\['coordinates'\])  
    else:  
        raise ValueError(f"Unsupported geometry type: {geojson\['type'\]}")  
\`\`\`

\#\# 5.3 Cloud Masking (Critical for Quality)

\`\`\`python  
\# modules/cloud\_masking.py  
import ee

def mask\_s2\_clouds(image: ee.Image) \-\> ee.Image:  
    """  
    Cloud mask for Sentinel-2 SR Harmonized using SCL band.  
    Removes clouds, cloud shadows, cirrus, snow.  
    """  
    scl \= image.select('SCL')  
    \# SCL classes: 3=cloud\_shadow, 7=unclassified, 8=cloud\_medium,   
    \# 9=cloud\_high, 10=cirrus, 11=snow  
    mask \= scl.neq(3).And(scl.neq(7)).And(scl.neq(8)) \\  
              .And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
      
    \# Additional: use QA60 for cirrus/opaque clouds  
    qa \= image.select('QA60')  
    cloud\_bit\_mask \= 1 \<\< 10  
    cirrus\_bit\_mask \= 1 \<\< 11  
    qa\_mask \= qa.bitwiseAnd(cloud\_bit\_mask).eq(0) \\  
                .And(qa.bitwiseAnd(cirrus\_bit\_mask).eq(0))  
      
    return image.updateMask(mask.And(qa\_mask)) \\  
                .divide(10000)  \# Scale to 0-1 reflectance  
                

def mask\_landsat8\_clouds(image: ee.Image) \-\> ee.Image:  
    """Cloud mask for Landsat 8/9 Collection 2 SR using QA\_PIXEL."""  
    qa \= image.select('QA\_PIXEL')  
    dilated\_cloud \= 1 \<\< 1  
    cirrus \= 1 \<\< 2  
    cloud \= 1 \<\< 3  
    cloud\_shadow \= 1 \<\< 4  
      
    mask \= qa.bitwiseAnd(dilated\_cloud).eq(0) \\  
             .And(qa.bitwiseAnd(cirrus).eq(0)) \\  
             .And(qa.bitwiseAnd(cloud).eq(0)) \\  
             .And(qa.bitwiseAnd(cloud\_shadow).eq(0))  
      
    return image.updateMask(mask) \\  
                .multiply(0.0000275).add(-0.2)  \# Scale factors

def mask\_s1\_borders(image: ee.Image) \-\> ee.Image:  
    """Remove border noise from Sentinel-1 GRD images."""  
    edge \= image.lt(-30)  
    masked \= image.updateMask(edge.Not())  
    return masked  
\`\`\`

\#\# 5.4 Imagery Fetching with Quality Control

\`\`\`python  
\# modules/imagery\_fetcher.py  
import ee  
from datetime import datetime, timedelta  
from modules.cloud\_masking import mask\_s2\_clouds, mask\_landsat8\_clouds

class ImageryFetcher:  
      
    def fetch\_sentinel2(  
        self,   
        geometry: ee.Geometry,   
        start\_date: str,   
        end\_date: str,  
        max\_cloud\_pct: int \= 20,  
        composite\_method: str \= 'median'  
    ) \-\> dict:  
        """  
        Fetch Sentinel-2 SR imagery for a geometry and date range.  
        Returns composite image \+ metadata.  
        """  
        collection \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(geometry)  
            .filterDate(start\_date, end\_date)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', max\_cloud\_pct))  
            .map(mask\_s2\_clouds)  
            .select(\['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A',   
                      'B11', 'B12'\])  
        )  
          
        count \= collection.size().getInfo()  
          
        if count \== 0:  
            \# Fallback: expand date range or increase cloud threshold  
            return self.\_fallback\_fetch(geometry, start\_date, end\_date)  
          
        if composite\_method \== 'median':  
            composite \= collection.median()  
        elif composite\_method \== 'greenest':  
            \# Select pixel with highest NDVI  
            with\_ndvi \= collection.map(lambda img: img.addBands(  
                img.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
            ))  
            composite \= with\_ndvi.qualityMosaic('NDVI')  
          
        \# Clip to geometry  
        composite \= composite.clip(geometry)  
          
        \# Compute coverage statistics  
        coverage \= self.\_compute\_coverage(composite, geometry)  
          
        return {  
            'image': composite,  
            'image\_count': count,  
            'date\_range': {'start': start\_date, 'end': end\_date},  
            'cloud\_threshold': max\_cloud\_pct,  
            'composite\_method': composite\_method,  
            'spatial\_coverage\_pct': coverage,  
            'dataset': 'COPERNICUS/S2\_SR\_HARMONIZED',  
            'resolution\_m': 10,  
        }  
      
    def fetch\_sentinel1(  
        self,  
        geometry: ee.Geometry,  
        start\_date: str,  
        end\_date: str,  
        orbit\_pass: str \= 'DESCENDING'  
    ) \-\> dict:  
        """Fetch Sentinel-1 SAR GRD imagery."""  
        collection \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(geometry)  
            .filterDate(start\_date, end\_date)  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .filter(ee.Filter.eq('orbitProperties\_pass', orbit\_pass))  
            .select(\['VV', 'VH'\])  
            .map(mask\_s1\_borders)  
        )  
          
        composite \= collection.median().clip(geometry)  
          
        \# Add VV/VH ratio (useful for vegetation)  
        ratio \= composite.select('VV').divide(composite.select('VH')).rename('VV\_VH\_ratio')  
        composite \= composite.addBands(ratio)  
          
        return {  
            'image': composite,  
            'image\_count': collection.size().getInfo(),  
            'dataset': 'COPERNICUS/S1\_GRD',  
            'resolution\_m': 10,  
            'polarization': 'VV+VH',  
            'orbit\_pass': orbit\_pass,  
        }  
      
    def fetch\_landsat\_historical(  
        self,  
        geometry: ee.Geometry,  
        year: int,  
        season: str \= 'annual'  
    ) \-\> dict:  
        """  
        Fetch historical Landsat imagery.  
        Uses Landsat 8/9 (2013+), Landsat 7 (1999-2023), Landsat 5 (1984-2012).  
        Harmonized to common band names.  
        """  
        if year \>= 2013:  
            dataset \= 'LANDSAT/LC08/C02/T1\_L2'  \# or LC09  
            bands \= \['SR\_B2', 'SR\_B3', 'SR\_B4', 'SR\_B5', 'SR\_B6', 'SR\_B7'\]  
            rename \= \['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'\]  
            mask\_fn \= mask\_landsat8\_clouds  
        elif year \>= 1999:  
            dataset \= 'LANDSAT/LE07/C02/T1\_L2'  
            bands \= \['SR\_B1', 'SR\_B2', 'SR\_B3', 'SR\_B4', 'SR\_B5', 'SR\_B7'\]  
            rename \= \['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'\]  
            mask\_fn \= mask\_landsat8\_clouds  \# Similar QA structure  
        else:  
            dataset \= 'LANDSAT/LT05/C02/T1\_L2'  
            bands \= \['SR\_B1', 'SR\_B2', 'SR\_B3', 'SR\_B4', 'SR\_B5', 'SR\_B7'\]  
            rename \= \['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'\]  
            mask\_fn \= mask\_landsat8\_clouds  
          
        date\_range \= self.\_get\_season\_dates(year, season)  
          
        collection \= (  
            ee.ImageCollection(dataset)  
            .filterBounds(geometry)  
            .filterDate(date\_range\['start'\], date\_range\['end'\])  
            .map(mask\_fn)  
            .select(bands, rename)  
        )  
          
        composite \= collection.median().clip(geometry)  
          
        return {  
            'image': composite,  
            'image\_count': collection.size().getInfo(),  
            'year': year,  
            'season': season,  
            'dataset': dataset,  
            'resolution\_m': 30,  
        }  
      
    def \_fallback\_fetch(self, geometry, start\_date, end\_date):  
        """Progressive fallback: expand window → increase cloud tolerance → use Landsat."""  
        \# Step 1: Expand to ±30 days  
        start \= datetime.fromisoformat(start\_date) \- timedelta(days=30)  
        end \= datetime.fromisoformat(end\_date) \+ timedelta(days=30)  
          
        collection \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(geometry)  
            .filterDate(start.isoformat(), end.isoformat())  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 40))  
            .map(mask\_s2\_clouds)  
        )  
          
        if collection.size().getInfo() \> 0:  
            return {'image': collection.median().clip(geometry), 'fallback': 'expanded\_window'}  
          
        \# Step 2: Use Landsat as backup  
        return self.fetch\_landsat\_historical(  
            geometry,   
            datetime.fromisoformat(start\_date).year,  
            'annual'  
        )  
      
    def \_compute\_coverage(self, image: ee.Image, geometry: ee.Geometry) \-\> float:  
        """Compute percentage of geometry with valid (non-masked) pixels."""  
        valid\_mask \= image.select(0).mask()  
        stats \= valid\_mask.reduceRegion(  
            reducer=ee.Reducer.mean(),  
            geometry=geometry,  
            scale=10,  
            maxPixels=1e8  
        )  
        return round(stats.getInfo().get(list(stats.getInfo().keys())\[0\], 0\) \* 100, 1\)  
\`\`\`

\#\# 5.5 Spectral Index Computer

\`\`\`python  
\# modules/index\_computer.py  
import ee

class IndexComputer:  
    """Computes spectral indices from satellite imagery."""  
      
    @staticmethod  
    def compute\_ndvi(image: ee.Image, nir='B8', red='B4') \-\> ee.Image:  
        """  
        Normalized Difference Vegetation Index.  
        NDVI \= (NIR \- Red) / (NIR \+ Red)  
        Range: \-1 to 1 (healthy vegetation \> 0.3)  
        """  
        return image.normalizedDifference(\[nir, red\]).rename('NDVI')  
      
    @staticmethod  
    def compute\_evi(image: ee.Image) \-\> ee.Image:  
        """  
        Enhanced Vegetation Index.  
        EVI \= 2.5 \* (NIR \- Red) / (NIR \+ 6\*Red \- 7.5\*Blue \+ 1\)  
        Better than NDVI in high biomass areas, less atmospheric noise.  
        """  
        return image.expression(  
            '2.5 \* ((NIR \- RED) / (NIR \+ 6 \* RED \- 7.5 \* BLUE \+ 1))',  
            {  
                'NIR': image.select('B8'),  
                'RED': image.select('B4'),  
                'BLUE': image.select('B2')  
            }  
        ).rename('EVI')  
      
    @staticmethod  
    def compute\_savi(image: ee.Image, L=0.5) \-\> ee.Image:  
        """  
        Soil-Adjusted Vegetation Index.  
        SAVI \= ((NIR \- Red) / (NIR \+ Red \+ L)) \* (1 \+ L)  
        Better for areas with exposed soil (barren land restoration).  
        """  
        return image.expression(  
            '((NIR \- RED) / (NIR \+ RED \+ L)) \* (1 \+ L)',  
            {  
                'NIR': image.select('B8'),  
                'RED': image.select('B4'),  
                'L': L  
            }  
        ).rename('SAVI')  
      
    @staticmethod  
    def compute\_ndwi(image: ee.Image) \-\> ee.Image:  
        """  
        Normalized Difference Water Index (McFeeters).  
        NDWI \= (Green \- NIR) / (Green \+ NIR)  
        Detects surface water. Positive values \= water.  
        """  
        return image.normalizedDifference(\['B3', 'B8'\]).rename('NDWI')  
      
    @staticmethod  
    def compute\_ndmi(image: ee.Image) \-\> ee.Image:  
        """  
        Normalized Difference Moisture Index.  
        NDMI \= (NIR \- SWIR1) / (NIR \+ SWIR1)  
        Vegetation moisture content. Higher \= wetter.  
        """  
        return image.normalizedDifference(\['B8', 'B11'\]).rename('NDMI')  
      
    @staticmethod  
    def compute\_nbr(image: ee.Image) \-\> ee.Image:  
        """  
        Normalized Burn Ratio.  
        NBR \= (NIR \- SWIR2) / (NIR \+ SWIR2)  
        Useful for degradation assessment and fire recovery.  
        """  
        return image.normalizedDifference(\['B8', 'B12'\]).rename('NBR')  
      
    @staticmethod  
    def compute\_bsi(image: ee.Image) \-\> ee.Image:  
        """  
        Bare Soil Index.  
        BSI \= ((SWIR1 \+ Red) \- (NIR \+ Blue)) / ((SWIR1 \+ Red) \+ (NIR \+ Blue))  
        Higher values indicate bare/exposed soil.  
        """  
        return image.expression(  
            '((SWIR \+ RED) \- (NIR \+ BLUE)) / ((SWIR \+ RED) \+ (NIR \+ BLUE))',  
            {  
                'SWIR': image.select('B11'),  
                'RED': image.select('B4'),  
                'NIR': image.select('B8'),  
                'BLUE': image.select('B2')  
            }  
        ).rename('BSI')  
      
    @staticmethod  
    def compute\_mndwi(image: ee.Image) \-\> ee.Image:  
        """  
        Modified NDWI.  
        MNDWI \= (Green \- SWIR1) / (Green \+ SWIR1)  
        Better at distinguishing water from built-up areas than NDWI.  
        """  
        return image.normalizedDifference(\['B3', 'B11'\]).rename('MNDWI')  
      
    @staticmethod  
    def compute\_all(image: ee.Image) \-\> ee.Image:  
        """Compute all indices and stack as bands."""  
        return image.addBands(\[  
            IndexComputer.compute\_ndvi(image),  
            IndexComputer.compute\_evi(image),  
            IndexComputer.compute\_savi(image),  
            IndexComputer.compute\_ndwi(image),  
            IndexComputer.compute\_ndmi(image),  
            IndexComputer.compute\_nbr(image),  
            IndexComputer.compute\_bsi(image),  
            IndexComputer.compute\_mndwi(image),  
        \])  
      
    @staticmethod  
    def compute\_zonal\_stats(index\_image: ee.Image, geometry: ee.Geometry,   
                            band\_name: str, scale: int \= 10\) \-\> dict:  
        """Compute zonal statistics for an index over a polygon."""  
        stats \= index\_image.select(band\_name).reduceRegion(  
            reducer=ee.Reducer.mean()  
                .combine(ee.Reducer.min(), '', True)  
                .combine(ee.Reducer.max(), '', True)  
                .combine(ee.Reducer.stdDev(), '', True)  
                .combine(ee.Reducer.median(), '', True)  
                .combine(ee.Reducer.percentile(\[10, 25, 75, 90\]), '', True),  
            geometry=geometry,  
            scale=scale,  
            maxPixels=1e9,  
            bestEffort=True  
        )  
          
        raw \= stats.getInfo()  
          
        \# Compute histogram for distribution  
        histogram \= index\_image.select(band\_name).reduceRegion(  
            reducer=ee.Reducer.fixedHistogram(-1, 1, 50),  
            geometry=geometry,  
            scale=scale,  
            maxPixels=1e9,  
            bestEffort=True  
        ).getInfo()  
          
        return {  
            'mean': raw.get(f'{band\_name}\_mean'),  
            'min': raw.get(f'{band\_name}\_min'),  
            'max': raw.get(f'{band\_name}\_max'),  
            'stddev': raw.get(f'{band\_name}\_stdDev'),  
            'median': raw.get(f'{band\_name}\_median'),  
            'p10': raw.get(f'{band\_name}\_p10'),  
            'p25': raw.get(f'{band\_name}\_p25'),  
            'p75': raw.get(f'{band\_name}\_p75'),  
            'p90': raw.get(f'{band\_name}\_p90'),  
            'histogram': histogram.get(band\_name),  
        }  
\`\`\`

\#\# 5.6 Land Classification Module

\`\`\`python  
\# modules/land\_classifier.py  
import ee

class LandClassifier:  
      
    \# ESA WorldCover 2021 class mapping  
    ESA\_WORLDCOVER\_CLASSES \= {  
        10: 'tree\_cover',  
        20: 'shrubland',   
        30: 'grassland',  
        40: 'cropland',  
        50: 'built\_up',  
        60: 'bare\_sparse\_vegetation',  
        70: 'snow\_ice',  
        80: 'permanent\_water',  
        90: 'herbaceous\_wetland',  
        95: 'mangroves',  
        100: 'moss\_lichen',  
    }  
      
    \# Dynamic World class mapping  
    DYNAMIC\_WORLD\_CLASSES \= {  
        0: 'water',  
        1: 'trees',  
        2: 'grass',  
        3: 'flooded\_vegetation',  
        4: 'crops',  
        5: 'shrub\_and\_scrub',  
        6: 'built',  
        7: 'bare',  
        8: 'snow\_and\_ice',  
    }  
      
    def classify\_esa\_worldcover(self, geometry: ee.Geometry) \-\> dict:  
        """  
        Classify land cover using ESA WorldCover 10m (2021).  
        Returns percentage composition of each class.  
        """  
        worldcover \= ee.Image('ESA/WorldCover/v200').select('Map')  
        clipped \= worldcover.clip(geometry)  
          
        \# Compute area per class  
        area\_image \= ee.Image.pixelArea().addBands(clipped)  
          
        areas \= area\_image.reduceRegion(  
            reducer=ee.Reducer.sum().group(  
                groupField=1,  
                groupName='class'  
            ),  
            geometry=geometry,  
            scale=10,  
            maxPixels=1e9,  
            bestEffort=True  
        ).getInfo()  
          
        total\_area \= sum(g\['sum'\] for g in areas\['groups'\])  
          
        composition \= {}  
        for group in areas\['groups'\]:  
            class\_id \= int(group\['class'\])  
            class\_name \= self.ESA\_WORLDCOVER\_CLASSES.get(class\_id, f'unknown\_{class\_id}')  
            pct \= round((group\['sum'\] / total\_area) \* 100, 2\)  
            if pct \> 0:  
                composition\[class\_name\] \= pct  
          
        \# Determine dominant class  
        dominant \= max(composition, key=composition.get) if composition else 'unknown'  
          
        return {  
            'composition': composition,  
            'dominant\_class': dominant,  
            'dataset': 'ESA/WorldCover/v200',  
            'year': 2021,  
            'resolution\_m': 10,  
        }  
      
    def classify\_dynamic\_world(self, geometry: ee.Geometry,   
                                start\_date: str, end\_date: str) \-\> dict:  
        """  
        Classify using Dynamic World (near real-time, 10m).  
        Uses probability bands for nuanced classification.  
        """  
        dw \= (  
            ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')  
            .filterBounds(geometry)  
            .filterDate(start\_date, end\_date)  
            .select(\['water', 'trees', 'grass', 'flooded\_vegetation',  
                      'crops', 'shrub\_and\_scrub', 'built', 'bare', 'snow\_and\_ice'\])  
        )  
          
        \# Mean probability composite  
        prob\_composite \= dw.mean().clip(geometry)  
          
        \# Get mean probability for each class  
        stats \= prob\_composite.reduceRegion(  
            reducer=ee.Reducer.mean(),  
            geometry=geometry,  
            scale=10,  
            maxPixels=1e9,  
            bestEffort=True  
        ).getInfo()  
          
        \# Also get the mode (most frequent label)  
        label\_collection \= (  
            ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')  
            .filterBounds(geometry)  
            .filterDate(start\_date, end\_date)  
            .select('label')  
        )  
        mode \= label\_collection.mode().clip(geometry)  
          
        return {  
            'probabilities': stats,  
            'dataset': 'GOOGLE/DYNAMICWORLD/V1',  
            'temporal\_range': {'start': start\_date, 'end': end\_date},  
            'resolution\_m': 10,  
        }  
      
    def derive\_ecosystem\_type(self, worldcover\_result: dict,   
                               dynamic\_world\_result: dict,  
                               terrain\_result: dict,  
                               water\_proximity: dict) \-\> dict:  
        """  
        Synthesize ecosystem classification from multiple sources.  
        Returns best-estimate ecosystem type with confidence.  
        """  
        composition \= worldcover\_result\['composition'\]  
        dominant \= worldcover\_result\['dominant\_class'\]  
        elevation \= terrain\_result.get('elevation\_mean', 0\)  
        water\_dist \= water\_proximity.get('distance\_m', float('inf'))  
          
        \# Rule-based ecosystem inference  
        ecosystem \= 'unknown'  
        confidence \= 0.0  
          
        if composition.get('mangroves', 0\) \> 15:  
            ecosystem \= 'mangrove\_ecosystem'  
            confidence \= min(composition\['mangroves'\] / 100 \+ 0.3, 1.0)  
        elif composition.get('herbaceous\_wetland', 0\) \> 20:  
            ecosystem \= 'wetland'  
            confidence \= min(composition\['herbaceous\_wetland'\] / 100 \+ 0.2, 1.0)  
        elif composition.get('permanent\_water', 0\) \> 30:  
            ecosystem \= 'aquatic\_lacustrine'  
            confidence \= min(composition\['permanent\_water'\] / 100 \+ 0.2, 1.0)  
        elif water\_dist \< 500 and composition.get('permanent\_water', 0\) \> 5:  
            ecosystem \= 'riparian\_lakeside'  
            confidence \= 0.6  
        elif composition.get('bare\_sparse\_vegetation', 0\) \> 40:  
            ecosystem \= 'barren\_degraded\_land'  
            confidence \= min(composition\['bare\_sparse\_vegetation'\] / 100 \+ 0.2, 1.0)  
        elif composition.get('tree\_cover', 0\) \> 40:  
            ecosystem \= 'forest'  
            confidence \= min(composition\['tree\_cover'\] / 100 \+ 0.2, 1.0)  
        elif composition.get('grassland', 0\) \> 40:  
            ecosystem \= 'grassland'  
            confidence \= min(composition\['grassland'\] / 100 \+ 0.2, 1.0)  
        elif composition.get('shrubland', 0\) \> 30:  
            ecosystem \= 'shrubland'  
            confidence \= 0.6  
        else:  
            ecosystem \= 'mixed\_landscape'  
            confidence \= 0.4  
          
        return {  
            'ecosystem\_type': ecosystem,  
            'confidence': round(confidence, 2),  
            'reasoning': f"Dominant: {dominant}, Water: {water\_dist:.0f}m, Elev: {elevation:.0f}m",  
            'sources': \['ESA\_WorldCover', 'Dynamic\_World', 'SRTM\_DEM', 'water\_proximity'\]  
        }  
\`\`\`

\#\# 5.7 Terrain Analysis Module

\`\`\`python  
\# modules/terrain\_analyzer.py  
import ee

class TerrainAnalyzer:  
      
    def analyze(self, geometry: ee.Geometry) \-\> dict:  
        """Full terrain analysis using SRTM 30m DEM."""  
        dem \= ee.Image('USGS/SRTMGL1\_003').select('elevation')  
          
        \# Compute terrain products  
        terrain \= ee.Algorithms.Terrain(dem)  
        slope \= terrain.select('slope')  
        aspect \= terrain.select('aspect')  
          
        \# Elevation stats  
        elev\_stats \= dem.reduceRegion(  
            reducer=ee.Reducer.mean().combine(ee.Reducer.min(), '', True)  
                .combine(ee.Reducer.max(), '', True)  
                .combine(ee.Reducer.stdDev(), '', True),  
            geometry=geometry,  
            scale=30,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
          
        \# Slope stats  
        slope\_stats \= slope.reduceRegion(  
            reducer=ee.Reducer.mean().combine(ee.Reducer.max(), '', True),  
            geometry=geometry,  
            scale=30,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
          
        \# Dominant aspect  
        aspect\_stats \= aspect.reduceRegion(  
            reducer=ee.Reducer.mode(),  
            geometry=geometry,  
            scale=30,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
          
        aspect\_deg \= aspect\_stats.get('aspect', 0\)  
        aspect\_dir \= self.\_degrees\_to\_direction(aspect\_deg)  
          
        \# Topographic Wetness Index (TWI) — useful for moisture accumulation  
        \# TWI \= ln(a / tan(β)) where a \= flow accumulation area, β \= slope  
        flow\_accumulation \= ee.Image('MERIT/Hydro/v1\_0\_1').select('upg') \# upstream area  
          
        return {  
            'elevation\_min\_m': elev\_stats.get('elevation\_min'),  
            'elevation\_max\_m': elev\_stats.get('elevation\_max'),  
            'elevation\_mean\_m': elev\_stats.get('elevation\_mean'),  
            'elevation\_stddev\_m': elev\_stats.get('elevation\_stdDev'),  
            'slope\_mean\_deg': slope\_stats.get('slope\_mean'),  
            'slope\_max\_deg': slope\_stats.get('slope\_max'),  
            'aspect\_dominant\_deg': aspect\_deg,  
            'aspect\_dominant\_dir': aspect\_dir,  
            'dataset': 'USGS/SRTMGL1\_003',  
            'resolution\_m': 30,  
        }  
      
    @staticmethod  
    def \_degrees\_to\_direction(deg):  
        dirs \= \['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'\]  
        ix \= round(deg / 45\) % 8  
        return dirs\[ix\]  
\`\`\`

\#\# 5.8 Historical Profiler (Multi-Year Trend Analysis)

\`\`\`python  
\# modules/historical\_profiler.py  
import ee

class HistoricalProfiler:  
    """  
    Builds multi-year environmental profiles for restoration sites.  
    Reconstructs degradation history and establishes trend baselines.  
    """  
      
    def build\_ndvi\_timeline(self, geometry: ee.Geometry,   
                             start\_year: int \= 2017,   
                             end\_year: int \= 2025\) \-\> list:  
        """  
        Generate yearly NDVI composites from Sentinel-2.  
        Returns time series of annual median NDVI values.  
        """  
        timeline \= \[\]  
          
        for year in range(start\_year, end\_year \+ 1):  
            start\_date \= f'{year}-01-01'  
            end\_date \= f'{year}-12-31'  
              
            collection \= (  
                ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
                .filterBounds(geometry)  
                .filterDate(start\_date, end\_date)  
                .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 30))  
                .map(mask\_s2\_clouds)  
            )  
              
            count \= collection.size().getInfo()  
              
            if count \> 0:  
                composite \= collection.median()  
                ndvi \= composite.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
                  
                stats \= ndvi.reduceRegion(  
                    reducer=ee.Reducer.mean()  
                        .combine(ee.Reducer.stdDev(), '', True),  
                    geometry=geometry,  
                    scale=10,  
                    maxPixels=1e8,  
                    bestEffort=True  
                ).getInfo()  
                  
                timeline.append({  
                    'year': year,  
                    'ndvi\_mean': stats.get('NDVI\_mean'),  
                    'ndvi\_stddev': stats.get('NDVI\_stdDev'),  
                    'image\_count': count,  
                    'source': 'S2',  
                })  
            else:  
                timeline.append({  
                    'year': year,  
                    'ndvi\_mean': None,  
                    'image\_count': 0,  
                    'note': 'Insufficient clear imagery'  
                })  
          
        return timeline  
      
    def build\_landsat\_deep\_history(self, geometry: ee.Geometry,  
                                     start\_year: int \= 2000,  
                                     end\_year: int \= 2025\) \-\> list:  
        """  
        Build NDVI timeline going back to 2000 using Landsat archive.  
        Harmonizes across Landsat 5/7/8/9.  
        """  
        timeline \= \[\]  
          
        for year in range(start\_year, end\_year \+ 1):  
            if year \>= 2013:  
                dataset \= 'LANDSAT/LC08/C02/T1\_L2'  
                nir, red \= 'SR\_B5', 'SR\_B4'  
            elif year \>= 1999:  
                dataset \= 'LANDSAT/LE07/C02/T1\_L2'  
                nir, red \= 'SR\_B4', 'SR\_B3'  
            else:  
                continue  
              
            collection \= (  
                ee.ImageCollection(dataset)  
                .filterBounds(geometry)  
                .filterDate(f'{year}-01-01', f'{year}-12-31')  
                .map(mask\_landsat8\_clouds)  
            )  
              
            count \= collection.size().getInfo()  
            if count \> 0:  
                composite \= collection.median()  
                ndvi \= composite.normalizedDifference(\[nir, red\]).rename('NDVI')  
                  
                stats \= ndvi.reduceRegion(  
                    reducer=ee.Reducer.mean(),  
                    geometry=geometry,  
                    scale=30,  
                    maxPixels=1e8,  
                    bestEffort=True  
                ).getInfo()  
                  
                timeline.append({  
                    'year': year,  
                    'ndvi\_mean': stats.get('NDVI\_mean'),  
                    'image\_count': count,  
                    'source': 'Landsat',  
                    'resolution\_m': 30,  
                })  
          
        return timeline  
      
    def detect\_degradation\_period(self, timeline: list) \-\> dict:  
        """  
        Analyze NDVI timeline to detect degradation onset and magnitude.  
        Uses simple trend analysis.  
        """  
        valid\_points \= \[p for p in timeline if p.get('ndvi\_mean') is not None\]  
          
        if len(valid\_points) \< 3:  
            return {'detected': False, 'reason': 'Insufficient data points'}  
          
        values \= \[p\['ndvi\_mean'\] for p in valid\_points\]  
        years \= \[p\['year'\] for p in valid\_points\]  
          
        \# Find peak and current  
        peak\_idx \= values.index(max(values))  
        peak\_year \= years\[peak\_idx\]  
        peak\_value \= values\[peak\_idx\]  
        current\_value \= values\[-1\]  
          
        decline\_pct \= ((peak\_value \- current\_value) / peak\_value) \* 100 if peak\_value \> 0 else 0  
          
        \# Simple trend: linear regression  
        import numpy as np  
        coeffs \= np.polyfit(years, values, 1\)  
        trend\_per\_year \= coeffs\[0\]  
          
        return {  
            'detected': decline\_pct \> 10,  
            'peak\_year': peak\_year,  
            'peak\_ndvi': round(peak\_value, 4),  
            'current\_ndvi': round(current\_value, 4),  
            'decline\_pct': round(decline\_pct, 1),  
            'trend\_per\_year': round(trend\_per\_year, 6),  
            'trend\_direction': 'improving' if trend\_per\_year \> 0.005 else   
                               'declining' if trend\_per\_year \< \-0.005 else 'stable',  
        }  
\`\`\`

\#\# 5.9 Raster Export & Tile Generation

\`\`\`python  
\# exporters/geotiff\_exporter.py  
import ee  
import os  
import requests

class GeoTiffExporter:  
      
    def export\_to\_local(self, image: ee.Image, geometry: ee.Geometry,  
                         filename: str, scale: int \= 10,  
                         bands: list \= None, crs: str \= 'EPSG:4326') \-\> str:  
        """  
        Export GEE image as GeoTIFF to local storage.  
        Uses ee.Image.getDownloadURL for smaller areas,  
        or ee.batch.Export for larger areas.  
        """  
        \# Estimate pixel count  
        area\_m2 \= geometry.area().getInfo()  
        pixel\_count \= area\_m2 / (scale \* scale)  
          
        if pixel\_count \< 1e7:  \# \< 10M pixels: direct download  
            url \= image.getDownloadURL({  
                'scale': scale,  
                'crs': crs,  
                'region': geometry,  
                'format': 'GEO\_TIFF',  
                'bands': bands,  
            })  
              
            filepath \= os.path.join('/data/nevara/rasters', filename)  
            response \= requests.get(url, stream=True)  
            with open(filepath, 'wb') as f:  
                for chunk in response.iter\_content(chunk\_size=8192):  
                    f.write(chunk)  
              
            return filepath  
        else:  
            \# Use Google Drive export (async)  
            task \= ee.batch.Export.image.toDrive(  
                image=image,  
                description=filename.replace('.tif', ''),  
                scale=scale,  
                region=geometry,  
                crs=crs,  
                maxPixels=1e10,  
                fileFormat='GeoTIFF'  
            )  
            task.start()  
            return f'gee\_task:{task.id}'

\# exporters/tile\_generator.py  
import subprocess

class TileGenerator:  
    """Generate XYZ map tiles from GeoTIFF for Leaflet overlay."""  
      
    def generate\_tiles(self, geotiff\_path: str, output\_dir: str,  
                        min\_zoom: int \= 10, max\_zoom: int \= 16,  
                        colormap: str \= 'RdYlGn') \-\> str:  
        """  
        Generate XYZ tiles using gdal2tiles.  
        Requires GDAL installed.  
        """  
        \# Step 1: Apply colormap to single-band raster  
        colored\_path \= geotiff\_path.replace('.tif', '\_colored.tif')  
        subprocess.run(\[  
            'gdaldem', 'color-relief', geotiff\_path,  
            self.\_get\_colormap\_file(colormap), colored\_path,  
            '-alpha', '-of', 'GTiff'  
        \], check=True)  
          
        \# Step 2: Generate tiles  
        subprocess.run(\[  
            'gdal2tiles.py',  
            '-z', f'{min\_zoom}-{max\_zoom}',  
            '-w', 'leaflet',  
            '-r', 'bilinear',  
            colored\_path, output\_dir  
        \], check=True)  
          
        return output\_dir  
      
    def \_get\_colormap\_file(self, name: str) \-\> str:  
        """Return path to GDAL color map file."""  
        colormaps \= {  
            'RdYlGn': '/data/nevara/colormaps/ndvi\_rdylgn.txt',  
            'water': '/data/nevara/colormaps/water\_blues.txt',  
            'temperature': '/data/nevara/colormaps/temp\_spectral.txt',  
        }  
        return colormaps.get(name, colormaps\['RdYlGn'\])  
\`\`\`

\#\# 5.10 GEE Thumbnail Generation for Reports

\`\`\`python  
\# exporters/thumbnail\_generator.py  
import ee

class ThumbnailGenerator:  
    """Generate PNG thumbnails from GEE for embedding in reports."""  
      
    VISUALIZATION\_PRESETS \= {  
        'ndvi': {  
            'bands': \['NDVI'\],  
            'min': \-0.2,  
            'max': 0.8,  
            'palette': \['\#d73027', '\#fc8d59', '\#fee08b', '\#d9ef8b', '\#91cf60', '\#1a9850'\],  
        },  
        'ndwi': {  
            'bands': \['NDWI'\],  
            'min': \-0.5,  
            'max': 0.5,  
            'palette': \['\#a52a2a', '\#f5deb3', '\#87ceeb', '\#4169e1', '\#00008b'\],  
        },  
        'true\_color': {  
            'bands': \['B4', 'B3', 'B2'\],  
            'min': 0,  
            'max': 0.3,  
        },  
        'false\_color': {  
            'bands': \['B8', 'B4', 'B3'\],  
            'min': 0,  
            'max': 0.5,  
        },  
        'bsi': {  
            'bands': \['BSI'\],  
            'min': \-0.3,  
            'max': 0.3,  
            'palette': \['\#1a9850', '\#fee08b', '\#d73027'\],  
        },  
    }  
      
    def generate(self, image: ee.Image, geometry: ee.Geometry,  
                  preset: str, dimensions: str \= '1024x1024') \-\> str:  
        """  
        Generate a thumbnail URL from GEE.  
        Downloads and stores locally.  
        """  
        vis\_params \= self.VISUALIZATION\_PRESETS\[preset\].copy()  
        vis\_params\['region'\] \= geometry  
        vis\_params\['dimensions'\] \= dimensions  
        vis\_params\['format'\] \= 'png'  
          
        url \= image.getThumbURL(vis\_params)  
        return url  \# Download and store via requests  
\`\`\`

\---

\# 6\. OPEN SOURCE DATASETS ENCYCLOPEDIA

\# Continuing from Section 6: ENVIRONMENTAL ANALYSIS MODULES

\---

\#\# 6\. ENVIRONMENTAL ANALYSIS MODULES {\#6-analysis-modules}

\#\#\# 6.1 Module Architecture Overview

Each analysis module is a \*\*self-contained Python class\*\* within the MRV Engine that:  
\- Accepts a polygon geometry \+ date range  
\- Calls specific GEE datasets  
\- Returns structured JSON results \+ optional raster artifacts  
\- Logs provenance (dataset, algorithm, parameters, confidence)

\`\`\`  
gee-service/  
└── modules/  
    ├── ndvi\_module.py  
    ├── vegetation\_health\_module.py  
    ├── water\_moisture\_module.py  
    ├── flood\_analysis\_module.py  
    ├── historical\_degradation\_module.py  
    ├── vegetation\_recovery\_module.py  
    ├── erosion\_indicator\_module.py  
    ├── biomass\_estimation\_module.py  
    ├── restoration\_suitability\_module.py  
    ├── ecosystem\_trend\_module.py  
    ├── surface\_temperature\_module.py  
    └── base\_module.py  (abstract base with shared utilities)  
\`\`\`

\#\#\# 6.2 Base Module Contract

\`\`\`python  
\# modules/base\_module.py  
from abc import ABC, abstractmethod  
from dataclasses import dataclass, field  
from typing import Optional, Dict, List, Any  
import ee  
import time

@dataclass  
class AnalysisResult:  
    module\_name: str  
    indicators: Dict\[str, float\]  
    metadata: Dict\[str, Any\]  
    raster\_paths: Dict\[str, str\] \= field(default\_factory=dict)  
    thumbnail\_paths: Dict\[str, str\] \= field(default\_factory=dict)  
    quality\_score: float \= 1.0  
    interpretation: str \= ""  
    risk\_flags: List\[Dict\] \= field(default\_factory=list)  
    datasets\_used: List\[str\] \= field(default\_factory=list)  
    execution\_time\_ms: int \= 0  
    confidence: float \= 1.0

class BaseAnalysisModule(ABC):  
      
    def \_\_init\_\_(self, geometry: ee.Geometry, date\_start: str, date\_end: str,  
                 project\_id: str, export\_path: str):  
        self.geometry \= geometry  
        self.date\_start \= date\_start  
        self.date\_end \= date\_end  
        self.project\_id \= project\_id  
        self.export\_path \= export\_path  
      
    def execute(self) \-\> AnalysisResult:  
        start \= time.time()  
        result \= self.run\_analysis()  
        result.execution\_time\_ms \= int((time.time() \- start) \* 1000\)  
        return result  
      
    @abstractmethod  
    def run\_analysis(self) \-\> AnalysisResult:  
        pass  
      
    def \_zonal\_stats(self, image: ee.Image, band: str, scale: int \= 10\) \-\> dict:  
        """Standard zonal statistics over the polygon."""  
        stats \= image.select(band).reduceRegion(  
            reducer=ee.Reducer.mean()  
                .combine(ee.Reducer.min(), '', True)  
                .combine(ee.Reducer.max(), '', True)  
                .combine(ee.Reducer.stdDev(), '', True)  
                .combine(ee.Reducer.median(), '', True)  
                .combine(ee.Reducer.percentile(\[10, 90\]), '', True),  
            geometry=self.geometry,  
            scale=scale,  
            maxPixels=1e9,  
            bestEffort=True  
        ).getInfo()  
        return stats  
      
    def \_compute\_valid\_pixel\_percent(self, image: ee.Image, scale: int \= 10\) \-\> float:  
        mask \= image.select(0).mask()  
        coverage \= mask.reduceRegion(  
            reducer=ee.Reducer.mean(),  
            geometry=self.geometry,  
            scale=scale,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
        vals \= list(coverage.values())  
        return round((vals\[0\] if vals else 0\) \* 100, 1\)  
\`\`\`

\#\#\# 6.3 Module 1: NDVI Module

\`\`\`python  
\# modules/ndvi\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult  
from modules.cloud\_masking import mask\_s2\_clouds

class NDVIModule(BaseAnalysisModule):  
    """  
    NDVI \= (NIR \- Red) / (NIR \+ Red)  
    Range: \-1 to \+1  
    Healthy vegetation: \> 0.3  
    Sparse vegetation: 0.1 \- 0.3  
    Bare soil/water: \< 0.1  
      
    Uses: Sentinel-2 Band 8 (NIR, 10m) and Band 4 (Red, 10m)  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# Fetch cloud-masked Sentinel-2 composite  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(mask\_s2\_clouds)  
        )  
          
        image\_count \= s2.size().getInfo()  
        if image\_count \== 0:  
            return AnalysisResult(  
                module\_name='NDVI',  
                indicators={},  
                metadata={'error': 'No clear imagery available'},  
                quality\_score=0.0,  
                interpretation='Insufficient cloud-free imagery for this period.',  
                datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\]  
            )  
          
        composite \= s2.median().clip(self.geometry)  
          
        \# Compute NDVI  
        ndvi \= composite.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
          
        \# Zonal statistics  
        stats \= self.\_zonal\_stats(ndvi, 'NDVI', scale=10)  
          
        \# Coverage quality  
        valid\_pct \= self.\_compute\_valid\_pixel\_percent(ndvi, scale=10)  
          
        \# Classification histogram (what % is each NDVI class)  
        classification \= self.\_classify\_ndvi\_zones(ndvi)  
          
        \# Export raster tile for Leaflet  
        raster\_path \= self.\_export\_ndvi\_raster(ndvi)  
        thumbnail\_path \= self.\_export\_ndvi\_thumbnail(ndvi)  
          
        \# Interpret results  
        mean\_ndvi \= stats.get('NDVI\_mean', 0\)  
        interpretation \= self.\_interpret\_ndvi(mean\_ndvi, classification)  
        risk\_flags \= self.\_check\_ndvi\_risks(mean\_ndvi, classification)  
          
        return AnalysisResult(  
            module\_name='NDVI',  
            indicators={  
                'ndvi\_mean': round(stats.get('NDVI\_mean', 0), 4),  
                'ndvi\_min': round(stats.get('NDVI\_min', 0), 4),  
                'ndvi\_max': round(stats.get('NDVI\_max', 0), 4),  
                'ndvi\_std\_dev': round(stats.get('NDVI\_stdDev', 0), 4),  
                'ndvi\_median': round(stats.get('NDVI\_median', 0), 4),  
                'ndvi\_p10': round(stats.get('NDVI\_p10', 0), 4),  
                'ndvi\_p90': round(stats.get('NDVI\_p90', 0), 4),  
                'green\_cover\_percent': classification.get('healthy\_vegetation', 0),  
                'sparse\_cover\_percent': classification.get('sparse\_vegetation', 0),  
                'bare\_soil\_percent': classification.get('bare\_soil', 0),  
                'water\_percent': classification.get('water', 0),  
            },  
            metadata={  
                'image\_count': image\_count,  
                'cloud\_threshold': 25,  
                'composite\_method': 'median',  
                'resolution\_m': 10,  
                'valid\_pixel\_percent': valid\_pct,  
                'classification': classification,  
            },  
            raster\_paths={'ndvi\_heatmap': raster\_path},  
            thumbnail\_paths={'ndvi\_thumbnail': thumbnail\_path},  
            quality\_score=min(valid\_pct / 100.0, 1.0),  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\],  
            confidence=self.\_compute\_confidence(image\_count, valid\_pct),  
        )  
      
    def \_classify\_ndvi\_zones(self, ndvi: ee.Image) \-\> dict:  
        """Classify NDVI into ecological zones and compute area percentages."""  
        \# Water: \< 0  
        \# Bare soil: 0 \- 0.1  
        \# Sparse vegetation: 0.1 \- 0.3  
        \# Moderate vegetation: 0.3 \- 0.5  
        \# Healthy vegetation: \> 0.5  
          
        total\_area \= self.geometry.area()  
          
        water \= ndvi.lt(0).selfMask().multiply(ee.Image.pixelArea())  
        bare \= ndvi.gte(0).And(ndvi.lt(0.1)).selfMask().multiply(ee.Image.pixelArea())  
        sparse \= ndvi.gte(0.1).And(ndvi.lt(0.3)).selfMask().multiply(ee.Image.pixelArea())  
        moderate \= ndvi.gte(0.3).And(ndvi.lt(0.5)).selfMask().multiply(ee.Image.pixelArea())  
        healthy \= ndvi.gte(0.5).selfMask().multiply(ee.Image.pixelArea())  
          
        def get\_pct(zone\_image):  
            area \= zone\_image.reduceRegion(  
                reducer=ee.Reducer.sum(),  
                geometry=self.geometry,  
                scale=10,  
                maxPixels=1e8,  
                bestEffort=True  
            ).getInfo()  
            vals \= list(area.values())  
            zone\_area \= vals\[0\] if vals else 0  
            total \= total\_area.getInfo()  
            return round((zone\_area / total) \* 100, 1\) if total \> 0 else 0  
          
        return {  
            'water': get\_pct(water),  
            'bare\_soil': get\_pct(bare),  
            'sparse\_vegetation': get\_pct(sparse),  
            'moderate\_vegetation': get\_pct(moderate),  
            'healthy\_vegetation': get\_pct(healthy),  
        }  
      
    def \_interpret\_ndvi(self, mean\_ndvi: float, classification: dict) \-\> str:  
        if mean\_ndvi \> 0.5:  
            return f"Site shows healthy vegetation cover (mean NDVI: {mean\_ndvi:.3f}). {classification.get('healthy\_vegetation', 0)}% of the area has dense vegetation."  
        elif mean\_ndvi \> 0.3:  
            return f"Site shows moderate vegetation cover (mean NDVI: {mean\_ndvi:.3f}). Recovery indicators are present with {classification.get('moderate\_vegetation', 0)}% moderate and {classification.get('healthy\_vegetation', 0)}% healthy vegetation."  
        elif mean\_ndvi \> 0.1:  
            return f"Site shows sparse vegetation (mean NDVI: {mean\_ndvi:.3f}). {classification.get('bare\_soil', 0)}% bare soil detected. Active restoration efforts should focus on ground cover establishment."  
        else:  
            return f"Site is predominantly barren or water-covered (mean NDVI: {mean\_ndvi:.3f}). {classification.get('bare\_soil', 0)}% bare soil and {classification.get('water', 0)}% water detected."  
      
    def \_check\_ndvi\_risks(self, mean\_ndvi: float, classification: dict) \-\> list:  
        flags \= \[\]  
        if mean\_ndvi \< 0.1:  
            flags.append({  
                'type': 'LOW\_VEGETATION',  
                'severity': 'HIGH',  
                'description': 'Critically low vegetation cover detected'  
            })  
        if classification.get('bare\_soil', 0\) \> 60:  
            flags.append({  
                'type': 'HIGH\_BARE\_SOIL',  
                'severity': 'MODERATE',  
                'description': f"{classification\['bare\_soil'\]}% bare soil increases erosion risk"  
            })  
        return flags  
      
    def \_export\_ndvi\_raster(self, ndvi: ee.Image) \-\> str:  
        """Export NDVI as GeoTIFF for tile generation."""  
        url \= ndvi.getDownloadURL({  
            'scale': 10,  
            'crs': 'EPSG:4326',  
            'region': self.geometry,  
            'format': 'GEO\_TIFF',  
        })  
        filepath \= f"{self.export\_path}/{self.project\_id}/ndvi\_{self.date\_end}.tif"  
        \# Download logic with requests  
        return filepath  
      
    def \_export\_ndvi\_thumbnail(self, ndvi: ee.Image) \-\> str:  
        """Generate NDVI visualization thumbnail."""  
        vis\_params \= {  
            'min': \-0.2, 'max': 0.8,  
            'palette': \['\#d73027', '\#fc8d59', '\#fee08b', '\#d9ef8b', '\#91cf60', '\#1a9850'\],  
            'region': self.geometry,  
            'dimensions': '1024x1024',  
            'format': 'png'  
        }  
        url \= ndvi.getThumbURL(vis\_params)  
        filepath \= f"{self.export\_path}/{self.project\_id}/ndvi\_thumb\_{self.date\_end}.png"  
        \# Download and save  
        return filepath  
      
    def \_compute\_confidence(self, image\_count: int, valid\_pct: float) \-\> float:  
        img\_conf \= min(image\_count / 10, 1.0) \* 0.4  
        pix\_conf \= (valid\_pct / 100.0) \* 0.6  
        return round(img\_conf \+ pix\_conf, 2\)  
\`\`\`

\#\#\# 6.4 Module 2: Vegetation Health Module

\`\`\`python  
\# modules/vegetation\_health\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult  
from modules.cloud\_masking import mask\_s2\_clouds

class VegetationHealthModule(BaseAnalysisModule):  
    """  
    Multi-index vegetation health assessment combining:  
    \- NDVI (general greenness)  
    \- EVI (Enhanced Vegetation Index \- better in dense canopy)  
    \- SAVI (Soil Adjusted Vegetation Index \- better for sparse cover/barren land)  
    \- NDMI (Normalized Difference Moisture Index \- plant water stress)  
    \- LAI proxy (Leaf Area Index estimation)  
      
    Produces composite Vegetation Health Score (VHS): 0-100  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(mask\_s2\_clouds)  
        )  
          
        image\_count \= s2.size().getInfo()  
        if image\_count \== 0:  
            return self.\_empty\_result('No clear imagery')  
          
        composite \= s2.median().clip(self.geometry)  
          
        \# NDVI  
        ndvi \= composite.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
          
        \# EVI: Enhanced Vegetation Index  
        \# EVI \= 2.5 \* (NIR \- Red) / (NIR \+ 6\*Red \- 7.5\*Blue \+ 1\)  
        evi \= composite.expression(  
            '2.5 \* ((NIR \- RED) / (NIR \+ 6 \* RED \- 7.5 \* BLUE \+ 1))', {  
                'NIR': composite.select('B8'),  
                'RED': composite.select('B4'),  
                'BLUE': composite.select('B2')  
            }  
        ).rename('EVI')  
          
        \# SAVI: Soil Adjusted Vegetation Index (L \= 0.5)  
        \# SAVI \= ((NIR \- Red) / (NIR \+ Red \+ L)) \* (1 \+ L)  
        savi \= composite.expression(  
            '((NIR \- RED) / (NIR \+ RED \+ 0.5)) \* 1.5', {  
                'NIR': composite.select('B8'),  
                'RED': composite.select('B4')  
            }  
        ).rename('SAVI')  
          
        \# NDMI: Plant moisture stress  
        \# NDMI \= (NIR \- SWIR1) / (NIR \+ SWIR1)  
        ndmi \= composite.normalizedDifference(\['B8', 'B11'\]).rename('NDMI')  
          
        \# LAI Proxy using empirical relationship with EVI  
        \# LAI ≈ 3.618 \* EVI \- 0.118 (simplified empirical model)  
        lai \= evi.multiply(3.618).subtract(0.118).rename('LAI\_proxy')  
          
        \# Green Chlorophyll Index  
        \# GCI \= (NIR / Green) \- 1  
        gci \= composite.select('B8').divide(composite.select('B3')).subtract(1).rename('GCI')  
          
        \# Compute statistics for all  
        stacked \= ndvi.addBands(\[evi, savi, ndmi, lai, gci\])  
          
        ndvi\_stats \= self.\_zonal\_stats(stacked, 'NDVI')  
        evi\_stats \= self.\_zonal\_stats(stacked, 'EVI')  
        savi\_stats \= self.\_zonal\_stats(stacked, 'SAVI')  
        ndmi\_stats \= self.\_zonal\_stats(stacked, 'NDMI')  
        lai\_stats \= self.\_zonal\_stats(stacked, 'LAI\_proxy')  
        gci\_stats \= self.\_zonal\_stats(stacked, 'GCI')  
          
        \# Compute Vegetation Health Score (0-100)  
        vhs \= self.\_compute\_vhs(  
            ndvi\_mean=ndvi\_stats.get('NDVI\_mean', 0),  
            evi\_mean=evi\_stats.get('EVI\_mean', 0),  
            savi\_mean=savi\_stats.get('SAVI\_mean', 0),  
            ndmi\_mean=ndmi\_stats.get('NDMI\_mean', 0),  
        )  
          
        interpretation \= self.\_interpret\_health(vhs, ndvi\_stats, ndmi\_stats)  
        risk\_flags \= self.\_check\_health\_risks(vhs, ndmi\_stats)  
          
        return AnalysisResult(  
            module\_name='VEGETATION\_HEALTH',  
            indicators={  
                'ndvi\_mean': round(ndvi\_stats.get('NDVI\_mean', 0), 4),  
                'evi\_mean': round(evi\_stats.get('EVI\_mean', 0), 4),  
                'savi\_mean': round(savi\_stats.get('SAVI\_mean', 0), 4),  
                'ndmi\_mean': round(ndmi\_stats.get('NDMI\_mean', 0), 4),  
                'lai\_proxy\_mean': round(lai\_stats.get('LAI\_proxy\_mean', 0), 2),  
                'gci\_mean': round(gci\_stats.get('GCI\_mean', 0), 2),  
                'vegetation\_health\_score': vhs,  
            },  
            metadata={  
                'image\_count': image\_count,  
                'resolution\_m': 10,  
                'index\_descriptions': {  
                    'NDVI': 'General vegetation greenness (0-1)',  
                    'EVI': 'Enhanced index, better in dense canopy (-1 to 1)',  
                    'SAVI': 'Soil-adjusted, better for sparse areas (-1 to 1)',  
                    'NDMI': 'Plant water stress indicator (-1 to 1)',  
                    'LAI\_proxy': 'Estimated Leaf Area Index (m²/m²)',  
                    'GCI': 'Green Chlorophyll Index, photosynthetic capacity',  
                }  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\],  
            confidence=self.\_compute\_confidence(image\_count,   
                                                self.\_compute\_valid\_pixel\_percent(ndvi)),  
        )  
      
    def \_compute\_vhs(self, ndvi\_mean, evi\_mean, savi\_mean, ndmi\_mean) \-\> float:  
        """  
        Composite Vegetation Health Score (0-100).  
        Weighted blend of normalized indices.  
        """  
        \# Normalize each index to 0-100 range  
        ndvi\_score \= max(0, min(100, ((ndvi\_mean \+ 0.2) / 1.0) \* 100))  
        evi\_score \= max(0, min(100, ((evi\_mean \+ 0.2) / 0.8) \* 100))  
        savi\_score \= max(0, min(100, ((savi\_mean \+ 0.2) / 0.9) \* 100))  
        ndmi\_score \= max(0, min(100, ((ndmi\_mean \+ 0.5) / 1.0) \* 100))  
          
        \# Weighted average  
        vhs \= (ndvi\_score \* 0.35 \+ evi\_score \* 0.25 \+   
               savi\_score \* 0.20 \+ ndmi\_score \* 0.20)  
          
        return round(max(0, min(100, vhs)), 1\)  
      
    def \_interpret\_health(self, vhs, ndvi\_stats, ndmi\_stats) \-\> str:  
        if vhs \>= 70:  
            return f"Vegetation health is GOOD (VHS: {vhs}/100). Strong photosynthetic activity detected with adequate moisture levels."  
        elif vhs \>= 45:  
            return f"Vegetation health is MODERATE (VHS: {vhs}/100). Partial canopy recovery observed. NDMI suggests {'adequate' if ndmi\_stats.get('NDMI\_mean', 0\) \> 0 else 'stressed'} moisture conditions."  
        elif vhs \>= 20:  
            return f"Vegetation health is POOR (VHS: {vhs}/100). Sparse or stressed vegetation. {'Water stress detected.' if ndmi\_stats.get('NDMI\_mean', 0\) \< \-0.1 else 'Low vegetation density.'}"  
        else:  
            return f"Vegetation health is CRITICAL (VHS: {vhs}/100). Minimal vegetation present. Site requires active intervention."  
      
    def \_check\_health\_risks(self, vhs, ndmi\_stats) \-\> list:  
        flags \= \[\]  
        if vhs \< 20:  
            flags.append({'type': 'CRITICAL\_VEGETATION\_LOSS', 'severity': 'CRITICAL',  
                          'description': 'Vegetation health critically low'})  
        if ndmi\_stats.get('NDMI\_mean', 0\) \< \-0.2:  
            flags.append({'type': 'WATER\_STRESS', 'severity': 'HIGH',  
                          'description': 'Significant plant water stress detected'})  
        if vhs \< 45 and ndmi\_stats.get('NDMI\_mean', 0\) \< 0:  
            flags.append({'type': 'DEGRADATION\_RISK', 'severity': 'MODERATE',  
                          'description': 'Combined low vegetation and moisture stress indicates degradation risk'})  
        return flags  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='VEGETATION\_HEALTH',  
            indicators={}, metadata={'error': reason},  
            quality\_score=0.0, interpretation=f'Analysis unavailable: {reason}',  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\]  
        )  
\`\`\`

\#\#\# 6.5 Module 3: Water & Moisture Analysis Module

\`\`\`python  
\# modules/water\_moisture\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class WaterMoistureModule(BaseAnalysisModule):  
    """  
    Multi-sensor water and moisture analysis:  
      
    1\. NDWI (Optical) \- Surface water detection using Sentinel-2  
       NDWI \= (Green \- NIR) / (Green \+ NIR)  
      
    2\. MNDWI (Modified NDWI) \- Better water/built-up discrimination  
       MNDWI \= (Green \- SWIR) / (Green \+ SWIR)  
      
    3\. NDMI (Moisture Index) \- Vegetation moisture content  
       NDMI \= (NIR \- SWIR1) / (NIR \+ SWIR1)  
      
    4\. SAR Water Detection (Sentinel-1) \- All-weather water mapping  
       VV backscatter \< \-15 dB threshold for open water  
      
    5\. JRC Global Surface Water \- Historical water occurrence  
      
    Critical for: Lake restoration, wetland recovery  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        indicators \= {}  
        metadata \= {}  
        risk\_flags \= \[\]  
          
        \# \=== PART 1: Optical water indices (Sentinel-2) \===  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        ndwi \= s2.normalizedDifference(\['B3', 'B8'\]).rename('NDWI')  
        mndwi \= s2.normalizedDifference(\['B3', 'B11'\]).rename('MNDWI')  
        ndmi \= s2.normalizedDifference(\['B8', 'B11'\]).rename('NDMI')  
          
        ndwi\_stats \= self.\_zonal\_stats(ndwi, 'NDWI')  
        mndwi\_stats \= self.\_zonal\_stats(mndwi, 'MNDWI')  
        ndmi\_stats \= self.\_zonal\_stats(ndmi, 'NDMI')  
          
        \# Water area percentage (MNDWI \> 0 typically indicates water)  
        water\_mask \= mndwi.gt(0).selfMask()  
        water\_area \= water\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(),  
            geometry=self.geometry,  
            scale=10,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
        total\_area \= self.geometry.area().getInfo()  
        water\_pct \= (list(water\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        indicators.update({  
            'ndwi\_mean': round(ndwi\_stats.get('NDWI\_mean', 0), 4),  
            'mndwi\_mean': round(mndwi\_stats.get('MNDWI\_mean', 0), 4),  
            'ndmi\_mean': round(ndmi\_stats.get('NDMI\_mean', 0), 4),  
            'ndmi\_min': round(ndmi\_stats.get('NDMI\_min', 0), 4),  
            'surface\_water\_area\_percent': round(water\_pct, 2),  
        })  
          
        \# \=== PART 2: SAR-based water detection (Sentinel-1) \===  
        s1 \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select(\['VV', 'VH'\])  
            .median()  
            .clip(self.geometry)  
        )  
          
        vv\_stats \= self.\_zonal\_stats(s1, 'VV')  
        vh\_stats \= self.\_zonal\_stats(s1, 'VH')  
          
        \# SAR water mask: VV \< \-15 dB generally indicates open water  
        sar\_water \= s1.select('VV').lt(-15).selfMask()  
        sar\_water\_area \= sar\_water.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(),  
            geometry=self.geometry,  
            scale=10,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
        sar\_water\_pct \= (list(sar\_water\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        indicators.update({  
            'sar\_vv\_mean\_db': round(vv\_stats.get('VV\_mean', 0), 2),  
            'sar\_vh\_mean\_db': round(vh\_stats.get('VH\_mean', 0), 2),  
            'sar\_water\_area\_percent': round(sar\_water\_pct, 2),  
        })  
          
        \# \=== PART 3: JRC Historical Water Surface \===  
        jrc \= ee.Image('JRC/GSW1\_4/GlobalSurfaceWater')  
        occurrence \= jrc.select('occurrence').clip(self.geometry)  
          
        occ\_stats \= self.\_zonal\_stats(occurrence, 'occurrence', scale=30)  
          
        \# Seasonal water \= occurrence 25-75%, Permanent water \= occurrence \> 75%  
        seasonal\_water \= occurrence.gte(25).And(occurrence.lt(75)).selfMask()  
        permanent\_water \= occurrence.gte(75).selfMask()  
          
        seasonal\_area \= seasonal\_water.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=30, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
        permanent\_area \= permanent\_water.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=30, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
          
        seasonal\_pct \= (list(seasonal\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
        permanent\_pct \= (list(permanent\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        indicators.update({  
            'jrc\_water\_occurrence\_mean': round(occ\_stats.get('occurrence\_mean', 0), 1),  
            'seasonal\_water\_percent': round(seasonal\_pct, 2),  
            'permanent\_water\_percent': round(permanent\_pct, 2),  
            'historical\_water\_coverage': round(seasonal\_pct \+ permanent\_pct, 2),  
        })  
          
        \# \=== Risk assessment \===  
        if water\_pct \< 5 and permanent\_pct \> 20:  
            risk\_flags.append({  
                'type': 'WATER\_LOSS',  
                'severity': 'HIGH',  
                'description': f'Current water ({water\_pct:.1f}%) significantly below historical ({permanent\_pct:.1f}%). Possible water body shrinkage.'  
            })  
          
        if ndmi\_stats.get('NDMI\_mean', 0\) \< \-0.2:  
            risk\_flags.append({  
                'type': 'MOISTURE\_STRESS',  
                'severity': 'MODERATE',  
                'description': 'Low soil/vegetation moisture detected. May impact restoration success.'  
            })  
          
        interpretation \= self.\_build\_interpretation(indicators)  
          
        return AnalysisResult(  
            module\_name='WATER\_MOISTURE',  
            indicators=indicators,  
            metadata={  
                'optical\_source': 'Sentinel-2 SR Harmonized',  
                'sar\_source': 'Sentinel-1 GRD',  
                'historical\_source': 'JRC Global Surface Water v1.4',  
                'water\_thresholds': {  
                    'mndwi\_water\_threshold': 0.0,  
                    'sar\_vv\_water\_threshold\_db': \-15,  
                    'jrc\_seasonal\_min': 25,  
                    'jrc\_permanent\_min': 75,  
                }  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\[  
                'COPERNICUS/S2\_SR\_HARMONIZED',  
                'COPERNICUS/S1\_GRD',  
                'JRC/GSW1\_4/GlobalSurfaceWater'  
            \],  
            confidence=0.8,  
        )  
      
    def \_build\_interpretation(self, ind) \-\> str:  
        parts \= \[\]  
        water\_pct \= ind.get('surface\_water\_area\_percent', 0\)  
        hist\_water \= ind.get('historical\_water\_coverage', 0\)  
        ndmi \= ind.get('ndmi\_mean', 0\)  
          
        if water\_pct \> 20:  
            parts.append(f"Significant surface water detected ({water\_pct:.1f}% of site).")  
        elif water\_pct \> 5:  
            parts.append(f"Moderate surface water presence ({water\_pct:.1f}% of site).")  
        else:  
            parts.append(f"Minimal surface water ({water\_pct:.1f}%).")  
          
        if hist\_water \> water\_pct \+ 10:  
            parts.append(f"Historical water extent ({hist\_water:.1f}%) exceeds current, suggesting water recession.")  
        elif water\_pct \> hist\_water \+ 10:  
            parts.append(f"Current water exceeds historical norms, possibly indicating flooding or restoration success.")  
          
        if ndmi \> 0.1:  
            parts.append("Vegetation moisture levels are healthy.")  
        elif ndmi \> \-0.1:  
            parts.append("Moderate vegetation moisture levels.")  
        else:  
            parts.append("Low vegetation moisture — possible drought stress.")  
          
        return " ".join(parts)  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.6 Module 4: Flood Analysis Module

\`\`\`python  
\# modules/flood\_analysis\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class FloodAnalysisModule(BaseAnalysisModule):  
    """  
    Flood extent and frequency analysis using:  
    1\. Sentinel-1 SAR (all-weather flood mapping)  
    2\. JRC Global Surface Water (historical flood frequency)  
    3\. MODIS NRT Flood (near-real-time alerts, when available)  
      
    SAR advantage: Penetrates clouds, critical during flood events  
      
    Method: Change detection between dry-period reference and   
    analysis period SAR backscatter. VV decrease \> 3dB indicates flooding.  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# Reference dry period (3 months before analysis)  
        from datetime import datetime, timedelta  
        analysis\_start \= datetime.fromisoformat(self.date\_start)  
        ref\_end \= analysis\_start \- timedelta(days=30)  
        ref\_start \= ref\_end \- timedelta(days=90)  
          
        \# Dry reference composite  
        ref\_collection \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(ref\_start.strftime('%Y-%m-%d'), ref\_end.strftime('%Y-%m-%d'))  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select('VV')  
        )  
          
        ref\_composite \= ref\_collection.median().clip(self.geometry)  
          
        \# Analysis period composite  
        analysis\_collection \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select('VV')  
        )  
          
        analysis\_composite \= analysis\_collection.median().clip(self.geometry)  
          
        \# Change detection: decrease in VV backscatter indicates flooding  
        vv\_diff \= ref\_composite.subtract(analysis\_composite).rename('VV\_change')  
          
        \# Flood mask: VV decreased by more than 3 dB  
        flood\_mask \= vv\_diff.gt(3).selfMask()  
          
        \# Compute flood extent  
        total\_area \= self.geometry.area().getInfo()  
        flood\_area \= flood\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(),  
            geometry=self.geometry,  
            scale=10,  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
          
        flood\_area\_val \= list(flood\_area.values())\[0\] if flood\_area else 0  
        flood\_pct \= (flood\_area\_val / total\_area \* 100\) if total\_area \> 0 else 0  
          
        \# JRC Flood recurrence  
        jrc \= ee.Image('JRC/GSW1\_4/GlobalSurfaceWater')  
        recurrence \= jrc.select('recurrence').clip(self.geometry)  
        recurrence\_stats \= self.\_zonal\_stats(recurrence, 'recurrence', scale=30)  
          
        \# JRC transition classification  
        transition \= jrc.select('transition').clip(self.geometry)  
        \# Transition values: 0=no change, 1=permanent, 2=new permanent,   
        \# 3=lost permanent, 4=seasonal, 5=new seasonal, etc.  
          
        interpretation \= self.\_interpret\_flood(flood\_pct, recurrence\_stats)  
        risk\_flags \= self.\_assess\_flood\_risk(flood\_pct, recurrence\_stats)  
          
        return AnalysisResult(  
            module\_name='FLOOD\_ANALYSIS',  
            indicators={  
                'current\_flood\_extent\_percent': round(flood\_pct, 2),  
                'current\_flood\_area\_ha': round(flood\_area\_val / 10000, 2),  
                'vv\_change\_mean\_db': round(self.\_zonal\_stats(vv\_diff, 'VV\_change').get('VV\_change\_mean', 0), 2),  
                'flood\_recurrence\_mean': round(recurrence\_stats.get('recurrence\_mean', 0), 1),  
                'flood\_recurrence\_max': round(recurrence\_stats.get('recurrence\_max', 0), 1),  
            },  
            metadata={  
                'method': 'SAR change detection (VV polarization)',  
                'reference\_period': f'{ref\_start.strftime("%Y-%m-%d")} to {ref\_end.strftime("%Y-%m-%d")}',  
                'flood\_threshold\_db': 3.0,  
                'ref\_images': ref\_collection.size().getInfo(),  
                'analysis\_images': analysis\_collection.size().getInfo(),  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S1\_GRD', 'JRC/GSW1\_4/GlobalSurfaceWater'\],  
            confidence=0.75,  
        )  
      
    def \_interpret\_flood(self, flood\_pct, recurrence\_stats):  
        if flood\_pct \> 30:  
            return f"Significant flooding detected over {flood\_pct:.1f}% of the site. This may represent active inundation or seasonal water expansion."  
        elif flood\_pct \> 10:  
            return f"Moderate flood extent ({flood\_pct:.1f}%). Partial waterlogging consistent with wetland or lake fringe dynamics."  
        elif flood\_pct \> 2:  
            return f"Minor flood signals ({flood\_pct:.1f}%). Localized wet areas detected."  
        else:  
            return "No significant flooding detected in the analysis period."  
      
    def \_assess\_flood\_risk(self, flood\_pct, recurrence\_stats):  
        flags \= \[\]  
        rec\_mean \= recurrence\_stats.get('recurrence\_mean', 0\)  
          
        if flood\_pct \> 30:  
            flags.append({'type': 'ACTIVE\_FLOODING', 'severity': 'HIGH',  
                          'description': f'{flood\_pct:.1f}% of site showing flood signatures'})  
        if rec\_mean \> 50:  
            flags.append({'type': 'HIGH\_FLOOD\_FREQUENCY', 'severity': 'MODERATE',  
                          'description': f'Historical flood recurrence {rec\_mean:.0f}% — site prone to regular inundation'})  
        return flags  
\`\`\`

\#\#\# 6.7 Module 5: Historical Degradation Module

\`\`\`python  
\# modules/historical\_degradation\_module.py  
import ee  
import numpy as np  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class HistoricalDegradationModule(BaseAnalysisModule):  
    """  
    Reconstructs degradation history over 5-10 years using:  
    \- Annual NDVI composites from Sentinel-2 (2017-present) and Landsat 8/9 (2013-present)  
    \- Land cover change from Dynamic World annual composites  
    \- Linear regression trend analysis  
    \- Breakpoint detection for sudden degradation events  
      
    Critical for establishing pre-restoration baseline and   
    demonstrating restoration need.  
    """  
      
    def \_\_init\_\_(self, geometry, date\_start, date\_end, project\_id, export\_path,  
                 lookback\_years=7):  
        super().\_\_init\_\_(geometry, date\_start, date\_end, project\_id, export\_path)  
        self.lookback\_years \= lookback\_years  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        current\_year \= int(self.date\_end\[:4\])  
        start\_year \= current\_year \- self.lookback\_years  
          
        \# Build annual NDVI time series  
        ndvi\_timeline \= \[\]  
        for year in range(start\_year, current\_year \+ 1):  
            annual\_ndvi \= self.\_get\_annual\_ndvi(year)  
            if annual\_ndvi is not None:  
                ndvi\_timeline.append(annual\_ndvi)  
          
        if len(ndvi\_timeline) \< 3:  
            return self.\_empty\_result('Insufficient historical data')  
          
        \# Trend analysis  
        years \= np.array(\[p\['year'\] for p in ndvi\_timeline\])  
        values \= np.array(\[p\['ndvi\_mean'\] for p in ndvi\_timeline\])  
          
        \# Linear regression  
        coeffs \= np.polyfit(years, values, 1\)  
        trend\_per\_year \= float(coeffs\[0\])  
        r\_squared \= float(np.corrcoef(years, values)\[0, 1\] \*\* 2\)  
          
        \# Breakpoint detection (simple: largest year-over-year drop)  
        diffs \= np.diff(values)  
        worst\_drop\_idx \= np.argmin(diffs)  
        worst\_drop\_year \= int(years\[worst\_drop\_idx \+ 1\])  
        worst\_drop\_magnitude \= float(diffs\[worst\_drop\_idx\])  
          
        \# Overall degradation assessment  
        peak\_ndvi \= float(np.max(values))  
        peak\_year \= int(years\[np.argmax(values)\])  
        current\_ndvi \= float(values\[-1\])  
        total\_change \= current\_ndvi \- peak\_ndvi  
        total\_change\_pct \= (total\_change / peak\_ndvi \* 100\) if peak\_ndvi \!= 0 else 0  
          
        \# Classify degradation severity  
        if total\_change\_pct \< \-30:  
            degradation\_class \= 'SEVERE'  
        elif total\_change\_pct \< \-15:  
            degradation\_class \= 'MODERATE'  
        elif total\_change\_pct \< \-5:  
            degradation\_class \= 'MILD'  
        elif total\_change\_pct \> 5:  
            degradation\_class \= 'RECOVERING'  
        else:  
            degradation\_class \= 'STABLE'  
          
        \# Trend direction  
        if trend\_per\_year \> 0.01:  
            trend\_direction \= 'IMPROVING'  
        elif trend\_per\_year \< \-0.01:  
            trend\_direction \= 'DECLINING'  
        else:  
            trend\_direction \= 'STABLE'  
          
        interpretation \= self.\_interpret(  
            degradation\_class, trend\_direction, peak\_year, peak\_ndvi,  
            current\_ndvi, total\_change\_pct, worst\_drop\_year, worst\_drop\_magnitude  
        )  
          
        risk\_flags \= \[\]  
        if degradation\_class in \['SEVERE', 'MODERATE'\]:  
            risk\_flags.append({  
                'type': 'HISTORICAL\_DEGRADATION',  
                'severity': 'HIGH' if degradation\_class \== 'SEVERE' else 'MODERATE',  
                'description': f'{degradation\_class} degradation from {peak\_year} peak. NDVI declined {abs(total\_change\_pct):.1f}%.'  
            })  
        if abs(worst\_drop\_magnitude) \> 0.1:  
            risk\_flags.append({  
                'type': 'SUDDEN\_DECLINE\_EVENT',  
                'severity': 'MODERATE',  
                'description': f'Sharp NDVI drop of {worst\_drop\_magnitude:.3f} detected in {worst\_drop\_year}. Possible disturbance event.'  
            })  
          
        return AnalysisResult(  
            module\_name='HISTORICAL\_DEGRADATION',  
            indicators={  
                'peak\_ndvi': round(peak\_ndvi, 4),  
                'peak\_year': peak\_year,  
                'current\_ndvi': round(current\_ndvi, 4),  
                'total\_ndvi\_change': round(total\_change, 4),  
                'total\_change\_percent': round(total\_change\_pct, 1),  
                'trend\_per\_year': round(trend\_per\_year, 5),  
                'trend\_r\_squared': round(r\_squared, 3),  
                'trend\_direction': trend\_direction,  
                'degradation\_class': degradation\_class,  
                'worst\_decline\_year': worst\_drop\_year,  
                'worst\_decline\_magnitude': round(worst\_drop\_magnitude, 4),  
                'years\_analyzed': len(ndvi\_timeline),  
            },  
            metadata={  
                'ndvi\_timeline': ndvi\_timeline,  
                'lookback\_years': self.lookback\_years,  
                'analysis\_period': f'{start\_year}-{current\_year}',  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED', 'LANDSAT/LC08/C02/T1\_L2'\],  
            confidence=min(r\_squared \+ 0.3, 1.0),  
        )  
      
    def \_get\_annual\_ndvi(self, year: int) \-\> dict:  
        """Get annual median NDVI for a given year."""  
        \# Try Sentinel-2 first (2017+), fall back to Landsat 8  
        if year \>= 2017:  
            collection \= (  
                ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
                .filterBounds(self.geometry)  
                .filterDate(f'{year}-01-01', f'{year}-12-31')  
                .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 30))  
                .map(self.\_mask\_s2\_clouds)  
            )  
            nir, red \= 'B8', 'B4'  
            source \= 'Sentinel-2'  
        else:  
            collection \= (  
                ee.ImageCollection('LANDSAT/LC08/C02/T1\_L2')  
                .filterBounds(self.geometry)  
                .filterDate(f'{year}-01-01', f'{year}-12-31')  
                .map(self.\_mask\_landsat\_clouds)  
            )  
            nir, red \= 'SR\_B5', 'SR\_B4'  
            source \= 'Landsat-8'  
          
        count \= collection.size().getInfo()  
        if count \== 0:  
            return None  
          
        composite \= collection.median().clip(self.geometry)  
        ndvi \= composite.normalizedDifference(\[nir, red\]).rename('NDVI')  
          
        stats \= ndvi.reduceRegion(  
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True),  
            geometry=self.geometry,  
            scale=30,  \# Use 30m for consistency across sensors  
            maxPixels=1e8,  
            bestEffort=True  
        ).getInfo()  
          
        return {  
            'year': year,  
            'ndvi\_mean': round(stats.get('NDVI\_mean', 0), 4),  
            'ndvi\_stddev': round(stats.get('NDVI\_stdDev', 0), 4),  
            'image\_count': count,  
            'source': source,  
        }  
      
    def \_interpret(self, deg\_class, trend, peak\_year, peak\_ndvi,   
                   current\_ndvi, change\_pct, worst\_year, worst\_drop):  
        msg \= f"Historical analysis ({self.lookback\_years}-year lookback): "  
        msg \+= f"Peak vegetation was in {peak\_year} (NDVI: {peak\_ndvi:.3f}). "  
        msg \+= f"Current NDVI: {current\_ndvi:.3f} ({change\_pct:+.1f}% from peak). "  
          
        if deg\_class \== 'SEVERE':  
            msg \+= "SEVERE degradation detected — site has lost significant vegetation cover. "  
        elif deg\_class \== 'MODERATE':  
            msg \+= "MODERATE degradation detected — notable vegetation decline from historical levels. "  
        elif deg\_class \== 'RECOVERING':  
            msg \+= "Site appears to be in RECOVERY — vegetation improving from lowest levels. "  
        else:  
            msg \+= f"Site classified as {deg\_class}. "  
          
        if abs(worst\_drop) \> 0.05:  
            msg \+= f"A sharp decline occurred in {worst\_year} (NDVI drop: {worst\_drop:.3f}), possibly due to a disturbance event."  
          
        return msg  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
      
    def \_mask\_landsat\_clouds(self, image):  
        qa \= image.select('QA\_PIXEL')  
        mask \= qa.bitwiseAnd(1 \<\< 3).eq(0).And(qa.bitwiseAnd(1 \<\< 4).eq(0))  
        return image.updateMask(mask).multiply(0.0000275).add(-0.2)  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='HISTORICAL\_DEGRADATION',  
            indicators={}, metadata={'error': reason},  
            quality\_score=0.0, interpretation=f'Historical analysis unavailable: {reason}',  
            datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.8 Module 6: Vegetation Recovery Tracker

\`\`\`python  
\# modules/vegetation\_recovery\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class VegetationRecoveryModule(BaseAnalysisModule):  
    """  
    Tracks restoration progress by comparing current state   
    against baseline across multiple indices.  
      
    Computes:  
    \- NDVI recovery rate (per month, per quarter)  
    \- Green cover area expansion  
    \- Bare soil reduction  
    \- Vegetation density improvement  
    \- Recovery trajectory classification  
    \- Estimated time to target recovery  
    """  
      
    def \_\_init\_\_(self, geometry, date\_start, date\_end, project\_id, export\_path,  
                 baseline\_snapshot: dict \= None):  
        super().\_\_init\_\_(geometry, date\_start, date\_end, project\_id, export\_path)  
        self.baseline \= baseline\_snapshot  \# {ndvi\_mean, ndwi\_mean, bare\_pct, green\_pct, date}  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        if not self.baseline:  
            return self.\_empty\_result('No baseline available for comparison')  
          
        \# Current period analysis  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        ndvi \= s2.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
        ndvi\_stats \= self.\_zonal\_stats(ndvi, 'NDVI')  
          
        current\_ndvi \= ndvi\_stats.get('NDVI\_mean', 0\)  
        baseline\_ndvi \= self.baseline.get('ndvi\_mean', 0\)  
          
        \# Absolute and relative change  
        ndvi\_change \= current\_ndvi \- baseline\_ndvi  
        ndvi\_change\_pct \= (ndvi\_change / abs(baseline\_ndvi) \* 100\) if baseline\_ndvi \!= 0 else 0  
          
        \# Green cover classification  
        green\_mask \= ndvi.gt(0.3).selfMask()  
        total\_area \= self.geometry.area().getInfo()  
        green\_area \= green\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=10, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
        green\_pct \= (list(green\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        \# Bare soil detection  
        bsi \= s2.expression(  
            '((SWIR \+ RED) \- (NIR \+ BLUE)) / ((SWIR \+ RED) \+ (NIR \+ BLUE))', {  
                'SWIR': s2.select('B11'), 'RED': s2.select('B4'),  
                'NIR': s2.select('B8'), 'BLUE': s2.select('B2')  
            }  
        ).rename('BSI')  
        bare\_mask \= bsi.gt(0.1).selfMask()  
        bare\_area \= bare\_mask.multiply(ee.Image.pixelArea()).reduceRegion(  
            reducer=ee.Reducer.sum(), geometry=self.geometry,  
            scale=10, maxPixels=1e8, bestEffort=True  
        ).getInfo()  
        bare\_pct \= (list(bare\_area.values())\[0\] / total\_area \* 100\) if total\_area \> 0 else 0  
          
        baseline\_green \= self.baseline.get('green\_cover\_percent', 0\)  
        baseline\_bare \= self.baseline.get('bare\_land\_percent', 100\)  
          
        green\_change \= green\_pct \- baseline\_green  
        bare\_change \= bare\_pct \- baseline\_bare  
          
        \# Recovery trajectory  
        from datetime import datetime  
        baseline\_date \= datetime.fromisoformat(self.baseline.get('date', self.date\_start))  
        current\_date \= datetime.fromisoformat(self.date\_end)  
        months\_elapsed \= max(1, (current\_date \- baseline\_date).days / 30.0)  
          
        ndvi\_recovery\_rate\_per\_month \= ndvi\_change / months\_elapsed  
          
        \# Trajectory classification  
        if ndvi\_change \> 0.1:  
            trajectory \= 'STRONG\_RECOVERY'  
        elif ndvi\_change \> 0.03:  
            trajectory \= 'MODERATE\_RECOVERY'  
        elif ndvi\_change \> \-0.03:  
            trajectory \= 'STABLE'  
        elif ndvi\_change \> \-0.1:  
            trajectory \= 'MODERATE\_DECLINE'  
        else:  
            trajectory \= 'SIGNIFICANT\_DECLINE'  
          
        \# Recovery score (0-100)  
        \# Based on how much the NDVI has improved relative to a "healthy" target (0.5)  
        target\_ndvi \= 0.5  
        if target\_ndvi \> baseline\_ndvi:  
            recovery\_progress \= max(0, (current\_ndvi \- baseline\_ndvi) / (target\_ndvi \- baseline\_ndvi) \* 100\)  
        else:  
            recovery\_progress \= 100  \# Already at/above target  
        recovery\_progress \= min(100, round(recovery\_progress, 1))  
          
        interpretation \= self.\_build\_interpretation(  
            ndvi\_change, ndvi\_change\_pct, green\_change, bare\_change,  
            trajectory, recovery\_progress, months\_elapsed  
        )  
          
        risk\_flags \= \[\]  
        if trajectory in \['MODERATE\_DECLINE', 'SIGNIFICANT\_DECLINE'\]:  
            risk\_flags.append({  
                'type': 'RESTORATION\_REGRESSION',  
                'severity': 'HIGH',  
                'description': f'Vegetation declining since baseline ({ndvi\_change\_pct:+.1f}%). Restoration may be at risk.'  
            })  
        if bare\_pct \> 60 and bare\_change \> 0:  
            risk\_flags.append({  
                'type': 'INCREASING\_BARE\_SOIL',  
                'severity': 'MODERATE',  
                'description': f'Bare soil increased to {bare\_pct:.1f}% from {baseline\_bare:.1f}%.'  
            })  
          
        return AnalysisResult(  
            module\_name='VEGETATION\_RECOVERY',  
            indicators={  
                'current\_ndvi\_mean': round(current\_ndvi, 4),  
                'baseline\_ndvi\_mean': round(baseline\_ndvi, 4),  
                'ndvi\_change\_absolute': round(ndvi\_change, 4),  
                'ndvi\_change\_percent': round(ndvi\_change\_pct, 1),  
                'ndvi\_recovery\_rate\_per\_month': round(ndvi\_recovery\_rate\_per\_month, 5),  
                'green\_cover\_percent': round(green\_pct, 1),  
                'green\_cover\_change': round(green\_change, 1),  
                'bare\_soil\_percent': round(bare\_pct, 1),  
                'bare\_soil\_change': round(bare\_change, 1),  
                'trajectory': trajectory,  
                'recovery\_progress\_score': recovery\_progress,  
                'months\_since\_baseline': round(months\_elapsed, 1),  
            },  
            metadata={  
                'baseline\_date': self.baseline.get('date'),  
                'target\_ndvi': target\_ndvi,  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED'\],  
            confidence=0.85,  
        )  
      
    def \_build\_interpretation(self, ndvi\_chg, ndvi\_chg\_pct, green\_chg, bare\_chg,  
                               trajectory, progress, months):  
        msg \= f"Over {months:.0f} months since baseline: "  
        if trajectory \== 'STRONG\_RECOVERY':  
            msg \+= f"STRONG recovery detected. NDVI improved by {ndvi\_chg:+.3f} ({ndvi\_chg\_pct:+.1f}%). "  
        elif trajectory \== 'MODERATE\_RECOVERY':  
            msg \+= f"Moderate recovery underway. NDVI improved by {ndvi\_chg:+.3f} ({ndvi\_chg\_pct:+.1f}%). "  
        elif trajectory \== 'STABLE':  
            msg \+= f"Conditions are stable (NDVI change: {ndvi\_chg:+.3f}). "  
        else:  
            msg \+= f"Concerning decline detected. NDVI dropped by {ndvi\_chg:.3f} ({ndvi\_chg\_pct:.1f}%). "  
          
        msg \+= f"Green cover: {green\_chg:+.1f}pp change. Bare soil: {bare\_chg:+.1f}pp change. "  
        msg \+= f"Recovery progress: {progress:.0f}% toward healthy target."  
        return msg  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='VEGETATION\_RECOVERY', indicators={},  
            metadata={'error': reason}, quality\_score=0.0,  
            interpretation=f'Recovery tracking unavailable: {reason}', datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.9 Module 7: Erosion Indicator Module

\`\`\`python  
\# modules/erosion\_indicator\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class ErosionIndicatorModule(BaseAnalysisModule):  
    """  
    Erosion risk assessment combining:  
    1\. BSI (Bare Soil Index) from Sentinel-2 — exposed soil surface  
    2\. Slope analysis from SRTM DEM — steeper slopes \= higher erosion  
    3\. NDVI (low vegetation \= less protection)  
    4\. Rainfall erosivity proxy from CHIRPS  
    5\. RUSLE-inspired simplified erosion risk scoring  
      
    RUSLE: A \= R × K × LS × C × P  
    We approximate:  
    \- R (rainfall erosivity) ← CHIRPS annual rainfall  
    \- LS (slope length/steepness) ← SRTM DEM slope  
    \- C (cover management) ← inverse of NDVI  
    \- K (soil erodibility) ← approximated from bare soil index  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# \=== Bare Soil Index \===  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        bsi \= s2.expression(  
            '((SWIR \+ RED) \- (NIR \+ BLUE)) / ((SWIR \+ RED) \+ (NIR \+ BLUE))', {  
                'SWIR': s2.select('B11'), 'RED': s2.select('B4'),  
                'NIR': s2.select('B8'), 'BLUE': s2.select('B2')  
            }  
        ).rename('BSI')  
          
        ndvi \= s2.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
          
        bsi\_stats \= self.\_zonal\_stats(bsi, 'BSI')  
        ndvi\_stats \= self.\_zonal\_stats(ndvi, 'NDVI')  
          
        \# \=== Slope from SRTM \===  
        dem \= ee.Image('USGS/SRTMGL1\_003').select('elevation')  
        slope \= ee.Terrain.slope(dem).clip(self.geometry)  
        slope\_stats \= self.\_zonal\_stats(slope, 'slope', scale=30)  
          
        \# \=== Rainfall from CHIRPS \===  
        year \= int(self.date\_end\[:4\])  
        chirps \= (  
            ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')  
            .filterBounds(self.geometry)  
            .filterDate(f'{year}-01-01', f'{year}-12-31')  
            .select('precipitation')  
            .sum()  \# Annual total  
            .clip(self.geometry)  
        )  
        rain\_stats \= self.\_zonal\_stats(chirps, 'precipitation', scale=5000)  
          
        \# \=== Simplified RUSLE-inspired erosion risk score \===  
        bsi\_mean \= bsi\_stats.get('BSI\_mean', 0\)  
        ndvi\_mean \= ndvi\_stats.get('NDVI\_mean', 0\)  
        slope\_mean \= slope\_stats.get('slope\_mean', 0\)  
        rain\_annual \= rain\_stats.get('precipitation\_mean', 500\)  
          
        \# Normalize factors to 0-1 range  
        rain\_factor \= min(rain\_annual / 2000, 1.0)     \# R proxy  
        slope\_factor \= min(slope\_mean / 30, 1.0)         \# LS proxy  
        cover\_factor \= 1 \- max(0, min(ndvi\_mean, 1))     \# C proxy (less veg \= more erosion)  
        soil\_factor \= max(0, min((bsi\_mean \+ 0.3) / 0.6, 1.0))  \# K proxy  
          
        erosion\_risk\_score \= round(  
            (rain\_factor \* 0.25 \+ slope\_factor \* 0.30 \+ cover\_factor \* 0.25 \+ soil\_factor \* 0.20) \* 100,  
            1  
        )  
          
        \# Classify  
        if erosion\_risk\_score \> 70:  
            risk\_class \= 'VERY\_HIGH'  
        elif erosion\_risk\_score \> 50:  
            risk\_class \= 'HIGH'  
        elif erosion\_risk\_score \> 30:  
            risk\_class \= 'MODERATE'  
        elif erosion\_risk\_score \> 15:  
            risk\_class \= 'LOW'  
        else:  
            risk\_class \= 'VERY\_LOW'  
          
        interpretation \= (  
            f"Erosion risk score: {erosion\_risk\_score}/100 ({risk\_class}). "  
            f"Contributing factors — Bare soil (BSI: {bsi\_mean:.3f}), "  
            f"Slope ({slope\_mean:.1f}°), Vegetation cover (NDVI: {ndvi\_mean:.3f}), "  
            f"Annual rainfall ({rain\_annual:.0f} mm). "  
        )  
          
        if risk\_class in \['HIGH', 'VERY\_HIGH'\]:  
            interpretation \+= "Active erosion control measures recommended. "  
          
        risk\_flags \= \[\]  
        if risk\_class in \['VERY\_HIGH', 'HIGH'\]:  
            risk\_flags.append({  
                'type': 'EROSION\_RISK',  
                'severity': 'HIGH' if risk\_class \== 'VERY\_HIGH' else 'MODERATE',  
                'description': f'Erosion risk classified as {risk\_class} (score: {erosion\_risk\_score})'  
            })  
          
        return AnalysisResult(  
            module\_name='EROSION\_INDICATOR',  
            indicators={  
                'bsi\_mean': round(bsi\_mean, 4),  
                'ndvi\_mean': round(ndvi\_mean, 4),  
                'slope\_mean\_degrees': round(slope\_mean, 1),  
                'slope\_max\_degrees': round(slope\_stats.get('slope\_max', 0), 1),  
                'annual\_rainfall\_mm': round(rain\_annual, 0),  
                'erosion\_risk\_score': erosion\_risk\_score,  
                'erosion\_risk\_class': risk\_class,  
                'rain\_factor': round(rain\_factor, 3),  
                'slope\_factor': round(slope\_factor, 3),  
                'cover\_factor': round(cover\_factor, 3),  
                'soil\_exposure\_factor': round(soil\_factor, 3),  
            },  
            metadata={  
                'method': 'Simplified RUSLE-inspired scoring',  
                'factor\_weights': {'R': 0.25, 'LS': 0.30, 'C': 0.25, 'K': 0.20},  
            },  
            interpretation=interpretation,  
            risk\_flags=risk\_flags,  
            datasets\_used=\[  
                'COPERNICUS/S2\_SR\_HARMONIZED',  
                'USGS/SRTMGL1\_003',  
                'UCSB-CHG/CHIRPS/DAILY'  
            \],  
            confidence=0.65,  
        )  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.10 Module 8: Biomass Estimation Module

\`\`\`python  
\# modules/biomass\_estimation\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class BiomassEstimationModule(BaseAnalysisModule):  
    """  
    Above-ground biomass proxy estimation using:  
      
    1\. NDVI-based regression model (Sentinel-2)  
       AGB ≈ a × exp(b × NDVI) — empirical exponential model  
      
    2\. SAR-based estimation (Sentinel-1)  
       VH cross-polarization correlates with biomass in forest/shrub  
      
    3\. GEDI L4A (when available in GEE)  
       Direct lidar-based AGB estimates at 25m footprint  
      
    NOTE: This produces PROXY estimates, not field-calibrated measurements.  
    Suitable for relative comparison over time, not absolute biomass.  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# \=== Optical biomass proxy \===  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
          
        ndvi \= s2.normalizedDifference(\['B8', 'B4'\]).rename('NDVI')  
        ndvi\_stats \= self.\_zonal\_stats(ndvi, 'NDVI')  
          
        \# Empirical AGB model: AGB (Mg/ha) ≈ 10 \* exp(2.5 \* NDVI)  
        \# This is a generic tropical/subtropical approximation  
        \# Should be calibrated per-region for accuracy  
        agb\_proxy \= ndvi.expression(  
            '10 \* exp(2.5 \* NDVI)', {'NDVI': ndvi}  
        ).rename('AGB\_proxy')  
          
        agb\_stats \= self.\_zonal\_stats(agb\_proxy, 'AGB\_proxy')  
          
        \# Vegetation fraction cover  
        fvc \= ndvi.expression(  
            '(NDVI \- 0.05) / (0.85 \- 0.05)', {'NDVI': ndvi}  
        ).clamp(0, 1).rename('FVC')  
        fvc\_stats \= self.\_zonal\_stats(fvc, 'FVC')  
          
        \# \=== SAR biomass proxy \===  
        s1 \= (  
            ee.ImageCollection('COPERNICUS/S1\_GRD')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))  
            .filter(ee.Filter.eq('instrumentMode', 'IW'))  
            .select('VH')  
            .median()  
            .clip(self.geometry)  
        )  
          
        vh\_stats \= self.\_zonal\_stats(s1, 'VH')  
          
        \# VH to biomass proxy: AGB ≈ 0.5 \* 10^((VH \+ 20\) / 10\)  
        \# Higher VH backscatter (less negative) \= more biomass  
        sar\_agb\_proxy \= s1.expression(  
            '0.5 \* pow(10, (VH \+ 20\) / 10)', {'VH': s1.select('VH')}  
        ).rename('SAR\_AGB\_proxy')  
        sar\_agb\_stats \= self.\_zonal\_stats(sar\_agb\_proxy, 'SAR\_AGB\_proxy')  
          
        \# Ensemble estimate (average of optical and SAR proxies)  
        optical\_agb \= agb\_stats.get('AGB\_proxy\_mean', 0\)  
        sar\_agb \= sar\_agb\_stats.get('SAR\_AGB\_proxy\_mean', 0\)  
        ensemble\_agb \= (optical\_agb \* 0.6 \+ sar\_agb \* 0.4) if sar\_agb \> 0 else optical\_agb  
          
        total\_area\_ha \= self.geometry.area().getInfo() / 10000  
        total\_biomass\_estimate \= ensemble\_agb \* total\_area\_ha  
          
        \# Carbon stock estimate (generic: \~50% of AGB is carbon)  
        carbon\_stock\_estimate \= total\_biomass\_estimate \* 0.5  
          
        interpretation \= (  
            f"Estimated above-ground biomass: {ensemble\_agb:.1f} Mg/ha "  
            f"(optical proxy: {optical\_agb:.1f}, SAR proxy: {sar\_agb:.1f}). "  
            f"Total site biomass: \~{total\_biomass\_estimate:.0f} Mg over {total\_area\_ha:.1f} ha. "  
            f"Fractional vegetation cover: {fvc\_stats.get('FVC\_mean', 0\) \* 100:.1f}%. "  
            f"NOTE: These are satellite-derived proxies. Field validation recommended for calibration."  
        )  
          
        return AnalysisResult(  
            module\_name='BIOMASS\_ESTIMATION',  
            indicators={  
                'ndvi\_mean': round(ndvi\_stats.get('NDVI\_mean', 0), 4),  
                'optical\_agb\_proxy\_mg\_ha': round(optical\_agb, 1),  
                'sar\_agb\_proxy\_mg\_ha': round(sar\_agb, 1),  
                'ensemble\_agb\_mg\_ha': round(ensemble\_agb, 1),  
                'total\_biomass\_mg': round(total\_biomass\_estimate, 0),  
                'fractional\_veg\_cover': round(fvc\_stats.get('FVC\_mean', 0), 3),  
                'vh\_backscatter\_db': round(vh\_stats.get('VH\_mean', 0), 2),  
                'carbon\_stock\_proxy\_mg': round(carbon\_stock\_estimate, 0),  
                'site\_area\_ha': round(total\_area\_ha, 2),  
            },  
            metadata={  
                'optical\_model': 'AGB \= 10 \* exp(2.5 \* NDVI)',  
                'sar\_model': 'AGB \= 0.5 \* 10^((VH+20)/10)',  
                'ensemble\_weights': {'optical': 0.6, 'sar': 0.4},  
                'carbon\_fraction': 0.5,  
                'disclaimer': 'Proxy estimates only. Not field-calibrated.',  
            },  
            interpretation=interpretation,  
            risk\_flags=\[\],  
            datasets\_used=\['COPERNICUS/S2\_SR\_HARMONIZED', 'COPERNICUS/S1\_GRD'\],  
            confidence=0.5,  \# Lower confidence — proxy estimates  
        )  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.11 Module 9: Restoration Suitability Module

\`\`\`python  
\# modules/restoration\_suitability\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class RestorationSuitabilityModule(BaseAnalysisModule):  
    """  
    Assesses site suitability for specific restoration types based on:  
    1\. Current land cover (Dynamic World)  
    2\. Soil moisture proxy (Sentinel-1 \+ NDMI)  
    3\. Terrain (slope, elevation, aspect)  
    4\. Climate (rainfall, temperature)  
    5\. Historical land use change trajectory  
    6\. Water proximity and availability  
      
    Produces suitability scores for each restoration type.  
    """  
      
    RESTORATION\_CRITERIA \= {  
        'LAKE\_RESTORATION': {  
            'water\_proximity\_max\_km': 5,  
            'slope\_max\_deg': 10,  
            'elevation\_max\_m': 2000,  
            'preferred\_land\_cover': \['water', 'flooded\_vegetation', 'bare'\],  
            'min\_rainfall\_mm': 400,  
        },  
        'WETLAND\_RECOVERY': {  
            'water\_proximity\_max\_km': 3,  
            'slope\_max\_deg': 5,  
            'elevation\_max\_m': 1500,  
            'preferred\_land\_cover': \['water', 'flooded\_vegetation', 'grass'\],  
            'min\_rainfall\_mm': 500,  
        },  
        'MANGROVE\_RESTORATION': {  
            'water\_proximity\_max\_km': 1,  
            'slope\_max\_deg': 3,  
            'elevation\_max\_m': 10,  
            'preferred\_land\_cover': \['water', 'flooded\_vegetation'\],  
            'min\_rainfall\_mm': 1000,  
        },  
        'BARREN\_LAND\_RESTORATION': {  
            'water\_proximity\_max\_km': 50,  
            'slope\_max\_deg': 25,  
            'elevation\_max\_m': 3000,  
            'preferred\_land\_cover': \['bare', 'shrub\_and\_scrub', 'grass'\],  
            'min\_rainfall\_mm': 200,  
        },  
        'FOREST\_RESTORATION': {  
            'water\_proximity\_max\_km': 50,  
            'slope\_max\_deg': 35,  
            'elevation\_max\_m': 3500,  
            'preferred\_land\_cover': \['trees', 'shrub\_and\_scrub', 'grass', 'bare'\],  
            'min\_rainfall\_mm': 600,  
        },  
    }  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        \# Gather all environmental factors  
          
        \# Terrain  
        dem \= ee.Image('USGS/SRTMGL1\_003').select('elevation')  
        slope \= ee.Terrain.slope(dem).clip(self.geometry)  
        elevation\_stats \= self.\_zonal\_stats(dem.clip(self.geometry), 'elevation', scale=30)  
        slope\_stats \= self.\_zonal\_stats(slope, 'slope', scale=30)  
          
        \# Land cover from Dynamic World  
        dw \= (  
            ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .select('label')  
            .mode()  
            .clip(self.geometry)  
        )  
          
        \# Rainfall  
        year \= int(self.date\_end\[:4\])  
        chirps \= (  
            ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')  
            .filterBounds(self.geometry)  
            .filterDate(f'{year-1}-01-01', f'{year}-01-01')  
            .select('precipitation')  
            .sum()  
            .clip(self.geometry)  
        )  
        rain\_stats \= self.\_zonal\_stats(chirps, 'precipitation', scale=5000)  
          
        \# Water proximity (simplified: use NDWI)  
        s2 \= (  
            ee.ImageCollection('COPERNICUS/S2\_SR\_HARMONIZED')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .filter(ee.Filter.lt('CLOUDY\_PIXEL\_PERCENTAGE', 25))  
            .map(self.\_mask\_s2\_clouds)  
            .median()  
            .clip(self.geometry)  
        )  
        ndwi \= s2.normalizedDifference(\['B3', 'B8'\]).rename('NDWI')  
        ndwi\_stats \= self.\_zonal\_stats(ndwi, 'NDWI')  
          
        \# Score each restoration type  
        env\_factors \= {  
            'elevation\_mean': elevation\_stats.get('elevation\_mean', 0),  
            'slope\_mean': slope\_stats.get('slope\_mean', 0),  
            'rainfall\_annual\_mm': rain\_stats.get('precipitation\_mean', 500),  
            'ndwi\_mean': ndwi\_stats.get('NDWI\_mean', 0),  
        }  
          
        suitability\_scores \= {}  
        for resto\_type, criteria in self.RESTORATION\_CRITERIA.items():  
            score \= self.\_compute\_suitability(env\_factors, criteria)  
            suitability\_scores\[resto\_type\] \= score  
          
        \# Best match  
        best\_match \= max(suitability\_scores, key=suitability\_scores.get)  
          
        interpretation \= (  
            f"Restoration suitability assessment based on terrain, climate, and land cover analysis. "  
            f"Best suited for: {best\_match.replace('\_', ' ').title()} "  
            f"(score: {suitability\_scores\[best\_match\]}/100). "  
            f"Site factors: elevation {env\_factors\['elevation\_mean'\]:.0f}m, "  
            f"slope {env\_factors\['slope\_mean'\]:.1f}°, "  
            f"rainfall {env\_factors\['rainfall\_annual\_mm'\]:.0f}mm/year."  
        )  
          
        return AnalysisResult(  
            module\_name='RESTORATION\_SUITABILITY',  
            indicators={  
                \*\*{f'suitability\_{k.lower()}': v for k, v in suitability\_scores.items()},  
                'best\_suited\_type': best\_match,  
                'best\_suitability\_score': suitability\_scores\[best\_match\],  
            },  
            metadata={  
                'env\_factors': env\_factors,  
                'criteria': self.RESTORATION\_CRITERIA,  
            },  
            interpretation=interpretation,  
            risk\_flags=\[\],  
            datasets\_used=\[  
                'USGS/SRTMGL1\_003', 'GOOGLE/DYNAMICWORLD/V1',  
                'UCSB-CHG/CHIRPS/DAILY', 'COPERNICUS/S2\_SR\_HARMONIZED'  
            \],  
            confidence=0.6,  
        )  
      
    def \_compute\_suitability(self, factors, criteria) \-\> float:  
        score \= 100  
          
        \# Slope penalty  
        if factors\['slope\_mean'\] \> criteria\['slope\_max\_deg'\]:  
            overshoot \= factors\['slope\_mean'\] \- criteria\['slope\_max\_deg'\]  
            score \-= min(40, overshoot \* 4\)  
          
        \# Elevation penalty  
        if factors\['elevation\_mean'\] \> criteria\['elevation\_max\_m'\]:  
            score \-= 30  
          
        \# Rainfall penalty  
        if factors\['rainfall\_annual\_mm'\] \< criteria\['min\_rainfall\_mm'\]:  
            deficit\_pct \= (criteria\['min\_rainfall\_mm'\] \- factors\['rainfall\_annual\_mm'\]) / criteria\['min\_rainfall\_mm'\]  
            score \-= min(30, deficit\_pct \* 50\)  
          
        \# Water proximity bonus for water-dependent types  
        if criteria\['water\_proximity\_max\_km'\] \<= 5:  
            if factors\['ndwi\_mean'\] \> 0:  
                score \+= 10  \# Water present on site  
            elif factors\['ndwi\_mean'\] \< \-0.3:  
                score \-= 20  \# Very dry for water-dependent restoration  
          
        return round(max(0, min(100, score)), 1\)  
      
    def \_mask\_s2\_clouds(self, image):  
        scl \= image.select('SCL')  
        mask \= scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))  
        return image.updateMask(mask).divide(10000)  
\`\`\`

\#\#\# 6.12 Module 10: Ecosystem Trend Analysis Module

\`\`\`python  
\# modules/ecosystem\_trend\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class EcosystemTrendModule(BaseAnalysisModule):  
    """  
    Holistic ecosystem trend analysis combining all indicators  
    into a single Ecosystem Health Index (EHI) with trend.  
      
    Uses the latest 6-12 snapshots to compute trend.  
      
    EHI components:  
    \- Vegetation vigor (NDVI trend)  
    \- Moisture status (NDMI trend)  
    \- Surface water stability (NDWI/MNDWI)  
    \- Land cover diversity (Shannon index)  
    \- Bare soil trajectory  
    """  
      
    def \_\_init\_\_(self, geometry, date\_start, date\_end, project\_id, export\_path,  
                 historical\_snapshots: list \= None):  
        super().\_\_init\_\_(geometry, date\_start, date\_end, project\_id, export\_path)  
        self.snapshots \= historical\_snapshots or \[\]  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        if len(self.snapshots) \< 2:  
            return self.\_single\_point\_analysis()  
          
        \# Extract time series from snapshots  
        ndvi\_series \= \[(s\['imagery\_date'\], s.get('ndvi\_mean', 0)) for s in self.snapshots if s.get('ndvi\_mean') is not None\]  
        ndmi\_series \= \[(s\['imagery\_date'\], s.get('ndmi\_mean', 0)) for s in self.snapshots if s.get('ndmi\_mean') is not None\]  
        water\_series \= \[(s\['imagery\_date'\], s.get('water\_area\_percent', 0)) for s in self.snapshots if s.get('water\_area\_percent') is not None\]  
        bare\_series \= \[(s\['imagery\_date'\], s.get('bare\_land\_percent', 0)) for s in self.snapshots if s.get('bare\_land\_percent') is not None\]  
          
        \# Compute trends using simple linear regression  
        import numpy as np  
          
        def compute\_trend(series):  
            if len(series) \< 2:  
                return {'slope': 0, 'direction': 'INSUFFICIENT\_DATA'}  
            from datetime import datetime  
            days \= np.array(\[(datetime.fromisoformat(d) \- datetime.fromisoformat(series\[0\]\[0\])).days   
                            for d, \_ in series\])  
            values \= np.array(\[v for \_, v in series\])  
            if len(days) \< 2:  
                return {'slope': 0, 'direction': 'INSUFFICIENT\_DATA'}  
            coeffs \= np.polyfit(days, values, 1\)  
            slope\_per\_month \= float(coeffs\[0\]) \* 30  
            direction \= 'IMPROVING' if slope\_per\_month \> 0.002 else 'DECLINING' if slope\_per\_month \< \-0.002 else 'STABLE'  
            return {'slope\_per\_month': round(slope\_per\_month, 5), 'direction': direction}  
          
        ndvi\_trend \= compute\_trend(ndvi\_series)  
        ndmi\_trend \= compute\_trend(ndmi\_series)  
        water\_trend \= compute\_trend(water\_series)  
        bare\_trend \= compute\_trend(bare\_series)  
          
        \# Compute Ecosystem Health Index (EHI)  
        latest \= self.snapshots\[-1\]  
        ndvi\_score \= max(0, min(100, (latest.get('ndvi\_mean', 0\) \+ 0.2) / 1.0 \* 100)) \* 0.30  
        ndmi\_score \= max(0, min(100, (latest.get('ndmi\_mean', 0\) \+ 0.5) / 1.0 \* 100)) \* 0.20  
        green\_score \= min(100, latest.get('green\_cover\_percent', 0)) \* 0.25  
        bare\_penalty \= max(0, latest.get('bare\_land\_percent', 0)) \* 0.25  
          
        ehi \= round(ndvi\_score \+ ndmi\_score \+ green\_score \- bare\_penalty \+ 25, 1\)  \# Offset to center  
        ehi \= max(0, min(100, ehi))  
          
        \# Overall ecosystem trajectory  
        improving\_count \= sum(1 for t in \[ndvi\_trend, ndmi\_trend, bare\_trend\]   
                            if t.get('direction') \== 'IMPROVING')  
        declining\_count \= sum(1 for t in \[ndvi\_trend, ndmi\_trend, bare\_trend\]  
                            if t.get('direction') \== 'DECLINING')  
          
        if improving\_count \>= 2:  
            overall\_trajectory \= 'IMPROVING'  
        elif declining\_count \>= 2:  
            overall\_trajectory \= 'DECLINING'  
        else:  
            overall\_trajectory \= 'MIXED'  
          
        interpretation \= (  
            f"Ecosystem Health Index: {ehi}/100. Overall trajectory: {overall\_trajectory}. "  
            f"Vegetation trend: {ndvi\_trend.get('direction', 'N/A')} "  
            f"({ndvi\_trend.get('slope\_per\_month', 0):+.4f}/month). "  
            f"Moisture trend: {ndmi\_trend.get('direction', 'N/A')}. "  
            f"Bare soil trend: {bare\_trend.get('direction', 'N/A')}. "  
            f"Based on {len(self.snapshots)} monitoring snapshots."  
        )  
          
        return AnalysisResult(  
            module\_name='ECOSYSTEM\_TREND',  
            indicators={  
                'ecosystem\_health\_index': ehi,  
                'overall\_trajectory': overall\_trajectory,  
                'ndvi\_trend\_direction': ndvi\_trend.get('direction', 'N/A'),  
                'ndvi\_trend\_per\_month': ndvi\_trend.get('slope\_per\_month', 0),  
                'ndmi\_trend\_direction': ndmi\_trend.get('direction', 'N/A'),  
                'ndmi\_trend\_per\_month': ndmi\_trend.get('slope\_per\_month', 0),  
                'water\_trend\_direction': water\_trend.get('direction', 'N/A'),  
                'bare\_soil\_trend\_direction': bare\_trend.get('direction', 'N/A'),  
                'snapshots\_analyzed': len(self.snapshots),  
            },  
            metadata={  
                'ehi\_weights': {'ndvi': 0.30, 'ndmi': 0.20, 'green\_cover': 0.25, 'bare\_penalty': 0.25},  
                'trends': {  
                    'ndvi': ndvi\_trend,  
                    'ndmi': ndmi\_trend,  
                    'water': water\_trend,  
                    'bare': bare\_trend,  
                }  
            },  
            interpretation=interpretation,  
            risk\_flags=\[\],  
            datasets\_used=\['Derived from monitoring snapshots'\],  
            confidence=min(0.5 \+ len(self.snapshots) \* 0.05, 0.95),  
        )  
      
    def \_single\_point\_analysis(self):  
        """Fallback when only one snapshot or no history."""  
        return AnalysisResult(  
            module\_name='ECOSYSTEM\_TREND',  
            indicators={'snapshots\_analyzed': len(self.snapshots)},  
            metadata={}, quality\_score=0.3,  
            interpretation='Insufficient monitoring history for trend analysis. At least 2 snapshots required.',  
            datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.13 Module 11: Surface Temperature Module

\`\`\`python  
\# modules/surface\_temperature\_module.py  
import ee  
from modules.base\_module import BaseAnalysisModule, AnalysisResult

class SurfaceTemperatureModule(BaseAnalysisModule):  
    """  
    Land Surface Temperature (LST) analysis using MODIS LST products.  
      
    Dataset: MODIS/061/MOD11A2 (8-day composite, 1km resolution)  
      
    Why it matters for restoration:  
    \- Urban heat island effects  
    \- Vegetation cooling effect (restored areas should cool over time)  
    \- Drought/stress indicators  
    \- Seasonal thermal patterns  
    """  
      
    def run\_analysis(self) \-\> AnalysisResult:  
        lst\_collection \= (  
            ee.ImageCollection('MODIS/061/MOD11A2')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .select('LST\_Day\_1km')  
        )  
          
        image\_count \= lst\_collection.size().getInfo()  
        if image\_count \== 0:  
            return self.\_empty\_result('No MODIS LST data available')  
          
        \# Convert from Kelvin \* 0.02 scale factor to Celsius  
        def to\_celsius(image):  
            return image.multiply(0.02).subtract(273.15).copyProperties(image, \['system:time\_start'\])  
          
        lst\_celsius \= lst\_collection.map(to\_celsius)  
          
        \# Mean composite  
        lst\_mean \= lst\_celsius.mean().clip(self.geometry)  
        lst\_stats \= self.\_zonal\_stats(lst\_mean, 'LST\_Day\_1km', scale=1000)  
          
        \# Also get night temperature for diurnal range  
        lst\_night \= (  
            ee.ImageCollection('MODIS/061/MOD11A2')  
            .filterBounds(self.geometry)  
            .filterDate(self.date\_start, self.date\_end)  
            .select('LST\_Night\_1km')  
            .map(to\_celsius)  
            .mean()  
            .clip(self.geometry)  
        )  
        night\_stats \= self.\_zonal\_stats(lst\_night, 'LST\_Night\_1km', scale=1000)  
          
        day\_temp \= lst\_stats.get('LST\_Day\_1km\_mean', 0\)  
        night\_temp \= night\_stats.get('LST\_Night\_1km\_mean', 0\)  
        diurnal\_range \= day\_temp \- night\_temp  
          
        interpretation \= (  
            f"Mean daytime land surface temperature: {day\_temp:.1f}°C. "  
            f"Nighttime: {night\_temp:.1f}°C. Diurnal range: {diurnal\_range:.1f}°C. "  
        )  
          
        if day\_temp \> 40:  
            interpretation \+= "Extremely high surface temperatures detected — thermal stress likely impacting vegetation. "  
        elif day\_temp \> 35:  
            interpretation \+= "High surface temperatures — may contribute to water stress. "  
          
        if diurnal\_range \> 20:  
            interpretation \+= "Large diurnal temperature range suggests low vegetation/moisture buffering."  
          
        return AnalysisResult(  
            module\_name='SURFACE\_TEMPERATURE',  
            indicators={  
                'lst\_day\_mean\_c': round(day\_temp, 1),  
                'lst\_day\_min\_c': round(lst\_stats.get('LST\_Day\_1km\_min', 0), 1),  
                'lst\_day\_max\_c': round(lst\_stats.get('LST\_Day\_1km\_max', 0), 1),  
                'lst\_night\_mean\_c': round(night\_temp, 1),  
                'diurnal\_range\_c': round(diurnal\_range, 1),  
            },  
            metadata={  
                'dataset': 'MODIS/061/MOD11A2',  
                'resolution\_m': 1000,  
                'temporal\_composite': '8-day',  
                'images\_used': image\_count,  
            },  
            interpretation=interpretation,  
            risk\_flags=\[{'type': 'HEAT\_STRESS', 'severity': 'HIGH',  
                        'description': f'Daytime LST {day\_temp:.0f}°C exceeds stress threshold'}\] if day\_temp \> 40 else \[\],  
            datasets\_used=\['MODIS/061/MOD11A2'\],  
            confidence=0.7,  
        )  
      
    def \_empty\_result(self, reason):  
        return AnalysisResult(  
            module\_name='SURFACE\_TEMPERATURE', indicators={},  
            metadata={'error': reason}, quality\_score=0.0,  
            interpretation=f'LST analysis unavailable: {reason}', datasets\_used=\[\]  
        )  
\`\`\`

\#\#\# 6.14 Analysis Pipeline Orchestrator

\`\`\`python  
\# pipelines/monitoring\_analysis.py  
from modules.ndvi\_module import NDVIModule  
from modules.vegetation\_health\_module import VegetationHealthModule  
from modules.water\_moisture\_module import WaterMoistureModule  
from modules.flood\_analysis\_module import FloodAnalysisModule  
from modules.historical\_degradation\_module import HistoricalDegradationModule  
from modules.vegetation\_recovery\_module import VegetationRecoveryModule  
from modules.erosion\_indicator\_module import ErosionIndicatorModule  
from modules.biomass\_estimation\_module import BiomassEstimationModule  
from modules.restoration\_suitability\_module import RestorationSuitabilityModule  
from modules.ecosystem\_trend\_module import EcosystemTrendModule  
from modules.surface\_temperature\_module import SurfaceTemperatureModule

class MonitoringPipeline:  
    """  
    Orchestrates execution of all analysis modules for a monitoring cycle.  
      
    BASELINE pipeline: Runs ALL modules for initial assessment.  
    MONITORING pipeline: Runs core subset \+ recovery tracker.  
    """  
      
    BASELINE\_MODULES \= \[  
        'ndvi', 'vegetation\_health', 'water\_moisture', 'flood',  
        'historical\_degradation', 'erosion', 'biomass',   
        'restoration\_suitability', 'surface\_temperature'  
    \]  
      
    MONITORING\_MODULES \= \[  
        'ndvi', 'vegetation\_health', 'water\_moisture',  
        'vegetation\_recovery', 'biomass', 'surface\_temperature',  
        'ecosystem\_trend'  
    \]  
      
    def \_\_init\_\_(self, geometry\_geojson: dict, project\_id: str, export\_path: str):  
        self.geometry \= ee.Geometry.Polygon(geometry\_geojson\['coordinates'\])  
        self.project\_id \= project\_id  
        self.export\_path \= export\_path  
      
    def run\_baseline(self, date\_start: str, date\_end: str) \-\> dict:  
        """Run full baseline analysis."""  
        results \= {}  
        errors \= \[\]  
          
        for module\_name in self.BASELINE\_MODULES:  
            try:  
                module \= self.\_create\_module(module\_name, date\_start, date\_end)  
                result \= module.execute()  
                results\[module\_name\] \= result.\_\_dict\_\_  
            except Exception as e:  
                errors.append({'module': module\_name, 'error': str(e)})  
                results\[module\_name\] \= {'error': str(e)}  
          
        return {  
            'pipeline': 'BASELINE',  
            'results': results,  
            'errors': errors,  
            'modules\_completed': len(results) \- len(errors),  
            'modules\_failed': len(errors),  
        }  
      
    def run\_monitoring(self, date\_start: str, date\_end: str,  
                        baseline\_snapshot: dict \= None,  
                        historical\_snapshots: list \= None) \-\> dict:  
        """Run periodic monitoring analysis."""  
        results \= {}  
        errors \= \[\]  
          
        for module\_name in self.MONITORING\_MODULES:  
            try:  
                module \= self.\_create\_module(  
                    module\_name, date\_start, date\_end,  
                    baseline\_snapshot=baseline\_snapshot,  
                    historical\_snapshots=historical\_snapshots  
                )  
                result \= module.execute()  
                results\[module\_name\] \= result.\_\_dict\_\_  
            except Exception as e:  
                errors.append({'module': module\_name, 'error': str(e)})  
                results\[module\_name\] \= {'error': str(e)}  
          
        return {  
            'pipeline': 'MONITORING',  
            'results': results,  
            'errors': errors,  
            'modules\_completed': len(results) \- len(errors),  
            'modules\_failed': len(errors),  
        }  
      
    def \_create\_module(self, name, date\_start, date\_end, \*\*kwargs):  
        common\_args \= (self.geometry, date\_start, date\_end, self.project\_id, self.export\_path)  
          
        MODULE\_MAP \= {  
            'ndvi': lambda: NDVIModule(\*common\_args),  
            'vegetation\_health': lambda: VegetationHealthModule(\*common\_args),  
            'water\_moisture': lambda: WaterMoistureModule(\*common\_args),  
            'flood': lambda: FloodAnalysisModule(\*common\_args),  
            'historical\_degradation': lambda: HistoricalDegradationModule(\*common\_args, lookback\_years=7),  
            'erosion': lambda: ErosionIndicatorModule(\*common\_args),  
            'biomass': lambda: BiomassEstimationModule(\*common\_args),  
            'restoration\_suitability': lambda: RestorationSuitabilityModule(\*common\_args),  
            'surface\_temperature': lambda: SurfaceTemperatureModule(\*common\_args),  
            'vegetation\_recovery': lambda: VegetationRecoveryModule(  
                \*common\_args, baseline\_snapshot=kwargs.get('baseline\_snapshot')  
            ),  
            'ecosystem\_trend': lambda: EcosystemTrendModule(  
                \*common\_args, historical\_snapshots=kwargs.get('historical\_snapshots')  
            ),  
        }  
          
        return MODULE\_MAP\[name\]()  
\`\`\`

\---

\#\# 7\. MRV WORKFLOW & STATE MACHINE {\#7-mrv-workflow}

\#\#\# 7.1 Project State Machine

\`\`\`  
                           ┌──────────────────┐  
                           │      DRAFT        │  
                           │  (project created │  
                           │   no polygon yet) │  
                           └────────┬─────────┘  
                                    │ contributor submits polygon  
                                    ▼  
                           ┌──────────────────┐  
                           │ POLYGON\_SUBMITTED │  
                           └────────┬─────────┘  
                                    │ system triggers auto-detection  
                                    ▼  
                          ┌───────────────────────┐  
                          │ GIS\_ANALYSIS\_PENDING   │  
                          └─────────┬─────────────┘  
                                    │ GEE worker picks up job  
                                    ▼  
                          ┌───────────────────────┐  
                     ┌────│ GIS\_ANALYSIS\_RUNNING   │────┐  
                     │    └───────────────────────┘     │  
                     │ success                          │ failure  
                     ▼                                  ▼  
            ┌────────────────┐              ┌───────────────────────┐  
            │ BASELINE\_      │              │ GIS\_ANALYSIS\_FAILED   │  
            │ COMPLETE       │              │ (can retry)           │  
            └───────┬────────┘              └───────────────────────┘  
                    │ system schedules first  
                    │ monitoring cycle  
                    ▼  
           ┌─────────────────────┐  
           │ MONITORING\_ACTIVE    │ ◄─────────────────────────────┐  
           │ (scheduled snapshots │                                │  
           │  running)           │                                │  
           └────┬────────────┬───┘                                │  
                │            │                                    │  
    verifier    │            │ contributor/admin                  │  
    requests    │            │ pauses monitoring                  │  
    review      │            ▼                                    │  
                │    ┌─────────────────────┐                     │  
                │    │ MONITORING\_PAUSED    │ ── resume ──────────┘  
                │    └─────────────────────┘  
                │  
                ▼  
       ┌──────────────────────┐  
       │ VERIFICATION\_PENDING  │  
       │ (awaiting verifier    │  
       │  assignment)          │  
       └───────────┬──────────┘  
                   │ verifier assigned  
                   ▼  
       ┌──────────────────────┐  
       │ VERIFICATION\_         │  
       │ IN\_REVIEW             │  
       └──┬──────────┬────────┘  
          │          │  
  approved│          │rejected / revision requested  
          ▼          ▼  
  ┌───────────────┐  ┌────────────────────┐  
  │ VERIFICATION\_ │  │ VERIFICATION\_      │  
  │ APPROVED      │  │ REJECTED           │  
  │               │  │ (returns to        │  
  │ → returns to  │  │  MONITORING\_ACTIVE │  
  │   MONITORING  │  │  for corrections)  │  
  │   \_ACTIVE     │  └────────────────────┘  
  └───────────────┘  
    
          Any state ──archive──▶ ARCHIVED  
\`\`\`

\#\#\# 7.2 State Machine Implementation (Node.js)

\`\`\`typescript  
// services/mrv/project-state-machine.ts

export type ProjectState \=  
  | 'DRAFT'  
  | 'POLYGON\_SUBMITTED'  
  | 'GIS\_ANALYSIS\_PENDING'  
  | 'GIS\_ANALYSIS\_RUNNING'  
  | 'GIS\_ANALYSIS\_FAILED'  
  | 'BASELINE\_COMPLETE'  
  | 'MONITORING\_ACTIVE'  
  | 'MONITORING\_PAUSED'  
  | 'VERIFICATION\_PENDING'  
  | 'VERIFICATION\_IN\_REVIEW'  
  | 'VERIFICATION\_APPROVED'  
  | 'VERIFICATION\_REJECTED'  
  | 'ARCHIVED';

export type StateTransition \=  
  | 'SUBMIT\_POLYGON'  
  | 'START\_GIS\_ANALYSIS'  
  | 'GIS\_ANALYSIS\_SUCCESS'  
  | 'GIS\_ANALYSIS\_FAIL'  
  | 'RETRY\_GIS\_ANALYSIS'  
  | 'BASELINE\_READY'  
  | 'START\_MONITORING'  
  | 'PAUSE\_MONITORING'  
  | 'RESUME\_MONITORING'  
  | 'REQUEST\_VERIFICATION'  
  | 'ASSIGN\_VERIFIER'  
  | 'APPROVE\_VERIFICATION'  
  | 'REJECT\_VERIFICATION'  
  | 'ARCHIVE';

const STATE\_TRANSITIONS: Record\<ProjectState, Partial\<Record\<StateTransition, ProjectState\>\>\> \= {  
  DRAFT: {  
    SUBMIT\_POLYGON: 'POLYGON\_SUBMITTED',  
    ARCHIVE: 'ARCHIVED',  
  },  
  POLYGON\_SUBMITTED: {  
    START\_GIS\_ANALYSIS: 'GIS\_ANALYSIS\_PENDING',  
    ARCHIVE: 'ARCHIVED',  
  },  
  GIS\_ANALYSIS\_PENDING: {  
    START\_GIS\_ANALYSIS: 'GIS\_ANALYSIS\_RUNNING',  
  },  
  GIS\_ANALYSIS\_RUNNING: {  
    GIS\_ANALYSIS\_SUCCESS: 'BASELINE\_COMPLETE',  
    GIS\_ANALYSIS\_FAIL: 'GIS\_ANALYSIS\_FAILED',  
  },  
  GIS\_ANALYSIS\_FAILED: {  
    RETRY\_GIS\_ANALYSIS: 'GIS\_ANALYSIS\_PENDING',  
    ARCHIVE: 'ARCHIVED',  
  },  
  BASELINE\_COMPLETE: {  
    START\_MONITORING: 'MONITORING\_ACTIVE',  
    REQUEST\_VERIFICATION: 'VERIFICATION\_PENDING',  
    ARCHIVE: 'ARCHIVED',  
  },  
  MONITORING\_ACTIVE: {  
    PAUSE\_MONITORING: 'MONITORING\_PAUSED',  
    REQUEST\_VERIFICATION: 'VERIFICATION\_PENDING',  
    ARCHIVE: 'ARCHIVED',  
  },  
  MONITORING\_PAUSED: {  
    RESUME\_MONITORING: 'MONITORING\_ACTIVE',  
    ARCHIVE: 'ARCHIVED',  
  },  
  VERIFICATION\_PENDING: {  
    ASSIGN\_VERIFIER: 'VERIFICATION\_IN\_REVIEW',  
  },  
  VERIFICATION\_IN\_REVIEW: {  
    APPROVE\_VERIFICATION: 'VERIFICATION\_APPROVED',  
    REJECT\_VERIFICATION: 'VERIFICATION\_REJECTED',  
  },  
  VERIFICATION\_APPROVED: {  
    START\_MONITORING: 'MONITORING\_ACTIVE', // continue monitoring after approval  
  },  
  VERIFICATION\_REJECTED: {  
    START\_MONITORING: 'MONITORING\_ACTIVE', // back to monitoring for corrections  
  },  
  ARCHIVED: {},  
};

export class ProjectStateMachine {  
    
  static canTransition(currentState: ProjectState, transition: StateTransition): boolean {  
    const allowed \= STATE\_TRANSITIONS\[currentState\];  
    return allowed \!== undefined && transition in allowed;  
  }  
    
  static getNextState(currentState: ProjectState, transition: StateTransition): ProjectState {  
    const allowed \= STATE\_TRANSITIONS\[currentState\];  
    const nextState \= allowed?.\[transition\];  
    if (\!nextState) {  
      throw new Error(  
        \`Invalid transition: ${transition} from state ${currentState}\`  
      );  
    }  
    return nextState;  
  }  
    
  static getAvailableTransitions(currentState: ProjectState): StateTransition\[\] {  
    const allowed \= STATE\_TRANSITIONS\[currentState\];  
    return Object.keys(allowed || {}) as StateTransition\[\];  
  }  
}  
\`\`\`

\#\#\# 7.3 MRV Orchestrator Service

\`\`\`typescript  
// services/mrv/mrv-orchestrator.ts

export class MRVOrchestrator {  
    
  constructor(  
    private projectService: ProjectService,  
    private geeClient: GEEClient,      // HTTP client to Python service  
    private reportService: ReportService,  
    private auditService: AuditService,  
    private schedulerService: SchedulerService,  
  ) {}  
    
  /\*\*  
   \* STEP 1: Contributor submits polygon → Trigger auto-detection  
   \*/  
  async onPolygonSubmitted(projectId: string, geojson: GeoJSON.Polygon): Promise\<void\> {  
    // Validate and store polygon  
    const polygon \= await this.projectService.storePolygon(projectId, geojson);  
      
    // Transition state  
    await this.projectService.transitionState(projectId, 'SUBMIT\_POLYGON');  
    await this.projectService.transitionState(projectId, 'START\_GIS\_ANALYSIS');  
      
    // Queue GEE auto-detection analysis  
    await this.geeClient.triggerAutoDetection({  
      projectId,  
      polygon: geojson,  
      callbackUrl: \`/api/internal/mrv/auto-detection-complete/${projectId}\`,  
    });  
      
    await this.auditService.log(projectId, 'system', 'GIS\_ANALYSIS\_TRIGGERED', {  
      polygonArea: polygon.areaHectares,  
    });  
  }  
    
  /\*\*  
   \* STEP 2: GEE auto-detection completes → Store results, create baseline  
   \*/  
  async onAutoDetectionComplete(projectId: string, results: AutoDetectionResult): Promise\<void\> {  
    if (results.error) {  
      await this.projectService.transitionState(projectId, 'GIS\_ANALYSIS\_FAIL');  
      await this.auditService.log(projectId, 'system', 'GIS\_ANALYSIS\_FAILED', results.error);  
      return;  
    }  
      
    // Update project with auto-derived fields  
    await this.projectService.updateAutoDetectedFields(projectId, {  
      detectedEcosystemType: results.ecosystem\_type,  
      detectedLandCoverClass: results.dominant\_land\_cover,  
      landCoverDistribution: results.land\_cover\_distribution,  
      country: results.country,  
      region: results.region,  
      elevationMean: results.elevation\_mean,  
      elevationMin: results.elevation\_min,  
      elevationMax: results.elevation\_max,  
      slopeMean: results.slope\_mean,  
      nearestWaterBodyDistance: results.water\_proximity\_km,  
      nearestWaterBodyName: results.water\_body\_name,  
    });  
      
    // Store baseline  
    await this.projectService.createBaseline(projectId, results.baseline);  
      
    // Store initial snapshot (snapshot \#0)  
    await this.projectService.createSnapshot(projectId, 0, results.snapshot\_data);  
      
    // Store raster artifacts  
    for (const artifact of results.raster\_artifacts) {  
      await this.projectService.storeRasterArtifact(projectId, null, artifact);  
    }  
      
    // Generate registry ID  
    const registryId \= await this.projectService.assignRegistryId(projectId);  
      
    // Transition state  
    await this.projectService.transitionState(projectId, 'GIS\_ANALYSIS\_SUCCESS');  
      
    // Auto-start monitoring  
    await this.projectService.transitionState(projectId, 'START\_MONITORING');  
      
    // Schedule first monitoring cycle  
    const intervalDays \= await this.projectService.getMonitoringInterval(projectId);  
    await this.schedulerService.scheduleNextMonitoring(projectId, intervalDays);  
      
    // Generate baseline environmental report  
    await this.reportService.generateBaselineReport(projectId);  
      
    await this.auditService.log(projectId, 'system', 'BASELINE\_COMPLETE', {  
      registryId,  
      ecosystem: results.ecosystem\_type,  
    });  
  }  
    
  /\*\*  
   \* STEP 3: Scheduled monitoring cycle triggers  
   \*/  
  async onMonitoringCycleDue(projectId: string): Promise\<void\> {  
    const project \= await this.projectService.getProject(projectId);  
      
    if (project.state \!== 'MONITORING\_ACTIVE') {  
      return; // Skip if monitoring paused or not active  
    }  
      
    const polygon \= await this.projectService.getActivePolygon(projectId);  
    const baseline \= await this.projectService.getBaseline(projectId);  
    const previousSnapshots \= await this.projectService.getSnapshots(projectId);  
    const snapshotNumber \= previousSnapshots.length;  
      
    // Determine date range (last 30 days or since last snapshot)  
    const lastSnapshotDate \= previousSnapshots.length \> 0   
      ? previousSnapshots\[previousSnapshots.length \- 1\].imageryDate   
      : baseline.baselineDate;  
      
    const dateEnd \= new Date().toISOString().split('T')\[0\];  
    const dateStart \= new Date(Date.now() \- 45 \* 86400000).toISOString().split('T')\[0\]; // 45 days back  
      
    // Trigger monitoring analysis  
    await this.geeClient.triggerMonitoringAnalysis({  
      projectId,  
      polygon: polygon.geojson,  
      dateStart,  
      dateEnd,  
      baselineSnapshot: this.\_formatBaselineForGEE(baseline),  
      historicalSnapshots: previousSnapshots.map(s \=\> this.\_formatSnapshotForGEE(s)),  
      callbackUrl: \`/api/internal/mrv/monitoring-complete/${projectId}\`,  
    });  
      
    await this.auditService.log(projectId, 'system', 'MONITORING\_CYCLE\_TRIGGERED', {  
      snapshotNumber,  
      dateRange: { dateStart, dateEnd },  
    });  
  }  
    
  /\*\*  
   \* STEP 4: Monitoring analysis completes → Store snapshot, check alerts  
   \*/  
  async onMonitoringComplete(projectId: string, results: MonitoringResult): Promise\<void\> {  
    const snapshotNumber \= await this.projectService.getNextSnapshotNumber(projectId);  
      
    // Store monitoring snapshot  
    const snapshot \= await this.projectService.createSnapshot(projectId, snapshotNumber, {  
      ndviMean: results.results.ndvi?.indicators?.ndvi\_mean,  
      ndviChange: results.results.vegetation\_recovery?.indicators?.ndvi\_change\_absolute,  
      ndviChangePercent: results.results.vegetation\_recovery?.indicators?.ndvi\_change\_percent,  
      eviMean: results.results.vegetation\_health?.indicators?.evi\_mean,  
      saviMean: results.results.vegetation\_health?.indicators?.savi\_mean,  
      ndwiMean: results.results.water\_moisture?.indicators?.ndwi\_mean,  
      ndmiMean: results.results.water\_moisture?.indicators?.ndmi\_mean,  
      waterAreaPercent: results.results.water\_moisture?.indicators?.surface\_water\_area\_percent,  
      biomassIndex: results.results.biomass?.indicators?.ensemble\_agb\_mg\_ha,  
      greenCoverPercent: results.results.ndvi?.indicators?.green\_cover\_percent,  
      bareLandPercent: results.results.ndvi?.indicators?.bare\_soil\_percent,  
      restorationHealthScore: results.results.vegetation\_recovery?.indicators?.recovery\_progress\_score,  
      healthTrend: results.results.vegetation\_recovery?.indicators?.trajectory,  
    });  
      
    // Store all analysis results  
    for (const \[moduleName, moduleResult\] of Object.entries(results.results)) {  
      if (moduleResult && \!moduleResult.error) {  
        await this.projectService.storeAnalysis(projectId, snapshot.id, moduleName, moduleResult);  
      }  
    }  
      
    // Store raster artifacts  
    for (const artifact of results.raster\_artifacts || \[\]) {  
      await this.projectService.storeRasterArtifact(projectId, snapshot.id, artifact);  
    }  
      
    // Check for anomalies/alerts  
    await this.\_checkAnomalies(projectId, snapshot, results);  
      
    // Generate monitoring report  
    await this.reportService.generateMonitoringReport(projectId, snapshot.id);  
      
    // Schedule next monitoring  
    const intervalDays \= await this.projectService.getMonitoringInterval(projectId);  
    await this.schedulerService.scheduleNextMonitoring(projectId, intervalDays);  
      
    // Update project counters  
    await this.projectService.incrementSnapshotCount(projectId);  
      
    await this.auditService.log(projectId, 'system', 'MONITORING\_SNAPSHOT\_STORED', {  
      snapshotNumber,  
      healthScore: snapshot.restorationHealthScore,  
      trend: snapshot.healthTrend,  
    });  
  }  
    
  private async \_checkAnomalies(projectId: string, snapshot: any, results: any) {  
    const allRiskFlags: any\[\] \= \[\];  
    for (const moduleResult of Object.values(results.results)) {  
      if ((moduleResult as any)?.risk\_flags?.length \> 0\) {  
        allRiskFlags.push(...(moduleResult as any).risk\_flags);  
      }  
    }  
      
    const criticalFlags \= allRiskFlags.filter(f \=\> f.severity \=== 'CRITICAL' || f.severity \=== 'HIGH');  
      
    if (criticalFlags.length \> 0\) {  
      // Auto-flag for verifier attention  
      await this.projectService.addTimelineEvent(projectId, 'ANOMALY\_DETECTED', {  
        flags: criticalFlags,  
        snapshotNumber: snapshot.snapshotNumber,  
      });  
      // Optionally auto-request verification  
      // await this.projectService.transitionState(projectId, 'REQUEST\_VERIFICATION');  
    }  
  }  
}  
\`\`\`

\#\#\# 7.4 Monitoring Scheduler

\`\`\`typescript  
// services/scheduler/monitoring-scheduler.ts  
import cron from 'node-cron';

export class MonitoringScheduler {  
    
  constructor(private db: Database, private mrvOrchestrator: MRVOrchestrator) {}  
    
  /\*\*  
   \* Runs every 6 hours to check for projects due monitoring.  
   \*/  
  startScheduler() {  
    cron.schedule('0 \*/6 \* \* \*', async () \=\> {  
      await this.checkDueMonitoring();  
    });  
      
    // Also run quarterly report generation check  
    cron.schedule('0 0 1 1,4,7,10 \*', async () \=\> {  
      await this.triggerQuarterlyReports();  
    });  
  }  
    
  async checkDueMonitoring() {  
    const dueProjects \= await this.db.query.projects.findMany({  
      where: and(  
        eq(projects.state, 'MONITORING\_ACTIVE'),  
        lte(projects.nextMonitoringDate, new Date()),  
      ),  
      limit: 50, // Process in batches  
    });  
      
    for (const project of dueProjects) {  
      try {  
        await this.mrvOrchestrator.onMonitoringCycleDue(project.id);  
      } catch (err) {  
        console.error(\`Monitoring failed for project ${project.id}:\`, err);  
        // Log but continue with other projects  
      }  
    }  
  }  
    
  async scheduleNextMonitoring(projectId: string, intervalDays: number) {  
    const nextDate \= new Date(Date.now() \+ intervalDays \* 86400000);  
    await this.db.update(projects)  
      .set({ nextMonitoringDate: nextDate })  
      .where(eq(projects.id, projectId));  
  }  
    
  async triggerQuarterlyReports() {  
    const activeProjects \= await this.db.query.projects.findMany({  
      where: eq(projects.state, 'MONITORING\_ACTIVE'),  
    });  
      
    for (const project of activeProjects) {  
      // Generate seasonal comparison report  
      // ... report generation logic  
    }  
  }  
}  
\`\`\`

\#\#\# 7.5 Monitoring Lifecycle Visual

\`\`\`  
PROJECT LIFECYCLE:  
═══════════════════════════════════════════════════════════════════  
    
  DAY 1     │ Contributor submits project \+ polygon  
  DAY 1     │ Auto-detection runs (GEE analysis)  
  DAY 1-2   │ Baseline assessment complete  
            │ Baseline Environmental Report generated  
            │ Project enters MONITORING\_ACTIVE  
  ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  
  DAY 30    │ Snapshot \#1 — Scheduled monitoring  
            │ NDVI/EVI/SAVI/NDWI/NDMI analysis  
            │ Recovery tracker comparison vs baseline  
            │ Monitoring Report \#1 generated  
  ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  
  DAY 60    │ Snapshot \#2 — Scheduled monitoring  
            │ Trend analysis begins (2 data points)  
            │ Monitoring Report \#2 generated  
  ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  
  DAY 90    │ Snapshot \#3 — Scheduled monitoring  
            │ Quarterly Comparison Report generated  
            │ Ecosystem trend analysis (3 snapshots)  
            │ → Verifier review may be triggered  
  ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  
  DAY 120   │ Snapshot \#4 — Scheduled monitoring  
  ...       │ (continues monthly)  
  ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  
  DAY 365   │ Annual Summary Report generated  
            │ Full year trend analysis  
            │ Comprehensive verifier review recommended  
  ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  
  ONGOING   │ Continues indefinitely as permanent case file  
\`\`\`

\---

\#\# 8\. VERIFIER DASHBOARD ENHANCEMENT {\#8-verifier-redesign}

\#\#\# 8.1 Verifier Dashboard — Enhanced Layout

The verifier dashboard retains its existing structure but gains new \*\*environmental intelligence panels\*\*. No full redesign — these are additive enhancements.

\`\`\`  
┌─────────────────────────────────────────────────────────────────┐  
│  VERIFIER DASHBOARD                                             │  
├─────────────────────────────────────────────────────────────────┤  
│                                                                 │  
│  ┌─── EXISTING ──────────────────────────────────────────────┐  │  
│  │  Project List / Queue  (keep as-is)                       │  │  
│  │  Project Details Card  (keep as-is)                       │  │  
│  │  Verifier Action Buttons (keep as-is)                     │  │  
│  └───────────────────────────────────────────────────────────┘  │  
│                                                                 │  
│  ┌─── NEW: Environmental Intelligence Panel ─────────────────┐  │  
│  │                                                           │  │  
│  │  8.2  Project Timeline View (chronological events)        │  │  
│  │  8.3  Satellite Evidence Dashboard                        │  │  
│  │  8.4  Historical NDVI Chart                               │  │  
│  │  8.5  GIS Overlay Viewer (Leaflet with layer switcher)    │  │  
│  │  8.6  Change Detection Panel                              │  │  
│  │  8.7  Environmental Risk Indicators                       │  │  
│  │  8.8  Verifier Observation Form (enhanced)                │  │  
│  │  8.9  Report Download Panel                               │  │  
│  │                                                           │  │  
│  └───────────────────────────────────────────────────────────┘  │  
└─────────────────────────────────────────────────────────────────┘  
\`\`\`

\#\#\# 8.2 Project Timeline View (New Component)

A vertical chronological timeline showing all events for the project.

\`\`\`typescript  
// Frontend component: ProjectTimeline.tsx

interface TimelineEvent {  
  id: string;  
  date: string;  
  type: 'BASELINE' | 'MONITORING' | 'VERIFIER' | 'FIELD\_EVIDENCE' | 'ALERT' | 'REPORT';  
  title: string;  
  description: string;  
  snapshotId?: string;  
  icon: string;  
  expandable: boolean;  
  details?: any;  
}

// API endpoint: GET /api/projects/:id/timeline  
// Returns ordered list of TimelineEvent\[\]  
\`\`\`

\*\*What the timeline shows:\*\*  
\- Project creation \+ polygon submission  
\- Baseline analysis completed (with NDVI value)  
\- Each monitoring snapshot (with key metrics)  
\- Verifier reviews and decisions  
\- Field evidence uploads  
\- Anomaly alerts  
\- Reports generated  
\- State changes

\#\#\# 8.3 Satellite Evidence Dashboard (New Component)

Side-by-side comparison of satellite imagery across time.

\`\`\`typescript  
// Frontend component: SatelliteEvidencePanel.tsx

// Layout:  
// ┌──────────────────┬──────────────────┐  
// │  BASELINE IMAGE  │  LATEST IMAGE    │  
// │  (RGB composite) │  (RGB composite) │  
// │  Date: 2024-03   │  Date: 2025-06   │  
// ├──────────────────┼──────────────────┤  
// │  BASELINE NDVI   │  LATEST NDVI     │  
// │  (heatmap)       │  (heatmap)       │  
// │  Mean: 0.18      │  Mean: 0.34      │  
// └──────────────────┴──────────────────┘  
//   
// ┌──────────────────────────────────────┐  
// │  SNAPSHOT SLIDER (select any date)   │  
// │  ○───●───○───○───○───●              │  
// │  Mar  Jun  Sep  Dec  Mar  Jun        │  
// └──────────────────────────────────────┘

// API endpoint: GET /api/projects/:id/satellite-evidence  
// Returns: {  
//   baseline: { rgbUrl, ndviUrl, date, metrics },  
//   latest: { rgbUrl, ndviUrl, date, metrics },  
//   snapshots: \[{ id, date, rgbUrl, ndviUrl, metrics }\]  
// }  
\`\`\`

\#\#\# 8.4 Historical NDVI Chart (New Component)

Interactive time-series chart showing NDVI (and other indices) over time.

\`\`\`typescript  
// Frontend component: NDVIHistoryChart.tsx  
// Library: Recharts or Chart.js

// API endpoint: GET /api/projects/:id/indicator-history?indicator=ndvi  
// Returns: {  
//   baseline: { date, value },  
//   snapshots: \[{ date, value, snapshotNumber }\],  
//   historical: \[{ date, value, source }\], // pre-baseline (Landsat archive)  
//   trend: { slope, direction, rSquared },  
// }

// Chart features:  
// \- Baseline marked with vertical line  
// \- Historical NDVI (before project) shown in dashed line  
// \- Post-baseline monitoring in solid line  
// \- Confidence bands (±1 std dev)  
// \- Toggle between NDVI, EVI, SAVI, NDMI  
// \- Hover tooltips with snapshot details  
\`\`\`

\#\#\# 8.5 GIS Overlay Viewer (Enhanced Existing Leaflet Map)

Enhance the existing Leaflet map component with layer switching capabilities.

\`\`\`typescript  
// Frontend component: EnhancedMapViewer.tsx (extends existing map)

// New layer options (toggle on/off):  
const MAP\_LAYERS \= \[  
  { id: 'polygon', label: 'Project Boundary', default: true },  
  { id: 'ndvi\_latest', label: 'Latest NDVI Heatmap', default: true },  
  { id: 'ndvi\_baseline', label: 'Baseline NDVI Heatmap', default: false },  
  { id: 'ndvi\_change', label: 'NDVI Change Map', default: false },  
  { id: 'land\_cover', label: 'Land Cover Classification', default: false },  
  { id: 'water\_mask', label: 'Surface Water Mask', default: false },  
  { id: 'elevation', label: 'Elevation Contours', default: false },  
  { id: 'field\_evidence', label: 'Field Evidence Points', default: true },  
  { id: 'satellite\_rgb', label: 'True Color Satellite', default: false },  
\];

// Tile layer URLs served from: GET /api/projects/:id/tiles/:layerType/{z}/{x}/{y}.png  
// Or pre-generated tile directories served by nginx  
\`\`\`

\#\#\# 8.6 Change Detection Panel (New Component)

Displays computed changes between snapshots.

\`\`\`typescript  
// Frontend component: ChangeDetectionPanel.tsx

// Shows:  
// \- NDVI change from baseline (absolute \+ percentage)  
// \- Green cover expansion/contraction  
// \- Water body area changes  
// \- Bare soil reduction  
// \- Color-coded change classification badges  
//   🟢 Significant Improvement | 🟡 Moderate Improvement | ⚪ Stable  
//   🟠 Moderate Decline | 🔴 Significant Decline

// API endpoint: GET /api/projects/:id/changes?from=baseline\&to=latest  
// Returns structured change detection results  
\`\`\`

\#\#\# 8.7 Environmental Risk Indicators (New Component)

\`\`\`typescript  
// Frontend component: RiskIndicatorPanel.tsx

// Displays all risk flags from the latest analysis:  
// ┌──────────────────────────────────────────────┐  
// │  🔴 CRITICAL: Water Loss Detected            │  
// │     Current water 3% vs historical 22%        │  
// ├──────────────────────────────────────────────┤  
// │  🟠 HIGH: Erosion Risk                        │  
// │     Score 72/100 — steep slopes \+ bare soil   │  
// ├──────────────────────────────────────────────┤  
// │  🟡 MODERATE: Plant Water Stress              │  
// │     NDMI dropped to \-0.15                     │  
// └──────────────────────────────────────────────┘

// API endpoint: GET /api/projects/:id/risk-flags  
// Returns: \[{ type, severity, description, module, snapshotDate }\]  
\`\`\`

\#\#\# 8.8 Enhanced Verifier Observation Form

\`\`\`typescript  
// Frontend component: VerifierObservationForm.tsx (enhanced existing form)

// New fields added to existing verifier review form:  
interface EnhancedVerifierReview {  
  // Existing fields (keep)  
  decision: 'APPROVED' | 'APPROVED\_WITH\_OBSERVATIONS' | 'REVISION\_REQUESTED' | 'REJECTED';  
  overallNotes: string;  
    
  // NEW: Structured assessment sections  
  dataQualityAssessment: {  
    satelliteDataAdequate: boolean;  
    cloudCoverAcceptable: boolean;  
    temporalCoverageAdequate: boolean;  
    notes: string;  
  };  
    
  environmentalAssessment: {  
    vegetationTrendConfirmed: boolean;  
    waterConditionNoted: boolean;  
    erosionConcerns: boolean;  
    notes: string;  
  };  
    
  restorationProgressAssessment: {  
    progressConsistentWithGoal: boolean;  
    fieldEvidenceCorrelates: boolean;  
    timelineRealistic: boolean;  
    notes: string;  
  };  
    
  // NEW: Specific observations (multiple)  
  observations: Array\<{  
    type: 'VEGETATION\_ANOMALY' | 'WATER\_CONCERN' | 'DATA\_ISSUE' | 'POSITIVE\_TREND' | 'GENERAL';  
    title: string;  
    description: string;  
    severity: 'INFO' | 'WARNING' | 'CRITICAL';  
    locationLat?: number;  
    locationLng?: number;  
  }\>;  
    
  confidenceScore: number; // 0-100  
  recommendedActions: string\[\];  
  nextReviewRecommendation: 'STANDARD' | 'EXPEDITED' | 'EXTENDED';  
}  
\`\`\`

\#\#\# 8.9 Report Download Panel

\`\`\`typescript  
// Frontend component: ReportDownloadPanel.tsx

// Shows all generated reports for the project:  
// ┌─────────────────────────────────────────────────┐  
// │  📄 Baseline Environmental Report    2024-03-15 │  
// │     v1  │  PDF ↓  │  22 pages                   │  
// ├─────────────────────────────────────────────────┤  
// │  📄 Monitoring Report \#1             2024-04-15 │  
// │     v1  │  PDF ↓  │  12 pages                   │  
// ├─────────────────────────────────────────────────┤  
// │  📄 Monitoring Report \#2             2024-05-15 │  
// │     v1  │  PDF ↓  │  14 pages                   │  
// ├─────────────────────────────────────────────────┤  
// │  📄 Quarterly Comparison Report      2024-06-15 │  
// │     v1  │  PDF ↓  │  28 pages                   │  
// └─────────────────────────────────────────────────┘

// API endpoint: GET /api/projects/:id/reports  
\`\`\`

\---

\#\# 9\. REPORTING ENGINE {\#9-reporting-engine}

\#\#\# 9.1 Report Types & Structure

| Report Type | Trigger | Content |  
|------------|---------|---------|  
| \*\*Baseline Environmental\*\* | Auto on baseline completion | Full site characterization, all indices, historical context, land cover, terrain, climate |  
| \*\*Monitoring Periodic\*\* | Auto on each snapshot | Current indicators, change from baseline, trend, risk flags |  
| \*\*Seasonal Comparison\*\* | Auto every 3 months | Quarter-over-quarter comparison, seasonal patterns |  
| \*\*Annual Summary\*\* | Auto yearly | Full year review, 12-month trend, annual statistics |  
| \*\*Restoration Progress\*\* | Manual or verifier-triggered | Comprehensive progress since project start |  
| \*\*Verifier Assessment\*\* | On verification decision | Verifier findings, observations, decision rationale |

\#\#\# 9.2 Report Generation Architecture

\`\`\`typescript  
// services/reports/report-generator.ts

import PDFDocument from 'pdfkit';  
// or use Puppeteer for HTML-to-PDF (better for maps/charts)

export class ReportGenerator {  
    
  async generateBaselineReport(projectId: string): Promise\<string\> {  
    const project \= await this.getProjectFull(projectId);  
    const baseline \= await this.getBaseline(projectId);  
    const analyses \= await this.getAnalyses(projectId, { type: 'BASELINE\_ASSESSMENT' });  
    const polygon \= await this.getActivePolygon(projectId);  
    const rasters \= await this.getRasterArtifacts(projectId);  
      
    const reportData \= {  
      // Section 1: Project Summary  
      projectSummary: {  
        name: project.name,  
        organization: project.organization.name,  
        registryId: project.registryId,  
        restorationGoal: project.restorationGoal,  
        location: { country: project.country, region: project.region },  
        area: { hectares: project.areaHectares, sqKm: project.areaSqKm },  
        coordinates: { lat: project.centroidLat, lng: project.centroidLng },  
        submittedDate: project.createdAt,  
        baselineDate: baseline.baselineDate,  
      },  
        
      // Section 2: Site Characterization (Auto-Detected)  
      siteCharacterization: {  
        ecosystemType: project.detectedEcosystemType,  
        landCoverClass: project.detectedLandCoverClass,  
        landCoverDistribution: project.landCoverDistribution,  
        elevation: {  
          mean: project.elevationMean,  
          min: project.elevationMin,  
          max: project.elevationMax,  
        },  
        slope: project.slopeMean,  
        nearestWaterBody: {  
          name: project.nearestWaterBodyName,  
          distance: project.nearestWaterBodyDistance,  
        },  
      },  
        
      // Section 3: Vegetation Baseline  
      vegetationBaseline: {  
        ndvi: {  
          mean: baseline.ndviMean,  
          min: baseline.ndviMin,  
          max: baseline.ndviMax,  
          stdDev: baseline.ndviStdDev,  
          histogram: baseline.ndviHistogram,  
        },  
        ndviHeatmapUrl: rasters.find(r \=\> r.artifactType \=== 'NDVI\_MAP')?.thumbnailUrl,  
        rgbCompositeUrl: rasters.find(r \=\> r.artifactType \=== 'RGB\_COMPOSITE')?.thumbnailUrl,  
      },  
        
      // Section 4: Water & Moisture Baseline  
      waterBaseline: {  
        ndwi: baseline.ndwiMean,  
        ndmi: baseline.ndmiMean,  
        waterAreaPercent: baseline.waterAreaPercent,  
      },  
        
      // Section 5: Historical Context  
      historicalContext: {  
        ndviTimeSeries: baseline.historicalNdviTimeSeries,  
        degradationAnalysis: analyses.find(a \=\>   
          a.analysisType \=== 'HISTORICAL\_DEGRADATION')?.results,  
      },  
        
      // Section 6: Climate Context  
      climateContext: {  
        annualRainfall: baseline.annualRainfallMm,  
        meanTemperature: baseline.meanTemperatureC,  
      },  
        
      // Section 7: Restoration Suitability  
      suitability: analyses.find(a \=\>   
        a.analysisType \=== 'RESTORATION\_SUITABILITY')?.results,  
        
      // Section 8: Erosion Risk  
      erosion: analyses.find(a \=\>   
        a.analysisType \=== 'EROSION\_ASSESSMENT')?.results,  
        
      // Section 9: Biomass Baseline  
      biomass: analyses.find(a \=\>   
        a.analysisType \=== 'BIOMASS\_ESTIMATION')?.results,  
        
      // Section 10: Maps  
      maps: {  
        polygonMap: polygon.geojson,  
        ndviMap: rasters.find(r \=\> r.artifactType \=== 'NDVI\_MAP')?.fullResUrl,  
        landCoverMap: rasters.find(r \=\> r.artifactType \=== 'LAND\_COVER\_MAP')?.fullResUrl,  
      },  
        
      // Section 11: Data Sources & Methodology  
      methodology: {  
        datasetsUsed: this.collectAllDatasets(analyses),  
        processingMethods: this.collectAllMethods(analyses),  
        confidenceScores: this.collectConfidenceScores(analyses),  
      },  
        
      // Section 12: Disclaimer  
      disclaimer: \`This report was generated by NEVARA's satellite-assisted monitoring system.   
        Environmental indicators are derived from publicly available satellite datasets and   
        should be used as supporting evidence alongside field observations.   
        Accuracy varies by indicator and is noted in the methodology section.\`,  
    };  
      
    // Generate PDF using HTML template \+ Puppeteer  
    const pdfUrl \= await this.renderReportPDF(projectId, 'baseline', reportData);  
      
    // Store report record  
    await this.storeReport(projectId, {  
      reportType: 'BASELINE\_ENVIRONMENTAL',  
      title: \`Baseline Environmental Assessment — ${project.name}\`,  
      pdfUrl,  
      reportData,  
    });  
      
    return pdfUrl;  
  }  
    
  async generateMonitoringReport(projectId: string, snapshotId: string): Promise\<string\> {  
    const project \= await this.getProjectFull(projectId);  
    const snapshot \= await this.getSnapshot(snapshotId);  
    const baseline \= await this.getBaseline(projectId);  
    const analyses \= await this.getAnalysesForSnapshot(snapshotId);  
    const previousSnapshots \= await this.getSnapshots(projectId);  
      
    const reportData \= {  
      // Section 1: Monitoring Summary  
      summary: {  
        projectName: project.name,  
        registryId: project.registryId,  
        snapshotNumber: snapshot.snapshotNumber,  
        monitoringDate: snapshot.imageryDate,  
        daysSinceBaseline: this.daysBetween(baseline.baselineDate, snapshot.imageryDate),  
      },  
        
      // Section 2: Key Indicators (current values \+ change from baseline)  
      indicators: {  
        ndvi: {  
          current: snapshot.ndviMean,  
          baseline: baseline.ndviMean,  
          change: snapshot.ndviChange,  
          changePct: snapshot.ndviChangePercent,  
          trend: snapshot.healthTrend,  
        },  
        moisture: {  
          ndwi: snapshot.ndwiMean,  
          ndmi: snapshot.ndmiMean,  
        },  
        landCover: {  
          greenCover: snapshot.greenCoverPercent,  
          bareSoil: snapshot.bareLandPercent,  
          waterArea: snapshot.waterAreaPercent,  
        },  
        biomass: snapshot.biomassIndex,  
        healthScore: snapshot.restorationHealthScore,  
      },  
        
      // Section 3: Change Detection Maps  
      changeMaps: {  
        ndviChangeMapUrl: snapshot.changeMapUrl,  
        currentNdviUrl: snapshot.ndviRasterUrl,  
      },  
        
      // Section 4: Trend Analysis (if ≥3 snapshots)  
      trend: previousSnapshots.length \>= 3 ? {  
        ndviTimeSeries: previousSnapshots.map(s \=\> ({  
          date: s.imageryDate,  
          ndvi: s.ndviMean,  
          healthScore: s.restorationHealthScore,  
        })),  
      } : null,  
        
      // Section 5: Risk Flags  
      riskFlags: this.collectRiskFlags(analyses),  
        
      // Section 6: Climate Context  
      climate: {  
        rainfall: snapshot.rainfallMmPeriod,  
        temperature: snapshot.meanTempCPeriod,  
      },  
        
      // Section 7: Methodology Note  
      methodology: {  
        dataQuality: snapshot.dataQualityScore,  
        cloudCover: snapshot.cloudCoverPercent,  
      },  
    };  
      
    const pdfUrl \= await this.renderReportPDF(projectId, 'monitoring', reportData);  
      
    await this.storeReport(projectId, {  
      reportType: 'MONITORING\_PERIODIC',  
      title: \`Monitoring Report \#${snapshot.snapshotNumber} — ${project.name}\`,  
      pdfUrl,  
      reportData,  
      snapshotIds: \[snapshotId\],  
    });  
      
    return pdfUrl;  
  }  
}  
\`\`\`

\#\#\# 9.3 Report PDF Rendering

\`\`\`typescript  
// services/reports/pdf-renderer.ts  
import puppeteer from 'puppeteer';  
import Handlebars from 'handlebars';  
import fs from 'fs/promises';

export class PDFRenderer {  
    
  async renderReport(templateName: string, data: any, outputPath: string): Promise\<string\> {  
    // Load HTML template  
    const templateHtml \= await fs.readFile(  
      \`./templates/reports/${templateName}.hbs\`, 'utf-8'  
    );  
      
    const template \= Handlebars.compile(templateHtml);  
    const html \= template(data);  
      
    // Render with Puppeteer  
    const browser \= await puppeteer.launch({  
      headless: true,  
      args: \['--no-sandbox'\],  
    });  
      
    const page \= await browser.newPage();  
    await page.setContent(html, { waitUntil: 'networkidle0' });  
      
    await page.pdf({  
      path: outputPath,  
      format: 'A4',  
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },  
      printBackground: true,  
      displayHeaderFooter: true,  
      headerTemplate: '\<div style="font-size:8px; width:100%; text-align:center;"\>NEVARA Environmental Report\</div\>',  
      footerTemplate: '\<div style="font-size:8px; width:100%; text-align:center;"\>Page \<span class="pageNumber"\>\</span\> of \<span class="totalPages"\>\</span\>\</div\>',  
    });  
      
    await browser.close();  
    return outputPath;  
  }  
}  
\`\`\`

\#\#\# 9.4 Report Template Structure (Baseline)

\`\`\`  
┌────────────────────────────────────────────────┐  
│                 NEVARA LOGO                     │  
│      Baseline Environmental Assessment          │  
│      ────────────────────────────               │  
│      Project: \[Name\]                            │  
│      Registry ID: NEVARA-2025-00142             │  
│      Organization: \[Org Name\]                   │  
│      Date: 2025-06-15                           │  
├────────────────────────────────────────────────┤  
│                                                 │  
│  1\. PROJECT OVERVIEW                            │  
│     • Name, description, restoration goal       │  
│     • Location (country, region, coordinates)   │  
│     • Area (hectares)                           │  
│     • \[MAP: Polygon on satellite basemap\]       │  
│                                                 │  
│  2\. SITE CHARACTERIZATION                       │  
│     • Detected ecosystem type                   │  
│     • Land cover distribution \[PIE CHART\]       │  
│     • Elevation profile                         │  
│     • Slope analysis                            │  
│     • Nearest water body                        │  
│     • \[MAP: Land cover classification\]          │  
│                                                 │  
│  3\. VEGETATION ASSESSMENT                       │  
│     • NDVI mean/min/max/stddev                  │  
│     • EVI, SAVI values                          │  
│     • Vegetation health score                   │  
│     • NDVI distribution \[HISTOGRAM\]             │  
│     • \[MAP: NDVI heatmap\]                       │  
│     • \[MAP: True color composite\]               │  
│                                                 │  
│  4\. WATER & MOISTURE ANALYSIS                   │  
│     • NDWI, NDMI, MNDWI values                 │  
│     • Surface water area percentage             │  
│     • Historical water occurrence               │  
│     • SAR-based water detection                 │  
│                                                 │  
│  5\. HISTORICAL CONTEXT                          │  
│     • 7-year NDVI timeline \[LINE CHART\]         │  
│     • Degradation period detection              │  
│     • Peak vs current comparison                │  
│     • Trend analysis                            │  
│                                                 │  
│  6\. CLIMATE CONTEXT                             │  
│     • Annual rainfall                           │  
│     • Mean temperature                          │  
│     • Surface temperature (MODIS)               │  
│                                                 │  
│  7\. RISK ASSESSMENT                             │  
│     • Erosion risk score \+ factors              │  
│     • Flood risk                                │  
│     • All environmental risk flags              │  
│                                                 │  
│  8\. BIOMASS ESTIMATE                            │  
│     • AGB proxy (Mg/ha)                         │  
│     • Vegetation fraction cover                 │  
│                                                 │  
│  9\. RESTORATION SUITABILITY                     │  
│     • Suitability scores per type \[BAR CHART\]   │  
│     • Best match recommendation                 │  
│                                                 │  
│  10\. DATA SOURCES & METHODOLOGY                 │  
│      • Datasets used (with dates/resolution)    │  
│      • Processing methods                       │  
│      • Confidence scores per module             │  
│      • Known limitations                        │  
│                                                 │  
│  11\. DISCLAIMER                                 │  
│      Satellite-derived proxies; field            │  
│      validation recommended                      │  
│                                                 │  
│  APPENDIX: Raw indicator values table           │  
│                                                 │  
├────────────────────────────────────────────────┤  
│  Generated by NEVARA v2.0 │ \[Date\] │ Page X/Y  │  
└────────────────────────────────────────────────┘

\#\#\# 9.5 Report Versioning & Permanence

typescript  
// Every report is:  
// 1\. Immutable once generated (new version creates new record)  
// 2\. PDF stored permanently in S3/filesystem  
// 3\. Content hash (SHA-256) stored for integrity verification  
// 4\. Linked to specific snapshots/analyses used

async function finalizeReport(reportId: string) {  
  const report \= await getReport(reportId);  
    
  // Compute content hash  
  const pdfBuffer \= await fs.readFile(report.pdfUrl);  
  const hash \= crypto.createHash('sha256').update(pdfBuffer).digest('hex');  
    
  await db.update(projectReports)  
    .set({  
      status: 'GENERATED',  
      contentHash: hash,  
      generatedAt: new Date(),  
    })  
    .where(eq(projectReports.id, reportId));  
    
  // Store version snapshot  
  await db.insert(reportVersions).values({  
    reportId,  
    version: report.version,  
    pdfUrl: report.pdfUrl,  
    generatedAt: new Date(),  
  });  
}  
\`\`\`

\---

\#\# 10\. PERMANENT PROJECT REGISTRY {\#10-project-registry}

\#\#\# 10.1 Registry Design

Every project in NEVARA becomes a \*\*permanent environmental case file\*\* identified by a globally unique Registry ID.

\`\`\`  
Registry ID Format: NEVARA-{YEAR}-{COUNTRY\_CODE}-{SEQUENCE}  
Example:            NEVARA-2025-IN-00142  
\`\`\`

\#\#\# 10.2 Registry Record Structure

\`\`\`typescript  
interface RegistryRecord {  
  registryId: string;  
  projectId: string;  
    
  // Identity  
  name: string;  
  organization: string;  
  restorationGoal: string;  
  location: {  
    country: string;  
    region: string;  
    coordinates: { lat: number; lng: number };  
  };  
  area: { hectares: number };  
    
  // Timeline  
  registeredDate: string;  
  baselineDate: string;  
  latestMonitoringDate: string;  
  totalSnapshots: number;  
  monitoringDurationDays: number;  
    
  // Current Status  
  currentState: string;  
  latestHealthScore: number;  
  latestNDVI: number;  
  overallTrend: string;  
    
  // Environmental Summary  
  ecosystemType: string;  
  landCoverDominant: string;  
    
  // Verification  
  totalVerifications: number;  
  latestVerification: {  
    date: string;  
    decision: string;  
    verifierName: string;  
  };  
    
  // Reports  
  reports: Array\<{  
    type: string;  
    date: string;  
    downloadUrl: string;  
  }\>;  
    
  // Future hooks  
  carbonScoreReady: boolean;  
  mintingEligible: boolean;  
}  
\`\`\`

\#\#\# 10.3 Registry API

\`\`\`typescript  
// GET /api/registry  
// List all registered projects (public, paginated)  
// Query params: ?country=IN\&ecosystem=WETLAND\&page=1\&limit=20

// GET /api/registry/:registryId  
// Get full registry record for a project

// GET /api/registry/:registryId/timeline  
// Get full event timeline

// GET /api/registry/:registryId/reports  
// List all reports

// GET /api/registry/:registryId/snapshots  
// List all monitoring snapshots with key metrics

// GET /api/registry/:registryId/current-status  
// Latest health score, trend, risk flags  
\`\`\`

\#\#\# 10.4 Data Permanence Rules

1\. \*\*Projects are never deleted\*\* — only archived (soft delete)  
2\. \*\*Snapshots are immutable\*\* — once stored, never modified  
3\. \*\*Reports are versioned\*\* — new version \= new record (old preserved)  
4\. \*\*Verifier reviews are append-only\*\* — decisions never overwritten  
5\. \*\*Audit logs are permanent\*\* — no deletion capability  
6\. \*\*Raster artifacts stored permanently\*\* — with content hashes  
7\. \*\*Polygon history maintained\*\* — each version stored separately

\---

\#\# 11\. FUTURE-READY ARCHITECTURE {\#11-future-ready}

\#\#\# 11.1 Carbon Scoring Attachment Points

The database and analysis modules are designed so carbon scoring can be plugged in later \*\*without schema changes\*\*.

\`\`\`  
CURRENT (implemented now):  
  monitoring\_snapshots.biomass\_index  ← AGB proxy stored  
  project\_baseline.historical\_ndvi   ← degradation history stored  
  analysis\_indicators.\*              ← all raw indicators stored

FUTURE (not implemented, but schema-ready):  
  projects.carbon\_score\_ready         ← flag already in schema  
  projects.minting\_eligible           ← flag already in schema  
    
  NEW TABLE (future): carbon\_estimates  
    \- project\_id FK → projects  
    \- snapshot\_id FK → monitoring\_snapshots  
    \- agb\_tonnes\_per\_ha  
    \- carbon\_stock\_tonnes  
    \- sequestration\_rate  
    \- methodology\_used  
    \- confidence  
    
  NEW TABLE (future): sequestration\_calculations  
    \- from\_snapshot\_id  
    \- to\_snapshot\_id  
    \- carbon\_sequestered\_tonnes  
    \- methodology  
    \- verification\_status  
    
  EXISTING TABLE (untouched): credit\_issuances  
    \- Can reference carbon\_estimates  
    
  EXISTING TABLE (untouched): marketplace\_listings  
    \- Remains as-is  
\`\`\`

\#\#\# 11.2 Interface Contracts for Future Carbon System

\`\`\`typescript  
// The MRV system exposes these interfaces for future carbon scoring:

interface CarbonScoringInput {  
  projectId: string;  
  baselineSnapshot: MonitoringSnapshot;  
  currentSnapshot: MonitoringSnapshot;  
  allSnapshots: MonitoringSnapshot\[\];  
  biomassEstimates: BiomassResult\[\];  
  ecosystemType: string;  
  areaHectares: number;  
  verificationStatus: string;  
}

// Future carbon scoring module will:  
// 1\. Read from existing monitoring\_snapshots and environmental\_analyses  
// 2\. Apply methodology-specific calculations  
// 3\. Write to new carbon\_estimates table  
// 4\. Feed into existing credit\_issuances pipeline (untouched)  
\`\`\`

\---

\#\# 12\. DASHBOARD ENHANCEMENT PLAN {\#12-dashboard-enhancements}

\#\#\# 12.1 Contributor Dashboard — Lightweight Enhancements

\*\*Keep everything that exists. Add these panels/cards:\*\*

| Enhancement | Description | Implementation |  
|------------|-------------|----------------|  
| \*\*Auto-Detection Summary Card\*\* | After polygon submission, show auto-detected ecosystem type, land cover, elevation, water proximity in a clean card | New React component \`AutoDetectionCard.tsx\` — renders once baseline complete |  
| \*\*Monitoring Status Bar\*\* | Shows "Next monitoring in X days" \+ total snapshots count \+ current health score | Small status bar component at top of project detail page |  
| \*\*Health Score Gauge\*\* | Circular gauge showing 0-100 restoration health score with color coding | Using a lightweight gauge library (e.g., react-circular-progressbar) |  
| \*\*Mini NDVI Trend Sparkline\*\* | Tiny inline chart showing NDVI over last 6 snapshots | Sparkline component using Recharts or react-sparklines |  
| \*\*Latest Snapshot Card\*\* | Shows key metrics from most recent monitoring: NDVI, water %, green cover %, trend arrow | New card component in project overview |  
| \*\*Report Downloads List\*\* | Simple list of all generated reports with download buttons | Already partially exists — add report type badges |  
| \*\*Field Evidence Upload\*\* | Button to upload photos/docs with optional GPS coordinates and date | New upload form with drag-drop, EXIF extraction for GPS |  
| \*\*Project Timeline (Simplified)\*\* | Vertical timeline of major events (baseline, snapshots, reviews) | Same \`ProjectTimeline.tsx\` component as verifier, read-only |

\*\*Removal from contributor input form:\*\*  
\- Remove: ecosystem type manual input  
\- Remove: location manual input    
\- Remove: land area manual input  
\- Keep: project name, description, organization, restoration goal, polygon draw, file uploads

\#\#\# 12.2 Verifier Dashboard — Lightweight Enhancements

(Detailed in Section 8 above. Summary of additions to existing layout:)

| Enhancement | Location | Description |  
|------------|----------|-------------|  
| Environmental Intelligence Tab | New tab in project review page | Contains all Section 8 components |  
| Satellite Evidence Panel | Within intelligence tab | Side-by-side baseline vs latest imagery |  
| NDVI History Chart | Within intelligence tab | Time-series chart |  
| Risk Flags Badge | Project list view | Red/yellow badge showing risk count |  
| Layer-Switching Map | Replace or overlay on existing map | Toggle NDVI, land cover, water layers |  
| Structured Review Form | Replace simple text review | Multi-section assessment (Section 8.8) |  
| Report Downloads | Sidebar or bottom panel | Direct PDF downloads for all reports |

\---

\#\# COMPLETE API PLANNING

\#\#\# API Route Summary

\`\`\`  
PROJECT MANAGEMENT  
  POST   /api/projects                        Create project (name, desc, org, goal, polygon)  
  GET    /api/projects                        List contributor's projects  
  GET    /api/projects/:id                    Get project details (with auto-detected data)  
  PATCH  /api/projects/:id                    Update project (name, desc only)  
  POST   /api/projects/:id/polygon            Submit/update polygon  
  POST   /api/projects/:id/field-evidence     Upload field evidence  
  GET    /api/projects/:id/field-evidence     List field evidence  
  POST   /api/projects/:id/pause              Pause monitoring  
  POST   /api/projects/:id/resume             Resume monitoring  
  POST   /api/projects/:id/archive            Archive project

GIS & ANALYSIS  
  GET    /api/projects/:id/baseline           Get baseline data  
  GET    /api/projects/:id/snapshots          List all monitoring snapshots  
  GET    /api/projects/:id/snapshots/:num     Get specific snapshot  
  GET    /api/projects/:id/analyses           List all analyses  
  GET    /api/projects/:id/indicator-history   Time series for any indicator  
  GET    /api/projects/:id/changes            Change detection results  
  GET    /api/projects/:id/risk-flags         Current risk flags  
  GET    /api/projects/:id/tiles/:layer/{z}/{x}/{y}.png  Raster tiles

MRV INTERNAL (called by system/workers)  
  POST   /api/internal/mrv/auto-detection-complete/:id    GEE callback  
  POST   /api/internal/mrv/monitoring-complete/:id        GEE callback  
  POST   /api/internal/mrv/retry-analysis/:id             Retry failed analysis

VERIFIER  
  GET    /api/verifier/queue                  Projects pending verification  
  GET    /api/verifier/projects/:id           Full project for review  
  POST   /api/verifier/projects/:id/review    Submit review  
  GET    /api/verifier/projects/:id/timeline  Project event timeline  
  GET    /api/verifier/projects/:id/satellite-evidence  Imagery comparison

REPORTS  
  GET    /api/projects/:id/reports            List all reports  
  GET    /api/reports/:reportId               Get report metadata  
  GET    /api/reports/:reportId/download      Download PDF  
  POST   /api/projects/:id/reports/generate   Manually trigger report

REGISTRY (PUBLIC)  
  GET    /api/registry                        Search/list registered projects  
  GET    /api/registry/:registryId            Public project profile  
  GET    /api/registry/:registryId/summary    Current status summary

AUDIT  
  GET    /api/projects/:id/audit-log          Full audit history  
\`\`\`

\---

\#\# RECOMMENDED LIBRARIES & TOOLS

\#\#\# Node.js Backend

| Library | Purpose |  
|---------|---------|  
| \`@turf/turf\` | Client \+ server-side spatial operations |  
| \`drizzle-orm\` | Database ORM (already used) |  
| \`node-cron\` | Monitoring scheduler |  
| \`bull\` \+ \`ioredis\` | Job queue for async analysis (or \`pg-boss\` for Postgres-only) |  
| \`puppeteer\` | PDF report generation from HTML templates |  
| \`handlebars\` | Report HTML templating |  
| \`sharp\` | Image processing for thumbnails |  
| \`axios\` | HTTP client for Python service calls |  
| \`zod\` | Input validation schemas |  
| \`winston\` | Structured logging |

\#\#\# Python MRV Engine

| Library | Purpose |  
|---------|---------|  
| \`earthengine-api\` | Google Earth Engine Python API |  
| \`flask\` or \`fastapi\` | REST API framework |  
| \`numpy\` | Numerical computation for statistics |  
| \`rasterio\` | GeoTIFF read/write (local rasters) |  
| \`gdal2tiles\` | Tile generation from rasters |  
| \`shapely\` | Geometry operations |  
| \`pyproj\` | Coordinate transformations |  
| \`requests\` | HTTP for callbacks |

\#\#\# Frontend

| Library | Purpose |  
|---------|---------|  
| \`leaflet\` | Map rendering (already used) |  
| \`react-leaflet\` | React bindings for Leaflet |  
| \`leaflet-draw\` | Polygon drawing (already used) |  
| \`recharts\` | Charts for NDVI history, indicators |  
| \`react-circular-progressbar\` | Health score gauge |  
| \`react-dropzone\` | File upload for field evidence |  
| \`date-fns\` | Date formatting |

\---

\#\# OPEN SOURCE DATASETS — QUICK REFERENCE

| Dataset | GEE ID | Resolution | Frequency | Use in NEVARA |  
|---------|--------|-----------|-----------|---------------|  
| \*\*Sentinel-2 SR\*\* | \`COPERNICUS/S2\_SR\_HARMONIZED\` | 10m | 5-day | NDVI, EVI, SAVI, NDWI, NDMI, BSI, RGB composites |  
| \*\*Sentinel-1 GRD\*\* | \`COPERNICUS/S1\_GRD\` | 10m | 12-day | Flood detection, soil moisture proxy, SAR biomass |  
| \*\*Landsat 8/9\*\* | \`LANDSAT/LC08/C02/T1\_L2\` | 30m | 16-day | Historical NDVI (2013+), gap-fill for S2 |  
| \*\*MODIS LST\*\* | \`MODIS/061/MOD11A2\` | 1km | 8-day | Surface temperature, heat stress |  
| \*\*SRTM DEM\*\* | \`USGS/SRTMGL1\_003\` | 30m | Static | Elevation, slope, aspect, terrain analysis |  
| \*\*Dynamic World\*\* | \`GOOGLE/DYNAMICWORLD/V1\` | 10m | \~Monthly | Near real-time land cover classification |  
| \*\*ESA WorldCover\*\* | \`ESA/WorldCover/v200\` | 10m | Static (2021) | Baseline land cover classification |  
| \*\*CHIRPS\*\* | \`UCSB-CHG/CHIRPS/DAILY\` | 5.5km | Daily | Rainfall, erosion risk (R factor) |  
| \*\*JRC Global Surface Water\*\* | \`JRC/GSW1\_4/GlobalSurfaceWater\` | 30m | Static (historical) | Water body occurrence, seasonal vs permanent water |  
| \*\*MODIS NDVI\*\* | \`MODIS/061/MOD13Q1\` | 250m | 16-day | Long-term NDVI trend (2000+) for deep history |

\---

\#\# SCALABILITY CONSIDERATIONS

| Concern | Strategy |  
|---------|----------|  
| \*\*GEE Rate Limits\*\* | Batch analysis in queue; use high-volume endpoint; retry with exponential backoff |  
| \*\*Raster Storage Growth\*\* | Store thumbnails always; full-res GeoTIFFs optionally; tile directories cleaned after 90 days (re-generatable) |  
| \*\*Database Growth\*\* | Partition \`monitoring\_snapshots\` and \`environmental\_analyses\` by year; archive old audit logs |  
| \*\*Concurrent Analysis Jobs\*\* | Bull queue with concurrency=3; Python service can process 3 projects simultaneously |  
| \*\*Report PDF Storage\*\* | Store in S3 (or local /data/nevara/reports/); \~2-5MB per report; manageable for thousands of projects |  
| \*\*Monitoring Scheduler Load\*\* | Process due projects in batches of 50; stagger monitoring dates to avoid GEE spikes |  
| \*\*Frontend Map Performance\*\* | Pre-generated XYZ tiles at zoom 10-16; lazy-load layers; limit snapshot history to last 12 in map view |

\---

\#\# STORAGE ARCHITECTURE

\`\`\`  
/data/nevara/  
├── rasters/  
│   └── {project\_id}/  
│       ├── baseline\_ndvi.tif  
│       ├── baseline\_rgb.tif  
│       ├── snapshot\_001\_ndvi.tif  
│       ├── snapshot\_001\_change.tif  
│       └── ...  
├── tiles/  
│   └── {project\_id}/  
│       └── {layer\_type}/  
│           └── {z}/{x}/{y}.png  
├── thumbnails/  
│   └── {project\_id}/  
│       ├── baseline\_ndvi\_thumb.png  
│       ├── baseline\_rgb\_thumb.png  
│       └── snapshot\_001\_ndvi\_thumb.png  
├── reports/  
│   └── {project\_id}/  
│       ├── baseline\_v1.pdf  
│       ├── monitoring\_001\_v1.pdf  
│       └── quarterly\_2025Q2\_v1.pdf  
├── field\_evidence/  
│   └── {project\_id}/  
│       ├── photo\_001.jpg  
│       └── document\_001.pdf  
└── colormaps/  
    ├── ndvi\_rdylgn.txt  
    ├── water\_blues.txt  
    └── temp\_spectral.txt  
\`\`\`

\---

This completes the full architecture plan for NEVARA's ecological monitoring and MRV system redesign. The plan covers all 12 sections requested: system architecture, database design, GIS engine, GEE workflow, datasets, 11 analysis modules with production code, MRV state machine, verifier dashboard enhancement, reporting engine with templates, permanent registry, future-ready hooks, and lightweight dashboard enhancements — all without touching the existing credit minting and marketplace systems.

