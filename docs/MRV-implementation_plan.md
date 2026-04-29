<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td style="text-align: center;"><p>≋</p>
<p><strong>NEVARA</strong></p>
<p>BlueCarbon Ledger</p>
<p>MRV SYSTEM</p>
<p><strong>Production Implementation Plan</strong></p>
<p>Tahir Tamam · Lead Engineer · April 2026</p></td>
</tr>
</tbody>
</table>

|     |                          |
|-----|--------------------------|
|     | **00 EXECUTIVE SUMMARY** |

<table style="width:93%;">
<colgroup>
<col style="width: 1%" />
<col style="width: 91%" />
</colgroup>
<tbody>
<tr>
<td></td>
<td><p><strong>What This Document Is</strong></p>
<p>This document defines the complete, production-grade implementation plan for the NEVARA MRV</p>
<p>(Monitoring, Reporting, Verification) system — the credibility engine that transforms NEVARA</p>
<p>from a listing platform into legitimate carbon market infrastructure.</p>
<p>It is written for developers who will implement this safely alongside the existing live platform.</p>
<p>Every instruction specifies exact file paths, API contracts, database schemas, and integration</p>
<p>points within the current NEVARA codebase.</p></td>
</tr>
</tbody>
</table>

**The Core Transformation:** Without MRV, NEVARA is a marketplace. With MRV, NEVARA is infrastructure.

|  |  |
|----|----|
| **Without MRV** | **With MRV** |
| Listing platform for carbon credits | Credibility engine for carbon markets |
| Manual verifier reviews unscored projects | AI pre-scores every project before human review |
| Basic PDF certificate with QR link | Full MRV Report: NDVI charts, trust score, methodology |
| Blockchain logs transaction data only | Blockchain logs MRV inputs, outputs, and hash proofs |
| Investor question: 'How do you verify?' | Investor answer: 'Here is the audit trail — scan this QR' |

|     |                                             |
|-----|---------------------------------------------|
|     | **01 SYSTEM ARCHITECTURE — WHERE MRV FITS** |

**Current NEVARA Layer Stack**

|  |  |  |
|----|----|----|
| **Layer** | **Current Status** | **MRV Impact** |
| Contributor Portal | Live ✅ — GIS polygon draw, project submit | MRV auto-triggers on project submission |
| Verification Dashboard | Live ✅ — human approve/reject/clarify | MRV score displayed before human review |
| Blockchain Registry | Live ✅ — SHA-256 + Merkle, public explorer | MRV inputs/outputs logged as signed blocks |
| Carbon Credit Marketplace | Live ✅ — browse, purchase, certificate | MRV Report replaces basic PDF certificate |
| Admin Governance | Live ✅ — user mgmt, audit logs, rollback | MRV pipeline status monitored here |
| MRV Engine | NOT YET BUILT ❌ | New standalone service — built in this plan |

**New Architecture with MRV Layer**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># NEVARA — Full System Architecture (Post-MRV)</p>
<p>┌─────────────────────────────────────────────────┐</p>
<p>│ FRONTEND (React + TypeScript + Vite) │</p>
<p>│ /client/src/pages/ │</p>
<p>│ ├── user-dashboard.tsx (contributor) │</p>
<p>│ ├── verifier-dashboard.tsx ← MRV scores here│</p>
<p>│ ├── marketplace.tsx ← MRV badge │</p>
<p>│ └── mrv-report.tsx ← NEW PAGE │</p>
<p>└─────────────┬───────────────────────────────────┘</p>
<p>│ HTTP / REST</p>
<p>┌─────────────▼───────────────────────────────────┐</p>
<p>│ EXISTING BACKEND (Node.js + Express) │</p>
<p>│ /server/routes.ts │</p>
<p>│ └── POST /api/mrv/trigger ← NEW ROUTE │</p>
<p>│ └── GET /api/mrv/:projectId ← NEW ROUTE │</p>
<p>└─────────────┬───────────────────────────────────┘</p>
<p>│ Internal HTTP (localhost:8001)</p>
<p>┌─────────────▼───────────────────────────────────┐</p>
<p>│ MRV SERVICE (Python FastAPI) ← NEW SERVICE │</p>
<p>│ /mrv-service/ │</p>
<p>│ ├── main.py (FastAPI app entry) │</p>
<p>│ ├── ndvi_pipeline.py (GEE satellite fetch) │</p>
<p>│ ├── scoring_engine.py (trust score calc) │</p>
<p>│ ├── report_generator.py (PDF via WeasyPrint) │</p>
<p>│ └── audit_logger.py (append-only hash log) │</p>
<p>└─────────────┬───────────────────────────────────┘</p>
<p>│ SQL</p>
<p>┌─────────────▼───────────────────────────────────┐</p>
<p>│ DATABASE (PostgreSQL + PostGIS on AWS RDS) │</p>
<p>│ Existing tables + new: │</p>
<p>│ ├── ndvi_measurements ← NEW TABLE │</p>
<p>│ ├── mrv_scores ← NEW TABLE │</p>
<p>│ └── mrv_audit_log ← NEW TABLE │</p>
<p>└─────────────────────────────────────────────────┘</p></td>
</tr>
</tbody>
</table>

<table style="width:93%;">
<colgroup>
<col style="width: 1%" />
<col style="width: 91%" />
</colgroup>
<tbody>
<tr>
<td></td>
<td><p><strong>⚠️ Critical Safety Rule</strong></p>
<p>The MRV service is a NEW standalone Python FastAPI service running on port 8001.</p>
<p>It does NOT modify any existing Node.js routes, schemas, or components.</p>
<p>The existing platform continues working exactly as before during the entire build.</p>
<p>MRV is integrated additively — never by replacing or modifying live production code.</p></td>
</tr>
</tbody>
</table>

|     |                                     |
|-----|-------------------------------------|
|     | **02 DATABASE SCHEMA — NEW TABLES** |

<table style="width:93%;">
<colgroup>
<col style="width: 1%" />
<col style="width: 91%" />
</colgroup>
<tbody>
<tr>
<td></td>
<td><p><strong>Migration Strategy</strong></p>
<p>Run these as new Drizzle migrations. Do NOT alter any existing tables.</p>
<p>File location: /migrations/0004_mrv_system.sql</p>
<p>Run with: npm run db:migrate (your existing migration command)</p></td>
</tr>
</tbody>
</table>

**Table 1: ndvi_measurements**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>-- /migrations/0004_mrv_system.sql</p>
<p>-- Enable PostGIS (run once — safe if already enabled)</p>
<p>CREATE EXTENSION IF NOT EXISTS postgis;</p>
<p>CREATE TABLE ndvi_measurements (</p>
<p>id SERIAL PRIMARY KEY,</p>
<p>project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,</p>
<p>measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),</p>
<p>ndvi_mean DECIMAL(6, 4) NOT NULL, -- e.g. 0.7823</p>
<p>ndvi_min DECIMAL(6, 4),</p>
<p>ndvi_max DECIMAL(6, 4),</p>
<p>cloud_cover_pct DECIMAL(5, 2), -- % cloud cover at measurement time</p>
<p>satellite_source VARCHAR(50) DEFAULT 'Sentinel-2',</p>
<p>polygon GEOMETRY(POLYGON, 4326), -- PostGIS spatial type (WGS84)</p>
<p>raw_gee_response JSONB, -- Store full GEE response for audit</p>
<p>created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()</p>
<p>);</p>
<p>CREATE INDEX idx_ndvi_project_id ON ndvi_measurements(project_id);</p>
<p>CREATE INDEX idx_ndvi_measured_at ON ndvi_measurements(measured_at);</p>
<p>CREATE INDEX idx_ndvi_polygon ON ndvi_measurements USING GIST(polygon);</p></td>
</tr>
</tbody>
</table>

**Table 2: mrv_scores**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>CREATE TABLE mrv_scores (</p>
<p>id SERIAL PRIMARY KEY,</p>
<p>project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,</p>
<p>scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),</p>
<p>-- Core score output</p>
<p>trust_score INTEGER NOT NULL CHECK (trust_score BETWEEN 0 AND 100),</p>
<p>confidence VARCHAR(10) CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),</p>
<p>-- Score breakdown (transparent, not a black box)</p>
<p>baseline_ndvi DECIMAL(6, 4), -- avg NDVI from first 6 months</p>
<p>current_ndvi DECIMAL(6, 4), -- most recent monthly avg</p>
<p>ndvi_delta_pct DECIMAL(6, 2), -- % change vs baseline</p>
<p>canopy_pct DECIMAL(5, 2), -- estimated canopy density %</p>
<p>ecosystem_factor DECIMAL(4, 2), -- 0.9 mangrove, 0.7 seagrass, 0.75 saltmarsh</p>
<p>area_ha DECIMAL(12, 4), -- from GIS polygon</p>
<p>-- Flags</p>
<p>red_flag BOOLEAN DEFAULT FALSE, -- TRUE if NDVI drops &gt;15% below baseline</p>
<p>data_gap_months INTEGER DEFAULT 0, -- months with no satellite data</p>
<p>-- MRV report reference</p>
<p>report_pdf_url TEXT, -- GCS URL of generated PDF</p>
<p>report_html TEXT, -- Stored HTML for re-generation</p>
<p>-- Audit</p>
<p>input_hash VARCHAR(64), -- SHA-256 of all inputs</p>
<p>output_hash VARCHAR(64), -- SHA-256 of all outputs</p>
<p>scoring_version VARCHAR(20) DEFAULT 'v1.0'</p>
<p>);</p>
<p>CREATE INDEX idx_mrv_project ON mrv_scores(project_id);</p>
<p>CREATE INDEX idx_mrv_scored_at ON mrv_scores(scored_at DESC);</p>
<p>CREATE UNIQUE INDEX idx_mrv_latest ON mrv_scores(project_id, scored_at DESC);</p></td>
</tr>
</tbody>
</table>

**Table 3: mrv_audit_log (Append-Only — Critical)**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>CREATE TABLE mrv_audit_log (</p>
<p>id BIGSERIAL PRIMARY KEY,</p>
<p>logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),</p>
<p>project_id INTEGER NOT NULL,</p>
<p>event_type VARCHAR(50) NOT NULL, -- 'MRV_TRIGGERED' | 'SCORE_COMPUTED' | 'REPORT_GENERATED' | 'BLOCKCHAIN_LOGGED'</p>
<p>payload JSONB NOT NULL, -- Full inputs and outputs</p>
<p>sha256_hash VARCHAR(64) NOT NULL, -- SHA-256 of payload</p>
<p>prev_hash VARCHAR(64), -- Links to previous entry (chain integrity)</p>
<p>scorer_version VARCHAR(20)</p>
<p>);</p>
<p>-- CRITICAL: Revoke UPDATE and DELETE to make this table truly append-only</p>
<p>-- Run as database superuser after creating the table:</p>
<p>REVOKE UPDATE, DELETE ON mrv_audit_log FROM nevara_app_user;</p>
<p>-- Verify the grant is set:</p>
<p>-- SELECT grantee, privilege_type FROM information_schema.role_table_grants</p>
<p>-- WHERE table_name = 'mrv_audit_log';</p></td>
</tr>
</tbody>
</table>

|     |                                     |
|-----|-------------------------------------|
|     | **03 MRV SERVICE — PYTHON FASTAPI** |

**Repository Structure**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># Create this folder at the project root (same level as /client and /server)</p>
<p>BLUECARBONPROJECT-main/</p>
<p>├── client/ # existing — DO NOT TOUCH</p>
<p>├── server/ # existing — DO NOT TOUCH</p>
<p>├── shared/ # existing — DO NOT TOUCH</p>
<p>├── migrations/ # existing — add 0004_mrv_system.sql here</p>
<p>│</p>
<p>└── mrv-service/ # ← CREATE THIS</p>
<p>├── main.py</p>
<p>├── config.py</p>
<p>├── ndvi_pipeline.py</p>
<p>├── scoring_engine.py</p>
<p>├── report_generator.py</p>
<p>├── audit_logger.py</p>
<p>├── models.py</p>
<p>├── requirements.txt</p>
<p>├── templates/</p>
<p>│ └── mrv_report.html</p>
<p>└── tests/</p>
<p>├── test_scoring.py</p>
<p>└── test_pipeline.py</p></td>
</tr>
</tbody>
</table>

**requirements.txt**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>fastapi==0.110.0</p>
<p>uvicorn==0.29.0</p>
<p>earthengine-api==0.1.390</p>
<p>geojson==3.1.0</p>
<p>shapely==2.0.3</p>
<p>psycopg2-binary==2.9.9</p>
<p>sqlalchemy==2.0.29</p>
<p>geoalchemy2==0.15.0</p>
<p>weasyprint==62.1</p>
<p>jinja2==3.1.3</p>
<p>matplotlib==3.8.4</p>
<p>pandas==2.2.1</p>
<p>numpy==1.26.4</p>
<p>httpx==0.27.0</p>
<p>pydantic==2.7.0</p>
<p>python-dotenv==1.0.1</p>
<p>pytest==8.1.1</p></td>
</tr>
</tbody>
</table>

**config.py — Environment Variables**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># mrv-service/config.py</p>
<p>from pydantic_settings import BaseSettings</p>
<p>class Settings(BaseSettings):</p>
<p>DATABASE_URL: str # Same as Node.js .env DATABASE_URL</p>
<p>GEE_SERVICE_ACCOUNT: str # Google Earth Engine service account email</p>
<p>GEE_PRIVATE_KEY_FILE: str # Path to GEE .json credentials file</p>
<p>GCS_BUCKET: str # Your existing GCS bucket (for PDF storage)</p>
<p>MRV_SERVICE_PORT: int = 8001</p>
<p>NEVARA_BACKEND_URL: str = 'http://localhost:5000' # Node.js backend</p>
<p>class Config:</p>
<p>env_file = '../.env' # Reuse the existing .env at project root</p>
<p>settings = Settings()</p>
<p># .env additions required (append to existing .env — do not replace):</p>
<p># GEE_SERVICE_ACCOUNT=nevara-mrv@your-gcp-project.iam.gserviceaccount.com</p>
<p># GEE_PRIVATE_KEY_FILE=./mrv-service/gee-credentials.json</p>
<p># MRV_SERVICE_PORT=8001</p></td>
</tr>
</tbody>
</table>

**main.py — FastAPI Application Entry Point**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># mrv-service/main.py</p>
<p>from fastapi import FastAPI, HTTPException, BackgroundTasks</p>
<p>from fastapi.middleware.cors import CORSMiddleware</p>
<p>from pydantic import BaseModel</p>
<p>from typing import Optional</p>
<p>import uvicorn</p>
<p>from ndvi_pipeline import NDVIPipeline</p>
<p>from scoring_engine import ScoringEngine</p>
<p>from report_generator import ReportGenerator</p>
<p>from audit_logger import AuditLogger</p>
<p>from config import settings</p>
<p>app = FastAPI(title='NEVARA MRV Service', version='1.0.0')</p>
<p>app.add_middleware(CORSMiddleware,</p>
<p>allow_origins=[settings.NEVARA_BACKEND_URL],</p>
<p>allow_methods=['GET', 'POST'],</p>
<p>allow_headers=['Authorization', 'Content-Type'],</p>
<p>)</p>
<p>class MRVTriggerRequest(BaseModel):</p>
<p>project_id: int</p>
<p>polygon_geojson: dict # GeoJSON from contributor's GIS draw</p>
<p>ecosystem_type: str # 'mangrove' | 'seagrass' | 'saltmarsh'</p>
<p>area_ha: float</p>
<p>project_age_years: float</p>
<p>@app.post('/mrv/trigger')</p>
<p>async def trigger_mrv(req: MRVTriggerRequest, background_tasks: BackgroundTasks):</p>
<p>'''</p>
<p>Triggered by Node.js backend when a project is submitted.</p>
<p>Returns immediately with job_id — scoring runs in background.</p>
<p>'''</p>
<p>audit = AuditLogger(req.project_id)</p>
<p>job_id = audit.log_trigger(req.dict())</p>
<p>background_tasks.add_task(run_mrv_pipeline, req, job_id, audit)</p>
<p>return {'job_id': job_id, 'status': 'queued', 'message': 'MRV pipeline started'}</p>
<p>@app.get('/mrv/{project_id}/latest')</p>
<p>async def get_latest_score(project_id: int):</p>
<p>'''Returns the most recent MRV score for a project.'''</p>
<p>from database import get_latest_mrv_score</p>
<p>score = get_latest_mrv_score(project_id)</p>
<p>if not score:</p>
<p>raise HTTPException(404, 'No MRV score found for this project')</p>
<p>return score</p>
<p>@app.get('/mrv/{project_id}/history')</p>
<p>async def get_score_history(project_id: int):</p>
<p>'''Returns full NDVI time series for charting.'''</p>
<p>from database import get_ndvi_history</p>
<p>return get_ndvi_history(project_id)</p>
<p>async def run_mrv_pipeline(req: MRVTriggerRequest, job_id: str, audit: AuditLogger):</p>
<p>'''Full async pipeline — runs in background.'''</p>
<p>try:</p>
<p># Step 1: Fetch NDVI from Google Earth Engine</p>
<p>pipeline = NDVIPipeline()</p>
<p>ndvi_data = pipeline.fetch_monthly_ndvi(req.polygon_geojson)</p>
<p>baseline = pipeline.compute_baseline(ndvi_data) # First 6 months avg</p>
<p>audit.log_measurement(ndvi_data)</p>
<p># Step 2: Score</p>
<p>engine = ScoringEngine()</p>
<p>score = engine.compute(ndvi_data, baseline, req.ecosystem_type,</p>
<p>req.area_ha, req.project_age_years)</p>
<p>audit.log_score(score)</p>
<p># Step 3: Generate PDF report</p>
<p>report = ReportGenerator()</p>
<p>pdf_url = report.generate(req.project_id, score, ndvi_data)</p>
<p>audit.log_report(pdf_url)</p>
<p># Step 4: Notify Node.js backend (webhook)</p>
<p>import httpx</p>
<p>async with httpx.AsyncClient() as client:</p>
<p>await client.post(</p>
<p>f'{settings.NEVARA_BACKEND_URL}/api/mrv/score-ready',</p>
<p>json={'project_id': req.project_id, 'score': score, 'pdf_url': pdf_url},</p>
<p>timeout=10.0</p>
<p>)</p>
<p>except Exception as e:</p>
<p>audit.log_error(str(e))</p>
<p>raise</p>
<p>if __name__ == '__main__':</p>
<p>uvicorn.run('main:app', host='0.0.0.0', port=settings.MRV_SERVICE_PORT, reload=False)</p></td>
</tr>
</tbody>
</table>

**ndvi_pipeline.py — Satellite Data**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># mrv-service/ndvi_pipeline.py</p>
<p>import ee</p>
<p>import json</p>
<p>import pandas as pd</p>
<p>from datetime import datetime, timedelta</p>
<p>from config import settings</p>
<p>class NDVIPipeline:</p>
<p>def __init__(self):</p>
<p># Authenticate with Google Earth Engine</p>
<p>credentials = ee.ServiceAccountCredentials(</p>
<p>settings.GEE_SERVICE_ACCOUNT,</p>
<p>settings.GEE_PRIVATE_KEY_FILE</p>
<p>)</p>
<p>ee.Initialize(credentials)</p>
<p>def fetch_monthly_ndvi(self, polygon_geojson: dict) -&gt; list[dict]:</p>
<p>'''</p>
<p>Fetch monthly NDVI averages for the past 24 months.</p>
<p>Returns: [{'month': '2024-01', 'ndvi_mean': 0.72, 'cloud_cover': 12.3}, ...]</p>
<p>'''</p>
<p>region = ee.Geometry.Polygon(polygon_geojson['coordinates'])</p>
<p>end_date = datetime.now()</p>
<p>start_date = end_date - timedelta(days=730) # 24 months</p>
<p>collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')</p>
<p>.filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))</p>
<p>.filterBounds(region)</p>
<p>.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)),</p>
<p>.map(self._add_ndvi)</p>
<p>)</p>
<p># Aggregate to monthly means</p>
<p>months = self._get_month_list(start_date, end_date)</p>
<p>results = []</p>
<p>for year, month in months:</p>
<p>monthly = (collection</p>
<p>.filter(ee.Filter.calendarRange(year, year, 'year'))</p>
<p>.filter(ee.Filter.calendarRange(month, month, 'month'))</p>
<p>)</p>
<p>stats = monthly.select('NDVI').mean().reduceRegion(</p>
<p>reducer=ee.Reducer.mean().combine(</p>
<p>ee.Reducer.minMax(), sharedInputs=True</p>
<p>),</p>
<p>geometry=region,</p>
<p>scale=10, # Sentinel-2 resolution: 10m</p>
<p>maxPixels=1e9</p>
<p>).getInfo()</p>
<p>results.append({</p>
<p>'month': f'{year}-{month:02d}',</p>
<p>'ndvi_mean': round(stats.get('NDVI_mean', 0), 4),</p>
<p>'ndvi_min': round(stats.get('NDVI_min', 0), 4),</p>
<p>'ndvi_max': round(stats.get('NDVI_max', 0), 4),</p>
<p>'cloud_cover_pct': 0.0, # placeholder</p>
<p>})</p>
<p>return [r for r in results if r['ndvi_mean'] &gt; 0] # Drop months with no data</p>
<p>def _add_ndvi(self, image):</p>
<p>ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')</p>
<p>return image.addBands(ndvi)</p>
<p>def compute_baseline(self, ndvi_data: list[dict]) -&gt; float:</p>
<p>'''</p>
<p>Baseline = mean NDVI of first 6 available months.</p>
<p>This is the scientific standard for change detection.</p>
<p>'''</p>
<p>first_six = [d['ndvi_mean'] for d in ndvi_data[:6] if d['ndvi_mean'] &gt; 0]</p>
<p>if len(first_six) &lt; 3:</p>
<p>raise ValueError('Insufficient data: need at least 3 months to compute baseline')</p>
<p>return round(sum(first_six) / len(first_six), 4)</p>
<p>def _get_month_list(self, start, end):</p>
<p>months = []</p>
<p>current = start.replace(day=1)</p>
<p>while current &lt;= end:</p>
<p>months.append((current.year, current.month))</p>
<p>current = (current.replace(day=28) + timedelta(days=4)).replace(day=1)</p>
<p>return months</p></td>
</tr>
</tbody>
</table>

**scoring_engine.py — Trust Score (Core IP)**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># mrv-service/scoring_engine.py</p>
<p># This is NEVARA's core IP — transparent, explainable, auditable.</p>
<p># Formula: Credits = A × C_eco × Q × (1 - 0.20) × T</p>
<p>import hashlib, json</p>
<p>from dataclasses import dataclass</p>
<p>ECOSYSTEM_FACTORS = {</p>
<p>'mangrove': 0.90,</p>
<p>'seagrass': 0.70,</p>
<p>'saltmarsh': 0.75,</p>
<p>}</p>
<p>ECOSYSTEM_CARBON_RATE = { # tCO2e / ha / year (IPCC conservative midpoints)</p>
<p>'mangrove': 7.0,</p>
<p>'seagrass': 3.5,</p>
<p>'saltmarsh': 4.0,</p>
<p>}</p>
<p>@dataclass</p>
<p>class ScoreResult:</p>
<p>trust_score: int # 0–100</p>
<p>confidence: str # HIGH | MEDIUM | LOW</p>
<p>baseline_ndvi: float</p>
<p>current_ndvi: float</p>
<p>ndvi_delta_pct: float # % change from baseline</p>
<p>canopy_pct: float # estimated from NDVI</p>
<p>ecosystem_factor: float</p>
<p>area_ha: float</p>
<p>red_flag: bool</p>
<p>credits_estimate: float # Estimated tCO2e (before buffer)</p>
<p>credits_issuable: float # After 20% buffer deduction</p>
<p>breakdown: dict # Why the score is what it is</p>
<p>input_hash: str # SHA-256 of all inputs</p>
<p>output_hash: str # SHA-256 of all outputs</p>
<p>class ScoringEngine:</p>
<p>def compute(self, ndvi_data: list, baseline: float,</p>
<p>ecosystem: str, area_ha: float, age_years: float) -&gt; dict:</p>
<p>'''</p>
<p>TRANSPARENT scoring — every number is explainable.</p>
<p>Investors / NGOs can audit this formula line by line.</p>
<p>'''</p>
<p>eco_factor = ECOSYSTEM_FACTORS.get(ecosystem, 0.70)</p>
<p>eco_rate = ECOSYSTEM_CARBON_RATE.get(ecosystem, 3.5)</p>
<p># Current NDVI = average of last 3 months (not just last month)</p>
<p>recent = [d['ndvi_mean'] for d in ndvi_data[-3:] if d['ndvi_mean'] &gt; 0]</p>
<p>current_ndvi = round(sum(recent) / len(recent), 4) if recent else 0.0</p>
<p># NDVI change detection</p>
<p>ndvi_delta = ((current_ndvi - baseline) / baseline * 100) if baseline &gt; 0 else 0</p>
<p>red_flag = ndvi_delta &lt; -15 # &gt;15% drop is a RED FLAG</p>
<p># Quality score (Q): 0.50 to 1.00</p>
<p># Based on current NDVI vs baseline (primary signal)</p>
<p>q_ndvi = min(1.0, max(0.5, current_ndvi / max(baseline, 0.01)))</p>
<p># Canopy density estimate from NDVI (approximate)</p>
<p>canopy_pct = round(current_ndvi * 100 * 0.85, 1) # Empirical scaling</p>
<p># Age bonus (young projects = lower confidence)</p>
<p>age_bonus = min(0.10, age_years / 20 * 0.10)</p>
<p># Final Q</p>
<p>q_final = round(min(1.0, q_ndvi + age_bonus), 3)</p>
<p># Carbon credits estimate (NEVARA formula)</p>
<p>credits_gross = area_ha * eco_rate * q_final</p>
<p>credits_issuable = round(credits_gross * 0.80, 2) # 20% buffer deducted</p>
<p># Trust score (0–100)</p>
<p>trust_score = int(q_final * eco_factor * 100)</p>
<p>trust_score = max(0, min(100, trust_score))</p>
<p># Confidence level</p>
<p>data_months = len([d for d in ndvi_data if d['ndvi_mean'] &gt; 0])</p>
<p>if data_months &gt;= 12 and not red_flag: confidence = 'HIGH'</p>
<p>elif data_months &gt;= 6: confidence = 'MEDIUM'</p>
<p>else: confidence = 'LOW'</p>
<p>breakdown = {</p>
<p>'ndvi_quality_component': round(q_ndvi, 3),</p>
<p>'age_bonus': round(age_bonus, 3),</p>
<p>'final_quality_q': q_final,</p>
<p>'ecosystem_factor': eco_factor,</p>
<p>'carbon_rate_tCO2e_ha_yr': eco_rate,</p>
<p>'area_ha': area_ha,</p>
<p>'buffer_deduction': '20% (Verra VM0033)',</p>
<p>'data_months_available': data_months,</p>
<p>'canopy_density_pct': canopy_pct,</p>
<p>}</p>
<p># Compute hashes for audit trail</p>
<p>inputs_str = json.dumps({'ndvi': ndvi_data, 'baseline': baseline,</p>
<p>'ecosystem': ecosystem, 'area_ha': area_ha}, sort_keys=True)</p>
<p>outputs_str = json.dumps({'score': trust_score, 'credits': credits_issuable,</p>
<p>'breakdown': breakdown}, sort_keys=True)</p>
<p>input_hash = hashlib.sha256(inputs_str.encode()).hexdigest()</p>
<p>output_hash = hashlib.sha256(outputs_str.encode()).hexdigest()</p>
<p>return ScoreResult(</p>
<p>trust_score=trust_score, confidence=confidence,</p>
<p>baseline_ndvi=baseline, current_ndvi=current_ndvi,</p>
<p>ndvi_delta_pct=round(ndvi_delta, 2),</p>
<p>canopy_pct=canopy_pct, ecosystem_factor=eco_factor,</p>
<p>area_ha=area_ha, red_flag=red_flag,</p>
<p>credits_estimate=round(credits_gross, 2),</p>
<p>credits_issuable=credits_issuable,</p>
<p>breakdown=breakdown,</p>
<p>input_hash=input_hash, output_hash=output_hash,</p>
<p>).__dict__</p></td>
</tr>
</tbody>
</table>

|     |                                    |
|-----|------------------------------------|
|     | **04 NODE.JS BACKEND INTEGRATION** |

<table style="width:93%;">
<colgroup>
<col style="width: 1%" />
<col style="width: 91%" />
</colgroup>
<tbody>
<tr>
<td></td>
<td><p><strong>Safety Rule — Additive Only</strong></p>
<p>Add only new routes to server/routes.ts. Do not modify any existing route handlers.</p>
<p>The MRV service is called via internal HTTP, not imported directly.</p>
<p>All existing endpoints continue working unchanged.</p></td>
</tr>
</tbody>
</table>

**New Routes to Add in server/routes.ts**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>// server/routes.ts — ADD THESE ROUTES (do not modify existing routes)</p>
<p>import axios from 'axios';</p>
<p>const MRV_SERVICE_URL = process.env.MRV_SERVICE_URL || 'http://localhost:8001';</p>
<p>// ── Route 1: Trigger MRV when a project is submitted ────────────────</p>
<p>// Called automatically from existing project submission logic</p>
<p>app.post('/api/mrv/trigger', authenticateToken, async (req, res) =&gt; {</p>
<p>try {</p>
<p>const { projectId, polygonGeojson, ecosystemType, areaHa, projectAgeYears } = req.body;</p>
<p>// Validate project exists and belongs to requester</p>
<p>const project = await storage.getProject(projectId);</p>
<p>if (!project) return res.status(404).json({ message: 'Project not found' });</p>
<p>const mrvResponse = await axios.post(`${MRV_SERVICE_URL}/mrv/trigger`, {</p>
<p>project_id: projectId,</p>
<p>polygon_geojson: polygonGeojson,</p>
<p>ecosystem_type: ecosystemType,</p>
<p>area_ha: areaHa,</p>
<p>project_age_years: projectAgeYears ?? 0,</p>
<p>}, { timeout: 5000 });</p>
<p>await storage.updateProjectMrvStatus(projectId, 'PENDING');</p>
<p>await auditLog.record(req.user.id, 'MRV_TRIGGERED', { projectId });</p>
<p>return res.json({ success: true, jobId: mrvResponse.data.job_id });</p>
<p>} catch (err) {</p>
<p>console.error('MRV trigger failed:', err.message);</p>
<p>return res.status(500).json({ message: 'MRV service unavailable — score pending' });</p>
<p>}</p>
<p>});</p>
<p>// ── Route 2: Webhook from MRV service when scoring completes ────────</p>
<p>// Called by Python FastAPI when pipeline finishes</p>
<p>app.post('/api/mrv/score-ready', async (req, res) =&gt; {</p>
<p>// Verify request is from MRV service (internal network or shared secret)</p>
<p>const authHeader = req.headers['x-mrv-secret'];</p>
<p>if (authHeader !== process.env.MRV_INTERNAL_SECRET) {</p>
<p>return res.status(401).json({ message: 'Unauthorized' });</p>
<p>}</p>
<p>const { project_id, score, pdf_url } = req.body;</p>
<p>await storage.saveMrvScore({</p>
<p>projectId: project_id,</p>
<p>trustScore: score.trust_score,</p>
<p>confidence: score.confidence,</p>
<p>redFlag: score.red_flag,</p>
<p>pdfUrl: pdf_url,</p>
<p>rawScore: score,</p>
<p>});</p>
<p>await storage.updateProjectMrvStatus(project_id, 'COMPLETE');</p>
<p>await auditLog.record(null, 'MRV_SCORE_RECEIVED', { project_id, trust_score: score.trust_score });</p>
<p>return res.json({ success: true });</p>
<p>});</p>
<p>// ── Route 3: Get MRV score for a project ────────────────────────────</p>
<p>app.get('/api/mrv/:projectId', authenticateToken, async (req, res) =&gt; {</p>
<p>const score = await storage.getMrvScore(parseInt(req.params.projectId));</p>
<p>if (!score) return res.status(404).json({ message: 'No MRV score yet' });</p>
<p>return res.json({ success: true, data: score });</p>
<p>});</p>
<p>// ── Route 4: Get NDVI history for charting ───────────────────────────</p>
<p>app.get('/api/mrv/:projectId/ndvi-history', authenticateToken, async (req, res) =&gt; {</p>
<p>try {</p>
<p>const history = await axios.get(`${MRV_SERVICE_URL}/mrv/${req.params.projectId}/history`);</p>
<p>return res.json({ success: true, data: history.data });</p>
<p>} catch {</p>
<p>return res.status(503).json({ message: 'MRV service unavailable' });</p>
<p>}</p>
<p>});</p></td>
</tr>
</tbody>
</table>

**Modify Project Submission — Trigger MRV Automatically**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>// server/routes.ts — Find your existing project submission route</p>
<p>// It likely looks like: app.post('/api/projects', ...)</p>
<p>// Add this AFTER the project is created successfully:</p>
<p>// EXISTING CODE (example):</p>
<p>// const project = await storage.createProject({ ...projectData });</p>
<p>// await blockchain.recordProject(project);</p>
<p>// ADD AFTER (non-blocking — don't await, don't fail submission if MRV fails):</p>
<p>axios.post(`${MRV_SERVICE_URL}/mrv/trigger`, {</p>
<p>project_id: project.id,</p>
<p>polygon_geojson: projectData.polygon,</p>
<p>ecosystem_type: projectData.ecosystemType,</p>
<p>area_ha: projectData.areaHa,</p>
<p>project_age_years: 0,</p>
<p>}).catch(err =&gt; console.warn('MRV auto-trigger failed (non-critical):', err.message));</p>
<p>// This is fire-and-forget — project creation succeeds even if MRV is offline.</p>
<p>// Verifier dashboard will show 'MRV Pending' until score arrives.</p></td>
</tr>
</tbody>
</table>

|     |                                          |
|-----|------------------------------------------|
|     | **05 MRV REPORT GENERATOR — PDF OUTPUT** |

<table style="width:93%;">
<colgroup>
<col style="width: 1%" />
<col style="width: 91%" />
</colgroup>
<tbody>
<tr>
<td></td>
<td><p><strong>Why the PDF Matters More Than the Dashboard</strong></p>
<p>NGOs, auditors, and government bodies need something they can email, print, and file.</p>
<p>The MRV Report PDF is the 'product' investors are actually buying — not the UI.</p>
<p>It must look professional, include the NDVI chart, trust score breakdown, and</p>
<p>a SHA-256 hash that links back to the blockchain audit trail.</p></td>
</tr>
</tbody>
</table>

**report_generator.py**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># mrv-service/report_generator.py</p>
<p>import matplotlib.pyplot as plt</p>
<p>import matplotlib.dates as mdates</p>
<p>import io, base64, hashlib, json</p>
<p>from datetime import datetime</p>
<p>from jinja2 import Environment, FileSystemLoader</p>
<p>from weasyprint import HTML</p>
<p>from google.cloud import storage as gcs</p>
<p>from config import settings</p>
<p>class ReportGenerator:</p>
<p>def __init__(self):</p>
<p>self.jinja = Environment(loader=FileSystemLoader('templates/'))</p>
<p>self.gcs = gcs.Client()</p>
<p>def generate(self, project_id: int, score: dict, ndvi_data: list) -&gt; str:</p>
<p>'''Generate PDF, upload to GCS, return public URL.'''</p>
<p>ndvi_chart_b64 = self._generate_ndvi_chart(ndvi_data, score['baseline_ndvi'])</p>
<p>report_id = f'MRV-{project_id}-{datetime.now().strftime("%Y%m%d%H%M%S")}'</p>
<p># Render HTML template</p>
<p>template = self.jinja.get_template('mrv_report.html')</p>
<p>html_content = template.render(</p>
<p>project_id=project_id,</p>
<p>report_id=report_id,</p>
<p>generated_at=datetime.now().strftime('%d %B %Y, %H:%M UTC'),</p>
<p>trust_score=score['trust_score'],</p>
<p>confidence=score['confidence'],</p>
<p>baseline_ndvi=score['baseline_ndvi'],</p>
<p>current_ndvi=score['current_ndvi'],</p>
<p>ndvi_delta_pct=score['ndvi_delta_pct'],</p>
<p>canopy_pct=score['canopy_pct'],</p>
<p>credits_issuable=score['credits_issuable'],</p>
<p>breakdown=score['breakdown'],</p>
<p>red_flag=score['red_flag'],</p>
<p>input_hash=score['input_hash'],</p>
<p>output_hash=score['output_hash'],</p>
<p>ndvi_chart=ndvi_chart_b64,</p>
<p>)</p>
<p># Convert HTML → PDF</p>
<p>pdf_bytes = HTML(string=html_content).write_pdf()</p>
<p># Upload to GCS (same bucket as existing document storage)</p>
<p>bucket = self.gcs.bucket(settings.GCS_BUCKET)</p>
<p>blob = bucket.blob(f'mrv-reports/{report_id}.pdf')</p>
<p>blob.upload_from_string(pdf_bytes, content_type='application/pdf')</p>
<p>blob.make_public()</p>
<p>return blob.public_url</p>
<p>def _generate_ndvi_chart(self, ndvi_data: list, baseline: float) -&gt; str:</p>
<p>'''Generate NDVI time series chart as base64 PNG.'''</p>
<p>months = [d['month'] for d in ndvi_data]</p>
<p>values = [d['ndvi_mean'] for d in ndvi_data]</p>
<p>fig, ax = plt.subplots(figsize=(10, 3.5))</p>
<p>fig.patch.set_facecolor('#F0FDFA')</p>
<p>ax.set_facecolor('#F0FDFA')</p>
<p>ax.plot(months, values, color='#0D9488', linewidth=2.5, marker='o',</p>
<p>markersize=5, label='Monthly NDVI')</p>
<p>ax.axhline(y=baseline, color='#D97706', linestyle='--',</p>
<p>linewidth=1.5, label=f'Baseline ({baseline:.3f})')</p>
<p>ax.fill_between(months, values, baseline,</p>
<p>where=[v &gt;= baseline for v in values],</p>
<p>alpha=0.15, color='#14B8A6', label='Above baseline')</p>
<p>ax.fill_between(months, values, baseline,</p>
<p>where=[v &lt; baseline for v in values],</p>
<p>alpha=0.20, color='#DC2626', label='Below baseline')</p>
<p>ax.set_xlabel('Month', fontsize=9, color='#334155')</p>
<p>ax.set_ylabel('NDVI', fontsize=9, color='#334155')</p>
<p>ax.set_title('Vegetation Health Index (NDVI) — 24-Month History',</p>
<p>fontsize=11, color='#0F172A', fontweight='bold')</p>
<p>ax.legend(fontsize=8)</p>
<p>ax.tick_params(axis='x', rotation=45, labelsize=7)</p>
<p>ax.set_ylim(0, 1)</p>
<p>plt.tight_layout()</p>
<p>buf = io.BytesIO()</p>
<p>plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')</p>
<p>plt.close(fig)</p>
<p>buf.seek(0)</p>
<p>return base64.b64encode(buf.read()).decode('utf-8')</p></td>
</tr>
</tbody>
</table>

|     |                                                |
|-----|------------------------------------------------|
|     | **06 FRONTEND INTEGRATION — REACT COMPONENTS** |

**New Component: MRV Score Badge (Add to Marketplace Cards)**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>// client/src/components/mrv-score-badge.tsx — NEW FILE</p>
<p>import { useQuery } from '@tanstack/react-query';</p>
<p>import { apiRequest } from '@/lib/queryClient';</p>
<p>interface MRVScoreBadgeProps {</p>
<p>projectId: number;</p>
<p>compact?: boolean;</p>
<p>}</p>
<p>export function MRVScoreBadge({ projectId, compact = false }: MRVScoreBadgeProps) {</p>
<p>const { data, isLoading } = useQuery({</p>
<p>queryKey: ['/api/mrv', projectId],</p>
<p>queryFn: () =&gt; apiRequest('GET', `/api/mrv/${projectId}`).then(r =&gt; r.json()),</p>
<p>staleTime: 5 * 60 * 1000, // Cache for 5 minutes</p>
<p>});</p>
<p>if (isLoading) return &lt;div className='w-16 h-6 bg-gray-200 rounded animate-pulse' /&gt;;</p>
<p>if (!data?.data) return &lt;span className='text-xs text-gray-400'&gt;MRV Pending&lt;/span&gt;;</p>
<p>const score = data.data;</p>
<p>const getColor = (s: number) =&gt; s &gt;= 75 ? 'teal' : s &gt;= 50 ? 'amber' : 'red';</p>
<p>const color = getColor(score.trustScore);</p>
<p>if (compact) return (</p>
<p>&lt;div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full</p>
<p>bg-${color}-50 border border-${color}-200`}&gt;</p>
<p>&lt;span className={`text-xs font-bold text-${color}-700`}&gt;</p>
<p>{score.trustScore}/100</p>
<p>&lt;/span&gt;</p>
<p>{score.redFlag &amp;&amp; &lt;span className='text-red-500 text-xs'&gt;⚠&lt;/span&gt;}</p>
<p>&lt;/div&gt;</p>
<p>);</p>
<p>return (</p>
<p>&lt;div className={`p-4 rounded-xl border border-${color}-200 bg-${color}-50`}&gt;</p>
<p>&lt;div className='flex items-center justify-between mb-2'&gt;</p>
<p>&lt;span className='text-xs font-bold text-gray-500 uppercase tracking-wider'&gt;</p>
<p>MRV Trust Score</p>
<p>&lt;/span&gt;</p>
<p>&lt;span className={`text-xs px-2 py-0.5 rounded-full</p>
<p>bg-${color}-100 text-${color}-700 font-semibold`}&gt;</p>
<p>{score.confidence}</p>
<p>&lt;/span&gt;</p>
<p>&lt;/div&gt;</p>
<p>&lt;div className={`text-4xl font-bold text-${color}-600 mb-1`}&gt;</p>
<p>{score.trustScore}&lt;span className='text-lg text-gray-400'&gt;/100&lt;/span&gt;</p>
<p>&lt;/div&gt;</p>
<p>&lt;div className='text-xs text-gray-500 space-y-0.5 mt-2'&gt;</p>
<p>&lt;div&gt;Canopy Density: {score.rawScore?.canopy_pct}%&lt;/div&gt;</p>
<p>&lt;div&gt;NDVI Change: {score.rawScore?.ndvi_delta_pct &gt; 0 ? '+' : ''}{score.rawScore?.ndvi_delta_pct}%&lt;/div&gt;</p>
<p>&lt;div&gt;Credits Issuable: {score.rawScore?.credits_issuable} tCO₂e&lt;/div&gt;</p>
<p>&lt;/div&gt;</p>
<p>{score.redFlag &amp;&amp; (</p>
<p>&lt;div className='mt-3 p-2 bg-red-100 border border-red-200 rounded-lg'&gt;</p>
<p>&lt;span className='text-xs text-red-700 font-semibold'&gt;</p>
<p>⚠ Vegetation decline detected — project flagged for review</p>
<p>&lt;/span&gt;</p>
<p>&lt;/div&gt;</p>
<p>)}</p>
<p>&lt;/div&gt;</p>
<p>);</p>
<p>}</p></td>
</tr>
</tbody>
</table>

|     |                                                         |
|-----|---------------------------------------------------------|
|     | **07 DEPLOYMENT — RUNNING ALONGSIDE EXISTING PLATFORM** |

<table style="width:93%;">
<colgroup>
<col style="width: 1%" />
<col style="width: 91%" />
</colgroup>
<tbody>
<tr>
<td></td>
<td><p><strong>Zero Downtime Integration</strong></p>
<p>The MRV service deploys as a separate process on the same EC2 instance.</p>
<p>The existing Node.js platform keeps running on port 5000.</p>
<p>MRV runs on port 8001. They communicate via localhost HTTP.</p>
<p>PM2 manages both processes.</p></td>
</tr>
</tbody>
</table>

**PM2 Configuration — ecosystem.config.js**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p>// ecosystem.config.js — UPDATE (add mrv-service app, keep existing)</p>
<p>module.exports = {</p>
<p>apps: [</p>
<p>// EXISTING (do not change)</p>
<p>{</p>
<p>name: 'nevara-backend',</p>
<p>script: 'server/index.ts',</p>
<p>interpreter: 'node',</p>
<p>interpreter_args: '--loader ts-node/esm',</p>
<p>env: { NODE_ENV: 'production', PORT: 5000 },</p>
<p>watch: false,</p>
<p>autorestart: true,</p>
<p>},</p>
<p>// NEW — MRV Service</p>
<p>{</p>
<p>name: 'nevara-mrv',</p>
<p>script: 'uvicorn',</p>
<p>args: 'main:app --host 0.0.0.0 --port 8001 --workers 2',</p>
<p>cwd: './mrv-service',</p>
<p>interpreter: 'python3',</p>
<p>env: {</p>
<p>PYTHONPATH: './mrv-service',</p>
<p>NODE_ENV: 'production',</p>
<p>},</p>
<p>watch: false,</p>
<p>autorestart: true,</p>
<p>max_memory_restart: '512M',</p>
<p>},</p>
<p>],</p>
<p>};</p>
<p># To start both services:</p>
<p># pm2 start ecosystem.config.js</p>
<p># To check status:</p>
<p># pm2 status</p>
<p># To view MRV logs:</p>
<p># pm2 logs nevara-mrv</p></td>
</tr>
</tbody>
</table>

**AWS EC2 Security Group — Open Port 8001 for Internal Only**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># Port 8001 should be accessible ONLY from localhost (not internet)</p>
<p># In AWS Security Group — do NOT add an inbound rule for port 8001</p>
<p># The Node.js backend calls MRV via localhost:8001 — same machine</p>
<p># Verify port is listening locally after startup:</p>
<p># curl http://localhost:8001/docs → should return FastAPI Swagger UI</p>
<p># If you need to test from your laptop during dev:</p>
<p># ssh -L 8001:localhost:8001 ubuntu@YOUR_EC2_IP</p>
<p># Then: curl http://localhost:8001/docs</p></td>
</tr>
</tbody>
</table>

|     |                                   |
|-----|-----------------------------------|
|     | **08 PHASED IMPLEMENTATION PLAN** |

Build in this exact order. Each phase is independently testable before moving to the next.

|  |
|----|
| **PHASE 1 Database + Service Skeleton** · 2 days · Week 1 |
| **Day 1 AM:** Run migration 0004_mrv_system.sql — creates ndvi_measurements, mrv_scores, mrv_audit_log tables |
| **Day 1 PM:** Create /mrv-service/ directory, install requirements.txt, write config.py, create main.py skeleton with /health endpoint |
| **Day 2 AM:** Write scoring_engine.py with full unit tests — this must be tested before connecting to GEE |
| **Day 2 PM:** Write audit_logger.py — append-only log with SHA-256 chaining. Verify REVOKE permissions are set. |
| **Verification:** pm2 start nevara-mrv succeeds. curl localhost:8001/health returns {status: ok}. All scoring tests pass. |

|  |
|----|
| **PHASE 2 NDVI Pipeline + GEE Connection** · 3 days · Week 1–2 |
| **Day 1:** Create GEE service account in Google Cloud Console, download credentials JSON, add to .env |
| **Day 2:** Write ndvi_pipeline.py — test fetch_monthly_ndvi() with the Gurupur Estuary polygon as hardcoded test input |
| **Day 3:** Verify NDVI values returned make scientific sense (mangroves should show NDVI 0.5–0.9). Store test results in ndvi_measurements table. |
| **Verification:** A test call to /mrv/trigger with the Mangalore pilot polygon returns job_id and writes to ndvi_measurements within 2 minutes. |

|  |
|----|
| **PHASE 3 Node.js Integration + Webhook** · 2 days · Week 2 |
| **Day 1:** Add all 4 new routes to server/routes.ts. Add MRV_SERVICE_URL and MRV_INTERNAL_SECRET to .env. Add fire-and-forget MRV trigger to existing project submission route. |
| **Day 2:** Test full end-to-end: submit project via contributor dashboard → check verifier dashboard shows 'MRV Pending' → score arrives via webhook → verifier sees trust score. |
| **Verification:** Submit a test project. Within 3 minutes, the verifier dashboard shows a trust score badge. No errors in pm2 logs nevara-mrv or pm2 logs nevara-backend. |

|  |
|----|
| **PHASE 4 PDF Report Generator** · 2 days · Week 2–3 |
| **Day 1:** Write mrv_report.html template with NEVARA branding, NDVI chart placeholder, score breakdown table, SHA-256 hash footer, methodology section referencing IPCC and Verra VM0033. |
| **Day 2:** Write report_generator.py — render HTML, generate NDVI chart via matplotlib, convert to PDF via WeasyPrint, upload to existing GCS bucket. |
| **Verification:** Generated PDF opens cleanly, shows NDVI chart, trust score, breakdown, and QR-linkable hash. PDF is publicly accessible via GCS URL. |

|  |
|----|
| **PHASE 5 Frontend Components + Verifier Dashboard** · 2 days · Week 3 |
| **Day 1:** Create mrv-score-badge.tsx. Add MRV badge to marketplace project cards. Add MRV section to verifier-dashboard.tsx — show score, confidence, red flag status, and PDF link. |
| **Day 2:** Create mrv-report.tsx — dedicated page showing NDVI time series chart (Recharts), full score breakdown, audit trail hash verification. Route: /projects/:id/mrv-report |
| **Verification:** Full 'money moment' flow: contributor submits → MRV scores → verifier sees score → approves → buyer sees MRV badge on marketplace card → downloads PDF report. |

|     |                     |
|-----|---------------------|
|     | **09 TESTING PLAN** |

**Unit Tests — tests/test_scoring.py**

<table style="width:93%;">
<colgroup>
<col style="width: 92%" />
</colgroup>
<tbody>
<tr>
<td><p># mrv-service/tests/test_scoring.py</p>
<p>from scoring_engine import ScoringEngine</p>
<p>def make_ndvi(n_months: int, mean_val: float) -&gt; list:</p>
<p>return [{'month': f'2024-{i+1:02d}', 'ndvi_mean': mean_val} for i in range(n_months)]</p>
<p>def test_healthy_mangrove():</p>
<p>engine = ScoringEngine()</p>
<p>ndvi = make_ndvi(18, 0.72) # Consistent healthy NDVI</p>
<p>baseline = sum(d['ndvi_mean'] for d in ndvi[:6]) / 6</p>
<p>result = engine.compute(ndvi, baseline, 'mangrove', 10.0, 3.0)</p>
<p>assert result['trust_score'] &gt;= 60</p>
<p>assert result['confidence'] in ('HIGH', 'MEDIUM')</p>
<p>assert result['red_flag'] == False</p>
<p>assert result['credits_issuable'] &gt; 0</p>
<p>def test_declining_vegetation_triggers_red_flag():</p>
<p>engine = ScoringEngine()</p>
<p>baseline_data = make_ndvi(6, 0.70)</p>
<p>declining_data = make_ndvi(6, 0.55) # 21% drop — should trigger red flag</p>
<p>ndvi = baseline_data + declining_data</p>
<p>baseline = 0.70</p>
<p>result = engine.compute(ndvi, baseline, 'mangrove', 5.0, 1.0)</p>
<p>assert result['red_flag'] == True</p>
<p>assert result['trust_score'] &lt; 50</p>
<p>def test_insufficient_data_gives_low_confidence():</p>
<p>engine = ScoringEngine()</p>
<p>ndvi = make_ndvi(3, 0.65) # Only 3 months</p>
<p>result = engine.compute(ndvi, 0.65, 'seagrass', 2.0, 0.5)</p>
<p>assert result['confidence'] == 'LOW'</p>
<p>def test_audit_hashes_are_deterministic():</p>
<p>engine = ScoringEngine()</p>
<p>ndvi = make_ndvi(12, 0.68)</p>
<p>r1 = engine.compute(ndvi, 0.68, 'saltmarsh', 3.0, 1.0)</p>
<p>r2 = engine.compute(ndvi, 0.68, 'saltmarsh', 3.0, 1.0)</p>
<p>assert r1['input_hash'] == r2['input_hash'] # Same inputs = same hash</p>
<p>assert r1['output_hash'] == r2['output_hash']</p>
<p># Run with: cd mrv-service &amp;&amp; pytest tests/ -v</p></td>
</tr>
</tbody>
</table>

|     |                               |
|-----|-------------------------------|
|     | **10 IMPLEMENTATION SUMMARY** |

|  |  |  |
|----|----|----|
| **File / Location** | **Action** | **Risk Level** |
| migrations/0004_mrv_system.sql | CREATE new file — run migration | Zero risk to existing data |
| mrv-service/ (entire directory) | CREATE new — standalone service | Zero risk to existing code |
| server/routes.ts | ADD 4 new routes (additive only) | Low — no existing routes modified |
| server/routes.ts — project submit | ADD fire-and-forget MRV trigger call | Low — non-blocking, won't fail submission |
| .env (existing file) | APPEND 4 new keys only | Zero risk — adds, not replaces |
| ecosystem.config.js | ADD new PM2 app (nevara-mrv) | Zero risk to existing nevara-backend |
| client/src/components/mrv-score-badge.tsx | CREATE new component | Zero risk to existing UI |
| client/src/pages/mrv-report.tsx | CREATE new page + route | Zero risk to existing pages |
| client/src/pages/verifier-dashboard.tsx | ADD MRV section to existing dashboard | Low — additive UI change only |
| client/src/pages/marketplace.tsx | ADD MRV badge to project cards | Low — additive UI change only |

<table style="width:93%;">
<colgroup>
<col style="width: 1%" />
<col style="width: 91%" />
</colgroup>
<tbody>
<tr>
<td></td>
<td><p><strong>The Investor Pitch After MRV</strong></p>
<p>Before MRV: 'We verify carbon projects using expert reviewers and blockchain.'</p>
<p>After MRV: 'Every project is pre-screened by our MRV engine using Sentinel-2 satellite</p>
<p>imagery. The system computes an NDVI baseline, detects vegetation changes,</p>
<p>generates a trust score, produces an auditor-ready PDF report with a</p>
<p>SHA-256 hash, and logs everything to an append-only blockchain audit trail.</p>
<p>By the time a human verifier sees a project, the science is already done.'</p>
<p>That is the difference between a listing platform and carbon market infrastructure.</p></td>
</tr>
</tbody>
</table>

NEVARA BlueCarbon Ledger · MRV Implementation Plan · Tahir Tamam · April 2026
