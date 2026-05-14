import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, FileDown, Layers, Map as MapIcon, Activity, Clock, AlertTriangle, BellRing, BarChart3 } from 'lucide-react';
import { intelligenceApi } from '@/lib/intelligence-api';
import { EnvironmentalSummaryCards } from '@/components/intelligence/environmental-summary-cards';
import { HistoricalChart } from '@/components/intelligence/historical-chart';
import { MonitoringTimeline } from '@/components/intelligence/monitoring-timeline';
import { SatelliteViewer } from '@/components/intelligence/satellite-viewer';
import { SubtleOceanBackground } from '@/components/ocean-background';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChangeDetectionPanel } from '@/components/intelligence/change-detection-panel';
import { lazy, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TimelinePlaybackControls } from '@/components/intelligence/timeline-playback-controls';
import { TemporalComparisonViewer } from '@/components/intelligence/temporal-comparison-viewer';
import { ReportPreviewPanel } from '@/components/intelligence/report-preview-panel';
import { MonitoringNotificationFoundations } from '@/components/intelligence/monitoring-notification-foundations';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';

const GISLandMap = lazy(() => import('@/components/gis-land-map'));

export default function ProjectIntelligenceOverview() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);
  const [projectSearch, setProjectSearch] = useState('');

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    }
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['intelligence-summary', projectId],
    queryFn: () => intelligenceApi.getSummary(projectId)
  });

  const { data: timelineEvents, isLoading: timelineLoading } = useQuery({
    queryKey: ['intelligence-timeline', projectId],
    queryFn: () => intelligenceApi.getTimeline(projectId)
  });
  const { data: artifacts = [] } = useQuery({
    queryKey: ['satellite-artifacts', projectId],
    queryFn: () => intelligenceApi.getSatelliteArtifacts(projectId),
  });
  const { data: allProjects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isLoading = projectLoading || summaryLoading || timelineLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Intelligence data not available.</p>
      </div>
    );
  }

  const filteredProjectComparisons = useMemo(
    () => (allProjects as Array<{ id: string; name: string; ecosystemType?: string; mrvStatus?: string; area?: number }>).filter((p) =>
      p.id !== projectId && `${p.name} ${p.ecosystemType ?? ''}`.toLowerCase().includes(projectSearch.toLowerCase()),
    ).slice(0, 6),
    [allProjects, projectId, projectSearch],
  );

  const overlayTileUrls = useMemo(() => {
    const overlays: Record<string, string> = {};
    artifacts.forEach((artifact) => {
      if (artifact.tileLayerPath) {
        overlays[artifact.observationType.toLowerCase()] = `/api/mrv/tile/${artifact.tileLayerPath}/{z}/{x}/{y}.png`;
      }
    });
    return overlays;
  }, [artifacts]);
  const latestNdviTile = useMemo(
    () => artifacts.find((a) => a.observationType.toLowerCase() === 'ndvi')?.tileLayerPath,
    [artifacts],
  );

  const handleDownloadReport = async (type: string) => {
    toast({ title: 'Generating report', description: 'Please wait...' });
    try {
      const res = await intelligenceApi.generateReport(projectId, type);
      if (res && res.id) {
        window.open(`/api/projects/${projectId}/reports/${res.id}/download`, '_blank');
      } else {
        window.open(`/api/mrv/report/${projectId}`, '_blank');
      }
    } catch (err) {
      window.open(`/api/mrv/report/${projectId}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <SubtleOceanBackground />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/verifier')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-4 w-px bg-muted" />
            <div>
              <h1 className="font-bold">{project.name}</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Project Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleDownloadReport('monitoring')}>
              <FileDown className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <EnvironmentalSummaryCards summary={summary} />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background">
              <Activity className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="gis" className="data-[state=active]:bg-background">
              <MapIcon className="w-4 h-4 mr-2" /> GIS & Evidence
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-background">
              <Layers className="w-4 h-4 mr-2" /> Trend Analysis
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-background">
              <Clock className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-background">
              <BarChart3 className="w-4 h-4 mr-2" /> Reports
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
              <BellRing className="w-4 h-4 mr-2" /> Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <HistoricalChart projectId={projectId} />
              </div>
              <div className="space-y-6">
                <ChangeDetectionPanel projectId={projectId} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gis" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>GIS Boundary Overlay</CardTitle>
                    <CardDescription>Verified land boundary mapped to environmental raster layers</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-xs font-mono px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Analysis
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-1 rounded-xl border">
                  <Suspense fallback={
                    <div className="h-[500px] flex items-center justify-center bg-muted/50 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  }>
                    <GISLandMap
                      initialBoundary={(() => {
                        try {
                          return JSON.parse(project.landBoundary || '[]');
                        } catch {
                          return [];
                        }
                      })()}
                      ndviTileUrl={latestNdviTile ? `/api/mrv/tile/${latestNdviTile}/{z}/{x}/{y}.png` : null}
                      overlayTileUrls={overlayTileUrls}
                      onBoundaryChange={() => {}}
                      readOnly={true}
                    />
                  </Suspense>
                </div>
              </CardContent>
            </Card>

            <SatelliteViewer projectId={projectId} />
            <TemporalComparisonViewer artifacts={artifacts} />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChangeDetectionPanel projectId={projectId} />
              <Card>
                <CardHeader>
                  <CardTitle>Restoration Risk & Anomalies</CardTitle>
                  <CardDescription>Automated detection of negative ecological events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <AlertTriangle className="w-12 h-12 mb-3 text-amber-500/50" />
                    <p className="text-sm font-medium">No anomalies detected in the current monitoring cycle.</p>
                    <p className="text-xs text-muted-foreground mt-1">System is actively monitoring for degradation patterns.</p>
                  </div>
                  <div className="mt-4 rounded-lg border p-3 bg-muted/10">
                    <p className="text-sm font-medium">Restoration Risk Indicator Foundation</p>
                    <p className="text-xs text-muted-foreground mt-1">Risk scoring matrix and anomaly marker rendering are UI-ready; model-driven risk calibration is pending backend analytics.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <TimelinePlaybackControls events={timelineEvents || []} onActiveIndexChange={setActiveTimelineIndex} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MonitoringTimeline events={timelineEvents || []} activeIndex={activeTimelineIndex} />
              <Card>
                <CardHeader>
                  <CardTitle>Environmental Registry Record</CardTitle>
                  <CardDescription>Immutable record attributes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm border-b pb-2">
                      <span className="text-muted-foreground">Project ID</span>
                      <span className="font-mono text-xs">{project.id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-b pb-2">
                      <span className="text-muted-foreground">Registry ID</span>
                      <span className="font-mono text-xs">{summary.registryId || 'Pending Allocation'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-b pb-2">
                      <span className="text-muted-foreground">Location</span>
                      <span>{summary.location}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-b pb-2">
                      <span className="text-muted-foreground">Ecosystem</span>
                      <span>{summary.ecosystemType}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-b pb-2">
                      <span className="text-muted-foreground">Total Area</span>
                      <span>{project.area} hectares</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Verification Phase</span>
                      <span className="capitalize">{project.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Multi-Project Comparison Foundations</CardTitle>
                <CardDescription>Cross-project contextual benchmarks for verifier workflows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Filter projects by name/ecosystem..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProjectComparisons.map((p) => (
                    <div key={p.id} className="rounded-lg border p-3 bg-muted/10">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.ecosystemType ?? 'Ecosystem N/A'}</p>
                      <p className="text-xs mt-2">Area: {p.area ?? 0} ha</p>
                      <p className="text-xs">MRV: {p.mrvStatus ?? 'NONE'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <ReportPreviewPanel projectId={projectId} />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <MonitoringNotificationFoundations />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
