# ## 12. DASHBOARD ENHANCEMENT PLAN {#12-dashboard-enhancements}

### 12.1 Contributor Dashboard — Lightweight Enhancements

**Keep everything that exists. Add these panels/cards:**

| Enhancement | Description | Implementation |
|------------|-------------|----------------|
| **Auto-Detection Summary Card** | After polygon submission, show auto-detected ecosystem type, land cover, elevation, water proximity in a clean card | New React component `AutoDetectionCard.tsx` — renders once baseline complete |
| **Monitoring Status Bar** | Shows "Next monitoring in X days" + total snapshots count + current health score | Small status bar component at top of project detail page |
| **Health Score Gauge** | Circular gauge showing 0-100 restoration health score with color coding | Using a lightweight gauge library (e.g., react-circular-progressbar) |
| **Mini NDVI Trend Sparkline** | Tiny inline chart showing NDVI over last 6 snapshots | Sparkline component using Recharts or react-sparklines |
| **Latest Snapshot Card** | Shows key metrics from most recent monitoring: NDVI, water %, green cover %, trend arrow | New card component in project overview |
| **Report Downloads List** | Simple list of all generated reports with download buttons | Already partially exists — add report type badges |
| **Field Evidence Upload** | Button to upload photos/docs with optional GPS coordinates and date | New upload form with drag-drop, EXIF extraction for GPS |
| **Project Timeline (Simplified)** | Vertical timeline of major events (baseline, snapshots, reviews) | Same `ProjectTimeline.tsx` component as verifier, read-only |

**Removal from contributor input form:**
- Remove: ecosystem type manual input
- Remove: location manual input
- Remove: land area manual input
- Keep: project name, description, organization, restoration goal, polygon draw, file uploads

### 12.2 Verifier Dashboard — Lightweight Enhancements

(Details in Section 8 above. Summary of additions to existing layout:)

| Enhancement | Location | Description |
|------------|----------|-------------|
| Environmental Intelligence Tab | New tab in project review page | Contains all Section 8 components |
| Satellite Evidence Panel | Within intelligence tab | Side-by-side baseline vs latest imagery |
| NDVI History Chart | Within intelligence tab | Time-series chart |
| Risk Flags Badge | Project list view | Red/yellow badge showing risk count |
| Layer-Switching Map | Replace or overlay on existing map | Toggle NDVI, land cover, water layers |
| Structured Review Form | Replace simple text review | Multi-section assessment (Section 8.8) |
| Report Downloads | Sidebar or bottom panel | Direct PDF downloads for all reports |
