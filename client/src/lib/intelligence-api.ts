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

export const intelligenceApi = {
  getSummary: async (projectId: string): Promise<IntelligenceSummary> => {
    const res = await fetch(`/api/projects/${projectId}/environmental-summary`);
    if (!res.ok) throw new Error("Failed to fetch environmental summary");
    return res.json();
  },

  getTimeline: async (projectId: string): Promise<TimelineEvent[]> => {
    const res = await fetch(`/api/projects/${projectId}/timeline`);
    if (!res.ok) throw new Error("Failed to fetch timeline");
    return res.json();
  },

  getMonitoringTimeline: async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/monitoring-timeline`);
    if (!res.ok) throw new Error("Failed to fetch monitoring timeline");
    return res.json();
  },

  getHistoricalObservations: async (projectId: string, indicator?: string) => {
    const url = `/api/projects/${projectId}/historical-observations${indicator ? `?indicator=${indicator}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch historical observations");
    return res.json();
  },

  getIndicatorHistory: async (projectId: string, indicator?: string) => {
    const url = `/api/projects/${projectId}/indicator-history${indicator ? `?indicator=${indicator}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch indicator history");
    return res.json();
  },

  getChanges: async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/changes`);
    if (!res.ok) throw new Error("Failed to fetch changes");
    return res.json();
  },

  getBaselineVsCurrent: async (projectId: string, indicator?: string) => {
    const url = `/api/projects/${projectId}/baseline-vs-current${indicator ? `?indicator=${indicator}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch baseline vs current");
    return res.json();
  },

  getSatelliteArtifacts: async (projectId: string): Promise<SatelliteArtifact[]> => {
    const res = await fetch(`/api/projects/${projectId}/satellite-artifacts`);
    if (!res.ok) throw new Error("Failed to fetch artifacts");
    return res.json();
  },

  getRegistry: async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/registry`);
    if (!res.ok) throw new Error("Failed to fetch registry");
    return res.json();
  },

  getReports: async (projectId: string): Promise<ReportRecord[]> => {
    const res = await fetch(`/api/projects/${projectId}/reports`);
    if (!res.ok) throw new Error("Failed to fetch reports");
    return res.json();
  },

  generateReport: async (projectId: string, reportType: string) => {
    const res = await apiRequest('POST', `/api/projects/${projectId}/reports/generate`, { reportType });
    return res.json();
  }
};
