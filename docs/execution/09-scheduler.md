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


| \`node-cron\` | Monitoring scheduler |  
| \`bull\` \+ \`ioredis\` | Job queue for async analysis (or \`pg-boss\` for Postgres-only) |  

| \*\*Monitoring Scheduler Load\*\* | Process due projects in batches of 50; stagger monitoring dates to avoid GEE spikes |  
