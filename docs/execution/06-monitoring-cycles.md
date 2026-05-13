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

