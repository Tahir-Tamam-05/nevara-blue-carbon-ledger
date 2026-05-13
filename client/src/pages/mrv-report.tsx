import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Shield, CheckCircle2, AlertTriangle, Download, Database, Leaf, Link, Map, Loader2 } from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SubtleOceanBackground } from '@/components/ocean-background';
import { MRVWorkflow } from '@/components/mrv-workflow';
import { lazy, Suspense } from 'react';

const GISLandMap = lazy(() => import('@/components/gis-land-map'));

export default function MRVReport() {
  const params = useParams();
  const projectId = params.id;

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: mrvData, isLoading: mrvLoading, error: mrvError } = useQuery({
    queryKey: ['/api/mrv', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/mrv/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch MRV data');
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') return false;
      return 2000;
    },
  });

  if (projectLoading || mrvLoading) {
    return (
      <div className="min-h-screen pt-24 px-6">
        <SubtleOceanBackground />
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (mrvError || !mrvData?.data || !projectData || ['PENDING', 'RUNNING', 'IDLE'].includes(mrvData?.status)) {
    return (
      <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center text-center">
        <SubtleOceanBackground />
        <Activity className="h-16 w-16 text-primary mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {mrvData?.status === 'PENDING' || mrvData?.status === 'RUNNING' ? 'Analysis in Progress' : 'MRV Report Unavailable'}
        </h1>
        <p className="text-slate-500 max-w-md">
          {mrvData?.status === 'PENDING' || mrvData?.status === 'RUNNING'
            ? 'The Earth Engine pipeline is currently processing satellite data for this project. Please check back shortly.' 
            : 'We could not load the MRV report for this project. It may not have been verified yet.'}
        </p>
      </div>
    );
  }

  const score = mrvData?.data || {};
  const measurements = mrvData?.measurements || [];
  const ndviTileUrl = mrvData?.ndviTileUrl ?? null;

  // Parse project polygon for map
  const ndviPolygon: { lat: number; lng: number }[] | null = (() => {
    if (!projectData?.landBoundary) return null;
    try {
      const parsed = typeof projectData.landBoundary === 'string' 
        ? JSON.parse(projectData.landBoundary) 
        : projectData.landBoundary;
      if (!Array.isArray(parsed)) return null;
      if (parsed.length > 0 && typeof parsed[0] === 'object' && 'lat' in parsed[0]) {
        return parsed as { lat: number; lng: number }[];
      }
      return parsed.map(([lat, lng]: [number, number]) => ({ lat, lng }));
    } catch { return null; }
  })();

  // Format chart data
  const chartData = measurements.map((m: any) => ({
    date: m.measuredAt ? format(new Date(m.measuredAt), 'MMM yyyy') : 'Unknown',
    ndvi: m.ndviMean || 0,
    cloud: m.cloudCoverPct || 0
  }));

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <SubtleOceanBackground />
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">BlueCarbon MRV Engine</span>
            </div>
            <h1 className="text-4xl font-heading font-bold text-slate-900 dark:text-slate-100 mb-1">
              Measurement, Reporting & Verification
            </h1>
            <p className="text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{projectData.name}</span>
              <span>&bull;</span>
              <span className="font-mono text-xs">{projectId}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {score.reportPdfUrl && (
              <Button asChild variant="outline" className="gap-2">
                <a href={score.reportPdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4" />
                  PDF Report
                </a>
              </Button>
            )}
            <div className={`px-4 py-2 rounded-lg border-2 font-bold flex items-center gap-2 ${score.trustScore >= 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : score.trustScore >= 40 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {score.trustScore >= 70 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              Trust Score: {score.trustScore}/100
            </div>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{score.confidence || 'N/A'}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NDVI Delta</p>
              <div className="flex items-baseline gap-1">
                <p className={`text-xl font-bold ${score.ndviDeltaPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {score.ndviDeltaPct != null ? (score.ndviDeltaPct > 0 ? '+' : '') + score.ndviDeltaPct.toFixed(1) + '%' : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Canopy</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{score.canopyPct != null ? (score.canopyPct * 100).toFixed(1) + '%' : 'N/A'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Area Coverage</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{score.areaHa || '0'} ha</p>
            </CardContent>
          </Card>
        </div>

        {/* MRV Workflow Visual and Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
                <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />
                    Processing Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <MRVWorkflow project={projectData} compact={true} />
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
                <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Map className="w-5 h-5 text-emerald-600" />
                    Spatial Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div style={{ height: '320px' }}>
                    <Suspense fallback={
                      <div className="h-full flex items-center justify-center bg-slate-50">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                      </div>
                    }>
                      <GISLandMap
                        onBoundaryChange={() => {}}
                        readOnly
                        initialBoundary={ndviPolygon ?? undefined}
                        ndviTileUrl={ndviTileUrl}
                        ndviPolygon={ndviPolygon}
                      />
                    </Suspense>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* NDVI Chart */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Satellite NDVI Time-Series
                      </CardTitle>
                      <CardDescription>Sentinel-2 Surface Reflectance (Harmonized)</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 font-mono">
                      {measurements.length} Observations
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{fontSize: 12, fill: '#64748b'}} 
                          tickMargin={10}
                          minTickGap={30}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          domain={[0, 1]} 
                          tick={{fontSize: 12, fill: '#64748b'}} 
                          axisLine={false}
                          tickLine={false}
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="ndvi" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorNdvi)" 
                          activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                          name="Mean NDVI"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 text-xs text-slate-500 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                      NDVI (Normalized Difference Vegetation Index) - Indicates healthy vegetation canopy
                    </div>
                    <div>Gap filling applied: {score.dataGapMonths} months</div>
                  </div>
                </CardContent>
              </Card>

              {/* Lower Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-emerald-500" /> Environmental Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Baseline NDVI</span>
                      <span className="font-mono text-sm">{score.baselineNdvi?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Current NDVI</span>
                      <span className="font-mono text-sm">{score.currentNdvi?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ecosystem Factor</span>
                      <span className="font-mono text-sm">{score.ecosystemFactor?.toFixed(2) || '1.00'}x</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</span>
                      {score.redFlag ? (
                        <Badge variant="destructive" className="uppercase text-[10px]">Flagged for Review</Badge>
                      ) : (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 uppercase text-[10px]">Healthy Growth</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 bg-slate-900 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Database className="w-24 h-24" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-cyan-400">
                      <Database className="w-4 h-4" /> Cryptographic Audit Trail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Input Hash (SHA-256)</p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-xs text-slate-300 break-all flex items-center gap-2">
                        <Link className="w-3 h-3 text-slate-500 shrink-0" />
                        {score.inputHash || 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Output Hash (SHA-256)</p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-xs text-slate-300 break-all flex items-center gap-2">
                        <Link className="w-3 h-3 text-emerald-500 shrink-0" />
                        {score.outputHash || 'N/A'}
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        These hashes prove the deterministic calculation of the MRV score based on exactly the satellite inputs retrieved from Google Earth Engine.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
