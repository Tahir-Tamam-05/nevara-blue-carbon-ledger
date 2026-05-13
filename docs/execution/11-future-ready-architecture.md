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

