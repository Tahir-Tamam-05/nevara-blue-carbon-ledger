NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

≋ 

N E VA R A  

BlueCarbon Ledger 

M R V   S Y S T E M  

Produc9on Implementa9on Plan 

Tahir Tamam  ·  Lead Engineer  ·  April 2026

00  E X E C U T I V E   S U M M A R Y

What This Document Is 

This document deﬁnes the complete, produc2on-grade implementa2on plan for the NEVARA MRV 

(Monitoring, Repor2ng, Veriﬁca2on) system — the credibility engine that transforms NEVARA 

from a lis2ng plaRorm into legi2mate carbon market infrastructure. 

It is wriTen for developers who will implement this safely alongside the exis2ng live plaRorm. 

Every instruc2on speciﬁes exact ﬁle paths, API contracts, database schemas, and integra2on 

points within the current NEVARA codebase.

The Core Transforma9on:  Without MRV, NEVARA is a marketplace. With MRV, NEVARA is infrastructure.


Without MRV

With MRV

Lis2ng plaRorm for carbon credits

Credibility engine for carbon markets

Manual veriﬁer reviews unscored projects

AI pre-scores every project before human review

Basic PDF cer2ﬁcate with QR link

Full MRV Report: NDVI charts, trust score, methodology

Blockchain logs transac2on data only

Blockchain logs MRV inputs, outputs, and hash proofs

Investor ques2on: 'How do you verify?'

Investor answer: 'Here is the audit trail — scan this QR'

NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

01  S Y S T E M   A R C H I T E C T U R E   —   W H E R E   M R V   F I T S

Current NEVARA Layer Stack


Layer

Current Status

MRV Impact

Contributor Portal

Veriﬁca2on Dashboard

Blockchain Registry

Live ✅  — GIS polygon draw, project 

submit

MRV auto-triggers on project 
submission

Live ✅  — human approve/reject/

clarify

MRV score displayed before human 
review

Live ✅  — SHA-256 + Merkle, public 

explorer

MRV inputs/outputs logged as signed 
blocks

Carbon Credit Marketplace

Live ✅  — browse, purchase, cer2ﬁcate

MRV Report replaces basic PDF 
cer2ﬁcate

Admin Governance

Live ✅  — user mgmt, audit logs, 

rollback

MRV Engine

NOT YET BUILT ❌

MRV pipeline status monitored here

New standalone service — built in this 
plan

New Architecture with MRV Layer


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# NEVARA — Full System Architecture (Post-MRV) 

┌─────────────────────────────────────────────────┐ 

│  FRONTEND  (React + TypeScript + Vite)          │ 

│  /client/src/pages/                             │ 

│   ├── user-dashboard.tsx  (contributor)         │ 

│   ├── verifier-dashboard.tsx  ← MRV scores here│ 

│   ├── marketplace.tsx         ← MRV badge       │ 

│   └── mrv-report.tsx          ← NEW PAGE        │ 

└─────────────┬───────────────────────────────────┘ 

              │  HTTP / REST 

┌─────────────▼───────────────────────────────────┐ 

│  EXISTING BACKEND  (Node.js + Express)           │ 

│  /server/routes.ts                              │ 

│   └── POST /api/mrv/trigger    ← NEW ROUTE      │ 

│   └── GET  /api/mrv/:projectId ← NEW ROUTE      │ 

└─────────────┬───────────────────────────────────┘ 

              │  Internal HTTP (localhost:8001) 

┌─────────────▼───────────────────────────────────┐ 

│  MRV SERVICE  (Python FastAPI)  ← NEW SERVICE   │ 

│  /mrv-service/                                  │ 

│   ├── main.py         (FastAPI app entry)       │ 

│   ├── ndvi_pipeline.py (GEE satellite fetch)    │ 

│   ├── scoring_engine.py (trust score calc)      │ 

│   ├── report_generator.py (PDF via WeasyPrint)  │ 

│   └── audit_logger.py  (append-only hash log)   │ 

└─────────────┬───────────────────────────────────┘ 

              │  SQL 

┌─────────────▼───────────────────────────────────┐ 

│  DATABASE  (PostgreSQL + PostGIS on AWS RDS)     │ 

│  Existing tables + new:                         │ 

│   ├── ndvi_measurements  ← NEW TABLE            │ 

│   ├── mrv_scores         ← NEW TABLE            │ 

│   └── mrv_audit_log      ← NEW TABLE            │ 

└─────────────────────────────────────────────────┘

NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

⚠   Cri9cal Safety Rule 

The MRV service is a NEW standalone Python FastAPI service running on port 8001. 

It does NOT modify any exis2ng Node.js routes, schemas, or components. 

The exis2ng plaRorm con2nues working exactly as before during the en2re build. 

MRV is integrated addi2vely — never by replacing or modifying live produc2on code.

02  D ATA B A S E   S C H E M A   —   N E W   TA B L E S

Migra9on Strategy 

Run these as new Drizzle migra2ons. Do NOT alter any exis2ng tables. 

File loca2on: /migra2ons/0004_mrv_system.sql 

Run with: npm run db:migrate  (your exis2ng migra2on command)

Table 1: ndvi_measurements


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

-- /migrations/0004_mrv_system.sql 

-- Enable PostGIS (run once — safe if already enabled) 

CREATE EXTENSION IF NOT EXISTS postgis; 

CREATE TABLE ndvi_measurements ( 

  id              SERIAL PRIMARY KEY, 

  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, 

  measured_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 

  ndvi_mean       DECIMAL(6, 4) NOT NULL,  -- e.g. 0.7823 

  ndvi_min        DECIMAL(6, 4), 

  ndvi_max        DECIMAL(6, 4), 

  cloud_cover_pct DECIMAL(5, 2),            -- % cloud cover at measurement time 

  satellite_source VARCHAR(50) DEFAULT 'Sentinel-2', 

  polygon         GEOMETRY(POLYGON, 4326),  -- PostGIS spatial type (WGS84) 

  raw_gee_response JSONB,                   -- Store full GEE response for audit 

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() 

); 

CREATE INDEX idx_ndvi_project_id ON ndvi_measurements(project_id); 

CREATE INDEX idx_ndvi_measured_at ON ndvi_measurements(measured_at); 

CREATE INDEX idx_ndvi_polygon ON ndvi_measurements USING GIST(polygon);

Table 2: mrv_scores


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

CREATE TABLE mrv_scores ( 

  id              SERIAL PRIMARY KEY, 

  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, 

  scored_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 

  -- Core score output 

  trust_score     INTEGER NOT NULL CHECK (trust_score BETWEEN 0 AND 100), 

  confidence      VARCHAR(10) CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')), 

  -- Score breakdown (transparent, not a black box) 

  baseline_ndvi   DECIMAL(6, 4),    -- avg NDVI from first 6 months 

  current_ndvi    DECIMAL(6, 4),    -- most recent monthly avg 

  ndvi_delta_pct  DECIMAL(6, 2),    -- % change vs baseline 

  canopy_pct      DECIMAL(5, 2),    -- estimated canopy density % 

  ecosystem_factor DECIMAL(4, 2),   -- 0.9 mangrove, 0.7 seagrass, 0.75 saltmarsh 

  area_ha         DECIMAL(12, 4),   -- from GIS polygon 

  -- Flags 

  red_flag        BOOLEAN DEFAULT FALSE,  -- TRUE if NDVI drops >15% below baseline 

  data_gap_months INTEGER DEFAULT 0,      -- months with no satellite data 

  -- MRV report reference 

  report_pdf_url  TEXT,             -- GCS URL of generated PDF 

  report_html     TEXT,             -- Stored HTML for re-generation 

  -- Audit 

  input_hash      VARCHAR(64),      -- SHA-256 of all inputs 

  output_hash     VARCHAR(64),      -- SHA-256 of all outputs 

  scoring_version VARCHAR(20) DEFAULT 'v1.0' 

); 

CREATE INDEX idx_mrv_project ON mrv_scores(project_id); 

CREATE INDEX idx_mrv_scored_at ON mrv_scores(scored_at DESC); 

CREATE UNIQUE INDEX idx_mrv_latest ON mrv_scores(project_id, scored_at DESC);

NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

Table 3: mrv_audit_log (Append-Only — Cri9cal)


CREATE TABLE mrv_audit_log ( 

  id            BIGSERIAL PRIMARY KEY, 

  logged_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 

  project_id    INTEGER NOT NULL, 

  event_type    VARCHAR(50) NOT NULL,   -- 'MRV_TRIGGERED' | 'SCORE_COMPUTED' | 
'REPORT_GENERATED' | 'BLOCKCHAIN_LOGGED' 

  payload       JSONB NOT NULL,         -- Full inputs and outputs 

  sha256_hash   VARCHAR(64) NOT NULL,   -- SHA-256 of payload 

  prev_hash     VARCHAR(64),            -- Links to previous entry (chain integrity) 

  scorer_version VARCHAR(20) 

); 

-- CRITICAL: Revoke UPDATE and DELETE to make this table truly append-only 

-- Run as database superuser after creating the table: 

REVOKE UPDATE, DELETE ON mrv_audit_log FROM nevara_app_user; 

-- Verify the grant is set: 

-- SELECT grantee, privilege_type FROM information_schema.role_table_grants 

-- WHERE table_name = 'mrv_audit_log';

03  M R V   S E R V I C E   —   P Y T H O N   FA S TA P I

Repository Structure


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# Create this folder at the project root (same level as /client and /server) 

BLUECARBONPROJECT-main/ 

├── client/                  # existing — DO NOT TOUCH 

├── server/                  # existing — DO NOT TOUCH 

├── shared/                  # existing — DO NOT TOUCH 

├── migrations/              # existing — add 0004_mrv_system.sql here 

│ 

└── mrv-service/             # ← CREATE THIS 

    ├── main.py 

    ├── config.py 

    ├── ndvi_pipeline.py 

    ├── scoring_engine.py 

    ├── report_generator.py 

    ├── audit_logger.py 

    ├── models.py 

    ├── requirements.txt 

    ├── templates/ 

    │   └── mrv_report.html 

    └── tests/ 

        ├── test_scoring.py 

        └── test_pipeline.py

requirements.txt


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

fastapi==0.110.0 

uvicorn==0.29.0 

earthengine-api==0.1.390 

geojson==3.1.0 

shapely==2.0.3 

psycopg2-binary==2.9.9 

sqlalchemy==2.0.29 

geoalchemy2==0.15.0 

weasyprint==62.1 

jinja2==3.1.3 

matplotlib==3.8.4 

pandas==2.2.1 

numpy==1.26.4 

httpx==0.27.0 

pydantic==2.7.0 

python-dotenv==1.0.1 

pytest==8.1.1

conﬁg.py — Environment Variables


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# mrv-service/config.py 

from pydantic_settings import BaseSettings 

class Settings(BaseSettings): 

    DATABASE_URL: str           # Same as Node.js .env DATABASE_URL 

    GEE_SERVICE_ACCOUNT: str    # Google Earth Engine service account email 

    GEE_PRIVATE_KEY_FILE: str   # Path to GEE .json credentials file 

    GCS_BUCKET: str             # Your existing GCS bucket (for PDF storage) 

    MRV_SERVICE_PORT: int = 8001 

    NEVARA_BACKEND_URL: str = 'http://localhost:5000'  # Node.js backend 

    class Config: 

        env_file = '../.env'    # Reuse the existing .env at project root 

settings = Settings() 

# .env additions required (append to existing .env — do not replace): 

# GEE_SERVICE_ACCOUNT=nevara-mrv@your-gcp-project.iam.gserviceaccount.com 

# GEE_PRIVATE_KEY_FILE=./mrv-service/gee-credentials.json 

# MRV_SERVICE_PORT=8001

main.py — FastAPI Applica9on Entry Point


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# mrv-service/main.py 

from fastapi import FastAPI, HTTPException, BackgroundTasks 

from fastapi.middleware.cors import CORSMiddleware 

from pydantic import BaseModel 

from typing import Optional 

import uvicorn 

from ndvi_pipeline import NDVIPipeline 

from scoring_engine import ScoringEngine 

from report_generator import ReportGenerator 

from audit_logger import AuditLogger 

from config import settings 

app = FastAPI(title='NEVARA MRV Service', version='1.0.0') 

app.add_middleware(CORSMiddleware, 

    allow_origins=[settings.NEVARA_BACKEND_URL], 

    allow_methods=['GET', 'POST'], 

    allow_headers=['Authorization', 'Content-Type'], 

) 

class MRVTriggerRequest(BaseModel): 

    project_id: int 

    polygon_geojson: dict       # GeoJSON from contributor's GIS draw 

    ecosystem_type: str         # 'mangrove' | 'seagrass' | 'saltmarsh' 

    area_ha: float 

    project_age_years: float 

@app.post('/mrv/trigger') 

async def trigger_mrv(req: MRVTriggerRequest, background_tasks: BackgroundTasks): 

    ''' 

    Triggered by Node.js backend when a project is submitted. 

    Returns immediately with job_id — scoring runs in background. 

    ''' 

    audit = AuditLogger(req.project_id) 

    job_id = audit.log_trigger(req.dict()) 
NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

ndvi_pipeline.py — Satellite Data


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# mrv-service/ndvi_pipeline.py 

import ee 

import json 

import pandas as pd 

from datetime import datetime, timedelta 

from config import settings 

class NDVIPipeline: 

    def __init__(self): 

        # Authenticate with Google Earth Engine 

        credentials = ee.ServiceAccountCredentials( 

            settings.GEE_SERVICE_ACCOUNT, 

            settings.GEE_PRIVATE_KEY_FILE 

        ) 

        ee.Initialize(credentials) 

    def fetch_monthly_ndvi(self, polygon_geojson: dict) -> list[dict]: 

        ''' 

        Fetch monthly NDVI averages for the past 24 months. 

        Returns: [{'month': '2024-01', 'ndvi_mean': 0.72, 'cloud_cover': 12.3}, ...] 

        ''' 

        region = ee.Geometry.Polygon(polygon_geojson['coordinates']) 

        end_date   = datetime.now() 

        start_date = end_date - timedelta(days=730)  # 24 months 

        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') 

            .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-
%d')) 

            .filterBounds(region) 

            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)), 

            .map(self._add_ndvi) 

        ) 

        # Aggregate to monthly means 

        months = self._get_month_list(start_date, end_date) 
NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

scoring_engine.py — Trust Score (Core IP)


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# mrv-service/scoring_engine.py 

# This is NEVARA's core IP — transparent, explainable, auditable. 

# Formula: Credits = A × C_eco × Q × (1 - 0.20) × T 

import hashlib, json 

from dataclasses import dataclass 

ECOSYSTEM_FACTORS = { 

    'mangrove':  0.90, 

    'seagrass':  0.70, 

    'saltmarsh': 0.75, 

} 

ECOSYSTEM_CARBON_RATE = {  # tCO2e / ha / year (IPCC conservative midpoints) 

    'mangrove':  7.0, 

    'seagrass':  3.5, 

    'saltmarsh': 4.0, 

} 

@dataclass 

class ScoreResult: 

    trust_score:     int        # 0–100 

    confidence:      str        # HIGH | MEDIUM | LOW 

    baseline_ndvi:   float 

    current_ndvi:    float 

    ndvi_delta_pct:  float      # % change from baseline 

    canopy_pct:      float      # estimated from NDVI 

    ecosystem_factor: float 

    area_ha:         float 

    red_flag:        bool 

    credits_estimate: float     # Estimated tCO2e (before buffer) 

    credits_issuable: float     # After 20% buffer deduction 

    breakdown:       dict       # Why the score is what it is 

    input_hash:      str        # SHA-256 of all inputs 

    output_hash:     str        # SHA-256 of all outputs 

NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

04  N O D E . J S   B A C K E N D   I N T E G R AT I O N

Safety Rule — Addi9ve Only 

Add only new routes to server/routes.ts. Do not modify any exis2ng route handlers. 

The MRV service is called via internal HTTP, not imported directly. 

All exis2ng endpoints con2nue working unchanged.

New Routes to Add in server/routes.ts


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

// server/routes.ts — ADD THESE ROUTES (do not modify existing routes) 

import axios from 'axios'; 

const MRV_SERVICE_URL = process.env.MRV_SERVICE_URL || 'http://localhost:8001'; 

// ── Route 1: Trigger MRV when a project is submitted ──────────────── 

// Called automatically from existing project submission logic 

app.post('/api/mrv/trigger', authenticateToken, async (req, res) => { 

  try { 

    const { projectId, polygonGeojson, ecosystemType, areaHa, projectAgeYears } = 
req.body; 

    // Validate project exists and belongs to requester 

    const project = await storage.getProject(projectId); 

    if (!project) return res.status(404).json({ message: 'Project not found' }); 

    const mrvResponse = await axios.post(`${MRV_SERVICE_URL}/mrv/trigger`, { 

      project_id: projectId, 

      polygon_geojson: polygonGeojson, 

      ecosystem_type: ecosystemType, 

      area_ha: areaHa, 

      project_age_years: projectAgeYears ?? 0, 

    }, { timeout: 5000 }); 

    await storage.updateProjectMrvStatus(projectId, 'PENDING'); 

    await auditLog.record(req.user.id, 'MRV_TRIGGERED', { projectId }); 

    return res.json({ success: true, jobId: mrvResponse.data.job_id }); 

  } catch (err) { 

    console.error('MRV trigger failed:', err.message); 

    return res.status(500).json({ message: 'MRV service unavailable — score 
pending' }); 

  } 

}); 

NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

Modify Project Submission — Trigger MRV Automa9cally


// server/routes.ts — Find your existing project submission route 

// It likely looks like: app.post('/api/projects', ...) 

// Add this AFTER the project is created successfully: 

// EXISTING CODE (example): 

// const project = await storage.createProject({ ...projectData }); 

// await blockchain.recordProject(project); 

// ADD AFTER (non-blocking — don't await, don't fail submission if MRV fails): 

axios.post(`${MRV_SERVICE_URL}/mrv/trigger`, { 

    project_id:          project.id, 

    polygon_geojson:     projectData.polygon, 

    ecosystem_type:      projectData.ecosystemType, 

    area_ha:             projectData.areaHa, 

    project_age_years:   0, 

}).catch(err => console.warn('MRV auto-trigger failed (non-critical):', 
err.message)); 

// This is fire-and-forget — project creation succeeds even if MRV is offline. 

// Verifier dashboard will show 'MRV Pending' until score arrives.

05  M R V   R E P O R T   G E N E R ATO R   —   P D F   O U T P U T

Why the PDF Macers More Than the Dashboard 

NGOs, auditors, and government bodies need something they can email, print, and ﬁle. 

The MRV Report PDF is the 'product' investors are actually buying — not the UI. 

It must look professional, include the NDVI chart, trust score breakdown, and 

a SHA-256 hash that links back to the blockchain audit trail.

report_generator.py


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# mrv-service/report_generator.py 

import matplotlib.pyplot as plt 

import matplotlib.dates as mdates 

import io, base64, hashlib, json 

from datetime import datetime 

from jinja2 import Environment, FileSystemLoader 

from weasyprint import HTML 

from google.cloud import storage as gcs 

from config import settings 

class ReportGenerator: 

    def __init__(self): 

        self.jinja = Environment(loader=FileSystemLoader('templates/')) 

        self.gcs   = gcs.Client() 

    def generate(self, project_id: int, score: dict, ndvi_data: list) -> str: 

        '''Generate PDF, upload to GCS, return public URL.''' 

        ndvi_chart_b64 = self._generate_ndvi_chart(ndvi_data, score['baseline_ndvi']) 

        report_id = f'MRV-{project_id}-{datetime.now().strftime("%Y%m%d%H%M%S")}' 

        # Render HTML template 

        template = self.jinja.get_template('mrv_report.html') 

        html_content = template.render( 

            project_id=project_id, 

            report_id=report_id, 

            generated_at=datetime.now().strftime('%d %B %Y, %H:%M UTC'), 

            trust_score=score['trust_score'], 

            confidence=score['confidence'], 

            baseline_ndvi=score['baseline_ndvi'], 

            current_ndvi=score['current_ndvi'], 

            ndvi_delta_pct=score['ndvi_delta_pct'], 

            canopy_pct=score['canopy_pct'], 

            credits_issuable=score['credits_issuable'], 

            breakdown=score['breakdown'], 

            red_flag=score['red_flag'], 
NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

06  F R O N T E N D   I N T E G R AT I O N   —   R E A C T   C O M P O N E N T S

New Component: MRV Score Badge (Add to Marketplace Cards)


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

// client/src/components/mrv-score-badge.tsx — NEW FILE 

import { useQuery } from '@tanstack/react-query'; 

import { apiRequest } from '@/lib/queryClient'; 

interface MRVScoreBadgeProps { 

  projectId: number; 

  compact?: boolean; 

} 

export function MRVScoreBadge({ projectId, compact = false }: MRVScoreBadgeProps) { 

  const { data, isLoading } = useQuery({ 

    queryKey: ['/api/mrv', projectId], 

    queryFn: () => apiRequest('GET', `/api/mrv/${projectId}`).then(r => r.json()), 

    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes 

  }); 

  if (isLoading) return <div className='w-16 h-6 bg-gray-200 rounded animate-pulse' /
>; 

  if (!data?.data) return <span className='text-xs text-gray-400'>MRV Pending</span>; 

  const score = data.data; 

  const getColor = (s: number) => s >= 75 ? 'teal' : s >= 50 ? 'amber' : 'red'; 

  const color = getColor(score.trustScore); 

  if (compact) return ( 

    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full 

                     bg-${color}-50 border border-${color}-200`}> 

      <span className={`text-xs font-bold text-${color}-700`}> 

        {score.trustScore}/100 

      </span> 

      {score.redFlag && <span className='text-red-500 text-xs'>⚠</span>} 

    </div> 

  ); 

  return ( 
NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

07  D E P L OY M E N T   —   R U N N I N G   A L O N G S I D E   E X I S T I N G   P L AT F O R M

Zero Down9me Integra9on 

The MRV service deploys as a separate process on the same EC2 instance. 

The exis2ng Node.js plaRorm keeps running on port 5000. 

MRV runs on port 8001. They communicate via localhost HTTP. 

PM2 manages both processes.

PM2 Conﬁgura9on — ecosystem.conﬁg.js


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

// ecosystem.config.js — UPDATE (add mrv-service app, keep existing) 

module.exports = { 

  apps: [ 

    // EXISTING (do not change) 

    { 

      name: 'nevara-backend', 

      script: 'server/index.ts', 

      interpreter: 'node', 

      interpreter_args: '--loader ts-node/esm', 

      env: { NODE_ENV: 'production', PORT: 5000 }, 

      watch: false, 

      autorestart: true, 

    }, 

    // NEW — MRV Service 

    { 

      name: 'nevara-mrv', 

      script: 'uvicorn', 

      args: 'main:app --host 0.0.0.0 --port 8001 --workers 2', 

      cwd: './mrv-service', 

      interpreter: 'python3', 

      env: { 

        PYTHONPATH: './mrv-service', 

        NODE_ENV: 'production', 

      }, 

      watch: false, 

      autorestart: true, 

      max_memory_restart: '512M', 

    }, 

  ], 

}; 

# To start both services: 

# pm2 start ecosystem.config.js 

# To check status: 
NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

AWS EC2 Security Group — Open Port 8001 for Internal Only


# Port 8001 should be accessible ONLY from localhost (not internet) 

# In AWS Security Group — do NOT add an inbound rule for port 8001 

# The Node.js backend calls MRV via localhost:8001 — same machine 

# Verify port is listening locally after startup: 

# curl http://localhost:8001/docs  → should return FastAPI Swagger UI 

# If you need to test from your laptop during dev: 

# ssh -L 8001:localhost:8001 ubuntu@YOUR_EC2_IP 

# Then: curl http://localhost:8001/docs

08  P H A S E D   I M P L E M E N TAT I O N   P L A N

Build in this exact order. Each phase is independently testable before moving to the next.


PHASE 1  Database + Service Skeleton   ·  2 days  ·  Week 1

Day 1 AM:  Run migra2on 0004_mrv_system.sql — creates ndvi_measurements, mrv_scores, mrv_audit_log 

tables

Day 1 PM:  Create /mrv-service/ directory, install requirements.txt, write conﬁg.py, create main.py skeleton 

with /health endpoint

Day 2 AM:  Write scoring_engine.py with full unit tests — this must be tested before connec2ng to GEE

Day 2 PM:  Write audit_logger.py — append-only log with SHA-256 chaining. Verify REVOKE permissions are set.

Veriﬁca9on:  pm2 start nevara-mrv succeeds. curl localhost:8001/health returns {status: ok}. All scoring tests 

pass.

PHASE 2  NDVI Pipeline + GEE Connec9on   ·  3 days  ·  Week 1–2

Day 1:  Create GEE service account in Google Cloud Console, download creden2als JSON, add to .env

Day 2:  Write ndvi_pipeline.py — test fetch_monthly_ndvi() with the Gurupur Estuary polygon as hardcoded test 

input

Day 3:  Verify NDVI values returned make scien2ﬁc sense (mangroves should show NDVI 0.5–0.9). Store test 

results in ndvi_measurements table.

Veriﬁca9on:  A test call to /mrv/trigger with the Mangalore pilot polygon returns job_id and writes to 

ndvi_measurements within 2 minutes.

PHASE 3  Node.js Integra9on + Webhook   ·  2 days  ·  Week 2

NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

Day 1:  Add all 4 new routes to server/routes.ts. Add MRV_SERVICE_URL and MRV_INTERNAL_SECRET to .env. 

Add ﬁre-and-forget MRV trigger to exis2ng project submission route.

Day 2:  Test full end-to-end: submit project via contributor dashboard → check veriﬁer dashboard shows 'MRV 

Pending' → score arrives via webhook → veriﬁer sees trust score.

Veriﬁca9on:  Submit a test project. Within 3 minutes, the veriﬁer dashboard shows a trust score badge. No errors 

in pm2 logs nevara-mrv or pm2 logs nevara-backend.

PHASE 4  PDF Report Generator   ·  2 days  ·  Week 2–3

Day 1:  Write mrv_report.html template with NEVARA branding, NDVI chart placeholder, score breakdown table, 

SHA-256 hash footer, methodology sec2on referencing IPCC and Verra VM0033.

Day 2:  Write report_generator.py — render HTML, generate NDVI chart via matplotlib, convert to PDF via 

WeasyPrint, upload to exis2ng GCS bucket.

Veriﬁca9on:  Generated PDF opens cleanly, shows NDVI chart, trust score, breakdown, and QR-linkable hash. PDF 

is publicly accessible via GCS URL.

PHASE 5  Frontend Components + Veriﬁer Dashboard   ·  2 days  ·  Week 3

Day 1:  Create mrv-score-badge.tsx. Add MRV badge to marketplace project cards. Add MRV sec2on to veriﬁer-

dashboard.tsx — show score, conﬁdence, red ﬂag status, and PDF link.

Day 2:  Create mrv-report.tsx — dedicated page showing NDVI 2me series chart (Recharts), full score breakdown, 

audit trail hash veriﬁca2on. Route: /projects/:id/mrv-report

Veriﬁca9on:  Full 'money moment' ﬂow: contributor submits → MRV scores → veriﬁer sees score → approves → 

buyer sees MRV badge on marketplace card → downloads PDF report.

09  T E S T I N G   P L A N

Unit Tests — tests/test_scoring.py


NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

# mrv-service/tests/test_scoring.py 

from scoring_engine import ScoringEngine 

def make_ndvi(n_months: int, mean_val: float) -> list: 

    return [{'month': f'2024-{i+1:02d}', 'ndvi_mean': mean_val} for i in 
range(n_months)] 

def test_healthy_mangrove(): 

    engine = ScoringEngine() 

    ndvi = make_ndvi(18, 0.72)  # Consistent healthy NDVI 

    baseline = sum(d['ndvi_mean'] for d in ndvi[:6]) / 6 

    result = engine.compute(ndvi, baseline, 'mangrove', 10.0, 3.0) 

    assert result['trust_score'] >= 60 

    assert result['confidence'] in ('HIGH', 'MEDIUM') 

    assert result['red_flag'] == False 

    assert result['credits_issuable'] > 0 

def test_declining_vegetation_triggers_red_flag(): 

    engine = ScoringEngine() 

    baseline_data = make_ndvi(6, 0.70) 

    declining_data = make_ndvi(6, 0.55)  # 21% drop — should trigger red flag 

    ndvi = baseline_data + declining_data 

    baseline = 0.70 

    result = engine.compute(ndvi, baseline, 'mangrove', 5.0, 1.0) 

    assert result['red_flag'] == True 

    assert result['trust_score'] < 50 

def test_insufficient_data_gives_low_confidence(): 

    engine = ScoringEngine() 

    ndvi = make_ndvi(3, 0.65)  # Only 3 months 

    result = engine.compute(ndvi, 0.65, 'seagrass', 2.0, 0.5) 

    assert result['confidence'] == 'LOW' 

def test_audit_hashes_are_deterministic(): 

    engine = ScoringEngine() 
NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA BlueCarbon Ledger  MRV System — Produc2on Implementa2on Plan  |  Conﬁden2al

10  I M P L E M E N TAT I O N   S U M M A R Y

File / Loca9on

Ac9on

Risk Level

migra2ons/0004_mrv_system.sql

CREATE new ﬁle — run migra2on

Zero risk to exis2ng data

mrv-service/ (en2re directory)

CREATE new — standalone service

Zero risk to exis2ng code

server/routes.ts

ADD 4 new routes (addi2ve only)

server/routes.ts — project submit

ADD ﬁre-and-forget MRV trigger call

.env (exis2ng ﬁle)

APPEND 4 new keys only

ecosystem.conﬁg.js

ADD new PM2 app (nevara-mrv)

Low — no exis2ng routes 
modiﬁed

Low — non-blocking, won't 
fail submission

Zero risk — adds, not 
replaces

Zero risk to exis2ng nevara-
backend

client/src/components/mrv-score-badge.tsx

CREATE new component

Zero risk to exis2ng UI

client/src/pages/mrv-report.tsx

CREATE new page + route

Zero risk to exis2ng pages

client/src/pages/veriﬁer-dashboard.tsx

ADD MRV sec2on to exis2ng dashboard

client/src/pages/marketplace.tsx

ADD MRV badge to project cards

Low — addi2ve UI change 
only

Low — addi2ve UI change 
only

The Investor Pitch Ajer MRV 

Before MRV: 'We verify carbon projects using expert reviewers and blockchain.' 

Auer MRV:  'Every project is pre-screened by our MRV engine using Sen2nel-2 satellite 

             imagery. The system computes an NDVI baseline, detects vegeta2on changes, 

             generates a trust score, produces an auditor-ready PDF report with a 

             SHA-256 hash, and logs everything to an append-only blockchain audit trail. 

             By the 2me a human veriﬁer sees a project, the science is already done.' 

That is the diﬀerence between a lis2ng plaRorm and carbon market infrastructure.

NEVARA BlueCarbon Ledger  ·  MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

NEVARA MRV Implementa2on Plan  ·  Tahir Tamam  ·  April 2026

