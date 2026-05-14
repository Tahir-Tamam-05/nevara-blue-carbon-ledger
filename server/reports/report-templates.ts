/**
 * report-templates.ts
 *
 * HTML report templates for all report types.
 * Uses template literal rendering (no runtime template dependency needed).
 *
 * Sections rendered:
 *  - Cover page (project info, registry ID, generation date)
 *  - Site characterization (ecosystem type, land cover)
 *  - Vegetation baseline (NDVI/EVI/SAVI with indicators)
 *  - Water & moisture (NDWI/NDMI)
 *  - Historical context (NDVI timeline, degradation analysis)
 *  - Change detection (deltas from baseline)
 *  - Ecosystem health index
 *  - Data sources & methodology
 *  - Disclaimer
 *
 * Design:
 *  - Self-contained HTML (inline CSS, no external dependencies)
 *  - Print-media optimized for Puppeteer PDF rendering
 *  - Satellite image thumbnails embedded via file:// paths or data URIs
 */

import path from "path";
import fs from "fs";

// ─── Style ─────────────────────────────────────────────────────────────────────

const REPORT_CSS = `
  @page { size: A4; margin: 18mm 15mm 20mm 15mm; }
  @media print { .no-break { page-break-inside: avoid; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10pt;
    color: #1a1a1a;
    line-height: 1.55;
    background: #fff;
  }
  h1 { font-size: 18pt; color: #1a3a2e; margin-bottom: 4px; }
  h2 { font-size: 13pt; color: #1a3a2e; border-bottom: 2px solid #2d7d4f; padding-bottom: 3px; margin: 18px 0 10px; }
  h3 { font-size: 11pt; color: #2d7d4f; margin: 12px 0 6px; }
  p { margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
  th { background: #2d7d4f; color: #fff; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) td { background: #f7faf8; }
  .cover { text-align: center; padding: 40px 20px 30px; border-bottom: 3px solid #2d7d4f; }
  .cover .logo { font-size: 22pt; font-weight: bold; color: #2d7d4f; letter-spacing: 2px; }
  .cover .subtitle { font-size: 14pt; color: #555; margin: 8px 0 20px; }
  .cover .meta-row { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; margin-top: 16px; }
  .cover .meta-item { text-align: center; }
  .cover .meta-item .label { font-size: 8pt; color: #888; text-transform: uppercase; }
  .cover .meta-item .value { font-size: 11pt; font-weight: bold; color: #1a3a2e; }
  .indicator-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
  .indicator-card { border: 1px solid #d0e8dc; border-radius: 6px; padding: 10px; background: #f7faf8; }
  .indicator-card .name { font-size: 8pt; color: #666; text-transform: uppercase; font-weight: bold; }
  .indicator-card .value { font-size: 16pt; font-weight: bold; color: #2d7d4f; }
  .indicator-card .delta { font-size: 9pt; }
  .indicator-card .delta.positive { color: #1a9850; }
  .indicator-card .delta.negative { color: #d73027; }
  .indicator-card .delta.neutral  { color: #888; }
  .quality-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9pt; font-weight: bold; }
  .quality-A { background: #1a9850; color: #fff; }
  .quality-B { background: #66bd63; color: #fff; }
  .quality-C { background: #fee08b; color: #333; }
  .quality-D { background: #fdae61; color: #fff; }
  .quality-F { background: #d73027; color: #fff; }
  .ehi-bar { height: 14px; border-radius: 7px; background: #e0e0e0; margin: 6px 0; position: relative; }
  .ehi-fill { height: 100%; border-radius: 7px; }
  .timeline-row { display: flex; align-items: center; margin: 4px 0; font-size: 9pt; }
  .timeline-year { width: 50px; font-weight: bold; color: #2d7d4f; }
  .timeline-bar-wrap { flex: 1; height: 14px; background: #e0e0e0; border-radius: 7px; margin: 0 10px; position: relative; }
  .timeline-bar { height: 100%; border-radius: 7px; background: linear-gradient(90deg, #fdae61, #1a9850); }
  .timeline-value { width: 60px; text-align: right; color: #555; }
  .section { margin-top: 24px; }
  .disclaimer { font-size: 8pt; color: #888; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 20px; }
  .risk-flag { background: #fff3cd; border-left: 4px solid #ffc107; padding: 6px 10px; margin: 6px 0; border-radius: 3px; font-size: 9pt; }
  .risk-flag.high { background: #f8d7da; border-color: #dc3545; }
  .satellite-img { max-width: 100%; border-radius: 4px; border: 1px solid #e0e0e0; margin: 8px 0; }
  .row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footnote { font-size: 8pt; color: #999; font-style: italic; }
`;

// ─── Helper formatters ─────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 3): string {
  if (val === null || val === undefined) return "N/A";
  return val.toFixed(decimals);
}

function fmtPct(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return "N/A";
  return `${val.toFixed(decimals)}%`;
}

function deltaClass(val: number | null): string {
  if (val === null) return "neutral";
  return val > 0.005 ? "positive" : val < -0.005 ? "negative" : "neutral";
}

function deltaArrow(val: number | null): string {
  if (val === null) return "";
  return val > 0.005 ? "▲" : val < -0.005 ? "▼" : "—";
}

function ehiColor(ehi: number): string {
  if (ehi >= 70) return "#1a9850";
  if (ehi >= 50) return "#66bd63";
  if (ehi >= 35) return "#fee08b";
  if (ehi >= 20) return "#fdae61";
  return "#d73027";
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Thumbnail embed helper ────────────────────────────────────────────────────

function embedThumbnail(thumbnailPath: string | null | undefined, alt: string): string {
  if (!thumbnailPath) return "";
  // If the path exists on disk, embed as file:// for Puppeteer
  const resolved = path.resolve(process.cwd(), thumbnailPath);
  if (fs.existsSync(resolved)) {
    return `<img class="satellite-img" src="file://${resolved}" alt="${escapeHtml(alt)}">`;
  }
  return "";
}

// ─── Indicator card builder ────────────────────────────────────────────────────

function indicatorCard(
  name: string,
  value: number | null,
  delta: number | null,
  unit = ""
): string {
  const dClass = deltaClass(delta);
  const dArrow = deltaArrow(delta);
  const deltaLabel = delta !== null ? `${dArrow} ${Math.abs(delta).toFixed(3)}${unit}` : "";
  return `
    <div class="indicator-card no-break">
      <div class="name">${escapeHtml(name)}</div>
      <div class="value">${fmt(value)}${unit}</div>
      ${deltaLabel ? `<div class="delta ${dClass}">${deltaLabel} from baseline</div>` : ""}
    </div>`;
}

// ─── NDVI timeline bar chart ──────────────────────────────────────────────────

function renderNdviTimeline(timeline: Array<{ year: number; ndviMean: number | null }>): string {
  if (!timeline || timeline.length === 0) return "<p>No NDVI timeline data available.</p>";
  const validValues = timeline.map((t) => t.ndviMean ?? 0).filter((v) => v > 0);
  const maxValue = Math.max(...validValues, 0.5);

  return timeline
    .map(
      (point) => `
      <div class="timeline-row">
        <span class="timeline-year">${point.year}</span>
        <div class="timeline-bar-wrap">
          <div class="timeline-bar" style="width:${Math.max(0, ((point.ndviMean ?? 0) / maxValue) * 100).toFixed(1)}%"></div>
        </div>
        <span class="timeline-value">${point.ndviMean !== null ? point.ndviMean.toFixed(3) : "N/A"}</span>
      </div>`
    )
    .join("\n");
}

// ─── Dataset attribution table ────────────────────────────────────────────────

function renderAttributionTable(
  attributions: Array<{
    datasetId: string;
    datasetLabel: string;
    imageCount: number;
    dateRangeStart: string;
    dateRangeEnd: string;
    resolutionM: number;
    compositingMethod: string;
    fallbackUsed: boolean;
  }>
): string {
  if (!attributions || attributions.length === 0) {
    return "<p>Dataset information unavailable.</p>";
  }
  const rows = attributions
    .map(
      (a) => `
      <tr>
        <td>${escapeHtml(a.datasetLabel)}</td>
        <td>${escapeHtml(a.dateRangeStart)} – ${escapeHtml(a.dateRangeEnd)}</td>
        <td>${a.resolutionM}m</td>
        <td>${a.imageCount}</td>
        <td>${a.compositingMethod}</td>
        <td>${a.fallbackUsed ? "Yes" : "No"}</td>
      </tr>`
    )
    .join("\n");
  return `
    <table>
      <thead>
        <tr>
          <th>Dataset</th><th>Date Range</th><th>Resolution</th>
          <th>Images</th><th>Method</th><th>Fallback</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─── Public template functions ─────────────────────────────────────────────────

export interface BaselineReportData {
  reportId: string;
  reportType: string;
  version: number;
  generatedAt: string;
  project: {
    id: string;
    name: string;
    location: string | null;
    registryId: string | null;
    ecosystemType?: string | null;
  };
  summary: {
    ndviMean?: number | null;
    ndwiMean?: number | null;
    ndmiMean?: number | null;
    eviMean?: number | null;
    saviMean?: number | null;
    nbrMean?: number | null;
    ecosystemHealthIndex?: number | null;
    qualityScore?: { score: number; grade: string } | null;
    baselineVsCurrent?: {
      delta?: number | null;
      deltaPct?: number | null;
    } | null;
  };
  ndviTimeline?: Array<{ year: number; ndviMean: number | null }>;
  degradationAnalysis?: {
    detected: boolean;
    peakYear?: number | null;
    peakValue?: number | null;
    currentValue?: number | null;
    totalChangePct?: number | null;
    degradationClass?: string | null;
    trendDirection?: string;
    worstDeclineYear?: number | null;
    worstDeclineMagnitude?: number | null;
  };
  deltas?: Array<{
    observationType: string;
    absoluteChange: number | null;
    relativeChangePct: number | null;
    direction: string;
  }>;
  artifacts?: Array<{
    observationType: string;
    thumbnailPath?: string | null;
    tileLayerPath?: string | null;
    sourceDataset?: string | null;
  }>;
  attributions?: Array<{
    datasetId: string;
    datasetLabel: string;
    imageCount: number;
    dateRangeStart: string;
    dateRangeEnd: string;
    resolutionM: number;
    compositingMethod: string;
    fallbackUsed: boolean;
  }>;
  timeline?: Array<{ type: string; date: string; title: string; description: string }>;
  monitoringCycleCount?: number;
  disclaimer?: string;
}

export function renderBaselineReportHtml(data: BaselineReportData): string {
  const projectName = escapeHtml(data.project.name);
  const registryId = escapeHtml(data.project.registryId ?? "Unassigned");
  const location = escapeHtml(data.project.location ?? "N/A");
  const ecosystemType = escapeHtml(
    data.project.ecosystemType?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "N/A"
  );
  const ehi = data.summary.ecosystemHealthIndex ?? 0;
  const qualityGrade = (data.summary.qualityScore?.grade as string) ?? "N/A";

  // Satellite thumbnails
  const ndviThumb = data.artifacts?.find((a) => a.observationType === "ndvi")?.thumbnailPath;
  const ndwiThumb = data.artifacts?.find((a) => a.observationType === "ndwi")?.thumbnailPath;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>NEVARA — ${projectName} Baseline Environmental Assessment</title>
  <meta name="description" content="Baseline Environmental Assessment for ${projectName} generated by NEVARA MRV System">
  <style>${REPORT_CSS}</style>
</head>
<body>

<!-- ══════════════ COVER PAGE ══════════════ -->
<div class="cover no-break">
  <div class="logo">NEVARA</div>
  <div class="subtitle">Blue Carbon Monitoring &amp; MRV System</div>
  <h1>Baseline Environmental Assessment</h1>
  <div class="meta-row">
    <div class="meta-item">
      <div class="label">Project</div>
      <div class="value">${projectName}</div>
    </div>
    <div class="meta-item">
      <div class="label">Registry ID</div>
      <div class="value">${registryId}</div>
    </div>
    <div class="meta-item">
      <div class="label">Location</div>
      <div class="value">${location}</div>
    </div>
    <div class="meta-item">
      <div class="label">Report Date</div>
      <div class="value">${new Date(data.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
    </div>
    <div class="meta-item">
      <div class="label">Version</div>
      <div class="value">v${data.version}</div>
    </div>
  </div>
</div>

<!-- ══════════════ 1. PROJECT OVERVIEW ══════════════ -->
<div class="section no-break">
  <h2>1. Project Overview</h2>
  <table>
    <tr><td><strong>Project Name</strong></td><td>${projectName}</td></tr>
    <tr><td><strong>Registry ID</strong></td><td>${registryId}</td></tr>
    <tr><td><strong>Location</strong></td><td>${location}</td></tr>
    <tr><td><strong>Ecosystem Type</strong></td><td>${ecosystemType}</td></tr>
    <tr><td><strong>Monitoring Cycles</strong></td><td>${data.monitoringCycleCount ?? 1} completed</td></tr>
    <tr><td><strong>Report Generated</strong></td><td>${new Date(data.generatedAt).toISOString()}</td></tr>
  </table>
</div>

<!-- ══════════════ 2. VEGETATION ASSESSMENT ══════════════ -->
<div class="section no-break">
  <h2>2. Vegetation Baseline</h2>
  <div class="indicator-grid">
    ${indicatorCard("NDVI", data.summary.ndviMean ?? null, data.summary.baselineVsCurrent?.delta ?? null)}
    ${indicatorCard("EVI", data.summary.eviMean ?? null, null)}
    ${indicatorCard("SAVI", data.summary.saviMean ?? null, null)}
    ${indicatorCard("NBR", data.summary.nbrMean ?? null, null)}
  </div>
  ${embedThumbnail(ndviThumb, "NDVI Heatmap")}
  <p class="footnote">NDVI: Normalized Difference Vegetation Index. Values above 0.3 indicate healthy vegetation. EVI: Enhanced Vegetation Index. SAVI: Soil-Adjusted Vegetation Index. NBR: Normalized Burn Ratio.</p>
</div>

<!-- ══════════════ 3. WATER & MOISTURE ══════════════ -->
<div class="section no-break">
  <h2>3. Water &amp; Moisture Analysis</h2>
  <div class="indicator-grid">
    ${indicatorCard("NDWI", data.summary.ndwiMean ?? null, null)}
    ${indicatorCard("NDMI", data.summary.ndmiMean ?? null, null)}
  </div>
  ${embedThumbnail(ndwiThumb, "NDWI Water Index")}
  <p class="footnote">NDWI: Water presence (positive = surface water). NDMI: Vegetation moisture content (higher = wetter canopy).</p>
</div>

<!-- ══════════════ 4. ECOSYSTEM HEALTH INDEX ══════════════ -->
<div class="section no-break">
  <h2>4. Ecosystem Health</h2>
  <div class="row-2col">
    <div>
      <h3>Ecosystem Health Index (EHI)</h3>
      <div class="ehi-bar">
        <div class="ehi-fill" style="width:${ehi.toFixed(0)}%; background:${ehiColor(ehi)};"></div>
      </div>
      <p><strong>${ehi.toFixed(1)} / 100</strong> &nbsp;
        Data Quality: <span class="quality-badge quality-${qualityGrade}">${qualityGrade}</span>
      </p>
      <p class="footnote">EHI combines NDVI (30%), NDMI (20%), green cover (25%) and bare soil penalty (25%).</p>
    </div>
    ${data.deltas && data.deltas.length > 0
      ? `<div>
          <h3>Change From Baseline</h3>
          <table>
            <thead><tr><th>Indicator</th><th>Change</th><th>Change %</th><th>Direction</th></tr></thead>
            <tbody>
              ${data.deltas
                .map(
                  (d) => `
                  <tr>
                    <td>${escapeHtml(d.observationType.toUpperCase())}</td>
                    <td class="${deltaClass(d.absoluteChange)}">${d.absoluteChange !== null ? (d.absoluteChange > 0 ? "+" : "") + d.absoluteChange.toFixed(4) : "N/A"}</td>
                    <td class="${deltaClass(d.relativeChangePct)}">${d.relativeChangePct !== null ? (d.relativeChangePct > 0 ? "+" : "") + d.relativeChangePct.toFixed(1) + "%" : "N/A"}</td>
                    <td>${escapeHtml(d.direction.replace(/_/g, " "))}</td>
                  </tr>`
                )
                .join("\n")}
            </tbody>
          </table>
        </div>`
      : "<div><p>No baseline comparison available yet.</p></div>"
    }
  </div>
</div>

<!-- ══════════════ 5. HISTORICAL CONTEXT ══════════════ -->
${data.ndviTimeline && data.ndviTimeline.length > 0
  ? `<div class="section no-break">
      <h2>5. Historical NDVI Context</h2>
      <h3>Annual NDVI Timeline</h3>
      ${renderNdviTimeline(data.ndviTimeline)}
      ${data.degradationAnalysis?.detected
        ? `<h3>Degradation Analysis</h3>
           <table>
             <tr><td><strong>Peak Vegetation Year</strong></td><td>${data.degradationAnalysis.peakYear ?? "N/A"}</td></tr>
             <tr><td><strong>Peak NDVI</strong></td><td>${fmt(data.degradationAnalysis.peakValue)}</td></tr>
             <tr><td><strong>Current NDVI</strong></td><td>${fmt(data.degradationAnalysis.currentValue)}</td></tr>
             <tr><td><strong>Total Change</strong></td><td>${fmtPct(data.degradationAnalysis.totalChangePct)}</td></tr>
             <tr><td><strong>Classification</strong></td><td>${escapeHtml(data.degradationAnalysis.degradationClass ?? "N/A")}</td></tr>
             <tr><td><strong>Trend Direction</strong></td><td>${escapeHtml((data.degradationAnalysis.trendDirection ?? "N/A").toUpperCase())}</td></tr>
             ${data.degradationAnalysis.worstDeclineYear ? `<tr><td><strong>Worst Decline Year</strong></td><td>${data.degradationAnalysis.worstDeclineYear} (Δ ${fmt(data.degradationAnalysis.worstDeclineMagnitude)})</td></tr>` : ""}
           </table>`
        : "<p>Insufficient historical data for degradation analysis.</p>"
      }
    </div>`
  : ""
}

<!-- ══════════════ 6. MONITORING TIMELINE ══════════════ -->
${data.timeline && data.timeline.length > 0
  ? `<div class="section no-break">
      <h2>6. Project Timeline</h2>
      <table>
        <thead><tr><th>Date</th><th>Event</th><th>Description</th></tr></thead>
        <tbody>
          ${data.timeline
            .slice(0, 20)
            .map(
              (e) => `
              <tr>
                <td>${new Date(e.date).toLocaleDateString("en-GB")}</td>
                <td>${escapeHtml(e.type.replace(/_/g, " "))}</td>
                <td>${escapeHtml(e.description)}</td>
              </tr>`
            )
            .join("\n")}
        </tbody>
      </table>
    </div>`
  : ""
}

<!-- ══════════════ 7. DATA SOURCES & METHODOLOGY ══════════════ -->
<div class="section no-break">
  <h2>7. Data Sources &amp; Methodology</h2>
  ${renderAttributionTable(data.attributions ?? [])}
  <p class="footnote">
    All spectral indices are computed using cloud-masked composites.
    NDVI/EVI/SAVI/NDMI/NDWI/NBR computed from Sentinel-2 SR Harmonized (10m, 20m).
    Landsat-8 C2 SR (30m) used as fallback when Sentinel-2 imagery is insufficient.
    Zonal statistics computed using mean reducer over the site polygon.
    Ecosystem Health Index (EHI) is a composite metric — not a scientifically-calibrated score.
  </p>
</div>

<!-- ══════════════ 8. DISCLAIMER ══════════════ -->
<div class="disclaimer">
  ${escapeHtml(
    data.disclaimer ??
      "This report is generated by NEVARA's satellite-assisted MRV system. Environmental indicators are derived from publicly available satellite datasets and should be interpreted alongside field observations. Accuracy varies by indicator, dataset availability, and site conditions. All remote-sensing values are proxies and require field validation for regulatory or scientific use."
  )}
  Report ID: ${escapeHtml(data.reportId)} | NEVARA v2.0 | Generated: ${new Date(data.generatedAt).toISOString()}
</div>

</body>
</html>`;
}

// ─── Monitoring report template ────────────────────────────────────────────────

export interface MonitoringReportData extends BaselineReportData {
  snapshotNumber?: number;
  monitoringDate?: string;
  daysSinceBaseline?: number;
}

export function renderMonitoringReportHtml(data: MonitoringReportData): string {
  // Monitoring reports reuse the baseline template with a different title
  const modified: BaselineReportData = {
    ...data,
    project: {
      ...data.project,
      name: data.project.name,
    },
  };
  // Replace the report type in the title
  const html = renderBaselineReportHtml(modified);
  return html
    .replace("Baseline Environmental Assessment", `Monitoring Report #${data.snapshotNumber ?? 1}`)
    .replace("<h2>5. Historical NDVI Context</h2>", "<h2>5. Monitoring Context</h2>");
}
