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

