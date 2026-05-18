import { apiRequest } from "./queryClient";

export interface IntelligenceSummary {
  projectId: string;
  registryId: string | null;
  location: string | null;
  ecosystemType: string | null;
  baselineVsCurrent: any;
  trend: any;
  monitoringTimelineCount: number;
  status: string;
  ecosystemHealthIndex?: number | null;
  ecosystemTrajectory?: string | null;
  qualityScore?: any;
  multiCycleTrends?: any;
}

export interface TimelineEvent {
  type: string;
  date: string;
  title: string;
  description: string;
}

export interface SatelliteArtifact {
  observationType: string;
  observedAt: string;
  rasterAssetPath?: string | null;
  thumbnailPath?: string | null;
  tileLayerPath?: string | null;
  sourceDataset?: string | null;
}

export interface ReportRecord {
  id: string;
  reportType: string;
  version: number;
  title: string;
  status: string;
  generatedAt: string;
}

/** Returns fetch headers with Bearer token if present in localStorage */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("bluecarbon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Authenticated fetch wrapper for intelligence API calls */
async function authFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: authHeaders() });
  return res;
}

export const intelligenceApi = {
  getSummary: async (projectId: string): Promise<IntelligenceSummary> => {
    const res = await authFetch(`/api/projects/${projectId}/environmental-summary`);
    if (!res.ok) throw new Error(`Failed to fetch environmental summary (${res.status})`);
    return res.json();
  },

  getTimeline: async (projectId: string): Promise<TimelineEvent[]> => {
    const res = await authFetch(`/api/projects/${projectId}/timeline`);
    if (!res.ok) throw new Error(`Failed to fetch timeline (${res.status})`);
    return res.json();
  },

  getMonitoringTimeline: async (projectId: string) => {
    const res = await authFetch(`/api/projects/${projectId}/monitoring-timeline`);
    if (!res.ok) throw new Error(`Failed to fetch monitoring timeline (${res.status})`);
    return res.json();
  },

  getHistoricalObservations: async (projectId: string, indicator?: string) => {
    const url = `/api/projects/${projectId}/historical-observations${indicator ? `?indicator=${indicator}` : ""}`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error(`Failed to fetch historical observations (${res.status})`);
    return res.json();
  },

  getIndicatorHistory: async (projectId: string, indicator?: string) => {
    const url = `/api/projects/${projectId}/indicator-history${indicator ? `?indicator=${indicator}` : ""}`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error(`Failed to fetch indicator history (${res.status})`);
    return res.json();
  },

  getChanges: async (projectId: string) => {
    const res = await authFetch(`/api/projects/${projectId}/changes`);
    if (!res.ok) throw new Error(`Failed to fetch changes (${res.status})`);
    return res.json();
  },

  getBaselineVsCurrent: async (projectId: string, indicator?: string) => {
    const url = `/api/projects/${projectId}/baseline-vs-current${indicator ? `?indicator=${indicator}` : ""}`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error(`Failed to fetch baseline vs current (${res.status})`);
    return res.json();
  },

  getSatelliteArtifacts: async (projectId: string): Promise<SatelliteArtifact[]> => {
    const res = await authFetch(`/api/projects/${projectId}/satellite-artifacts`);
    if (!res.ok) throw new Error(`Failed to fetch artifacts (${res.status})`);
    return res.json();
  },

  getRegistry: async (projectId: string) => {
    const res = await authFetch(`/api/projects/${projectId}/registry`);
    if (!res.ok) throw new Error(`Failed to fetch registry (${res.status})`);
    return res.json();
  },

  getReports: async (projectId: string): Promise<ReportRecord[]> => {
    const res = await authFetch(`/api/projects/${projectId}/reports`);
    if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`);
    return res.json();
  },

  generateReport: async (projectId: string, reportType: string) => {
    const res = await apiRequest("POST", `/api/projects/${projectId}/reports/generate`, { reportType });
    return res.json();
  },

  triggerMRV: async (projectId: string) => {
    const res = await apiRequest("POST", "/api/mrv/trigger", { projectId });
    return res.json();
  },

  getMRVStatus: async (projectId: string) => {
    const res = await authFetch(`/api/mrv/${projectId}`);
    if (!res.ok) throw new Error(`Failed to fetch MRV status (${res.status})`);
    return res.json();
  },
};
