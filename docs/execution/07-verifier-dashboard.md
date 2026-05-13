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

