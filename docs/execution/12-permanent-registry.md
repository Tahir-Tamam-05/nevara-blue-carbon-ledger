# ## 12. PERMANENT PROJECT REGISTRY {#10-project-registry}

### 12.1 Registry Design

Every project in NEVARA becomes a **permanent environmental case file** identified by a globally unique Registry ID.

```
Registry ID Format: NEVARA-{YEAR}-{COUNTRY_CODE}-{SEQUENCE}
Example:            NEVARA-2025-IN-00142
```

### 12.2 Registry Record Structure

```typescript
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
  reports: Array<{
    type: string;
    date: string;
    downloadUrl: string;
  }>;

  // Future hooks
  carbonScoreReady: boolean;
  mintingEligible: boolean;
}
```

### 12.3 Registry API

```typescript
// GET /api/registry
// List all registered projects (public, paginated)
// Query params: ?country=IN&ecosystem=WETLAND&page=1&limit=20

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
```

### 12.4 Data Permanence Rules

1. **Projects are never deleted** — only archived (soft delete).
2. **Snapshots are immutable** — once stored, never modified.
3. **Reports are versioned** — new version = new record (old preserved).
4. **Verifier reviews are append‑only** — decisions never overwritten.
5. **Audit logs are permanent** — no deletion capability.
6. **Raster artifacts stored permanently** — with content hashes.
7. **Polygon history maintained** — each version stored separately.
