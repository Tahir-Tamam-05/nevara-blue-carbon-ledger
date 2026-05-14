import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { intelligenceApi } from '@/lib/intelligence-api';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface ChangeMetric {
  indicator: string;
  label: string;
  baseline: number;
  current: number;
  delta: number;
  deltaPercent: number;
  classification: 'SIGNIFICANT_IMPROVEMENT' | 'MODERATE_IMPROVEMENT' | 'STABLE' | 'MODERATE_DECLINE' | 'SIGNIFICANT_DECLINE';
}

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string; bg: string; borderColor: string; icon: React.ReactNode }> = {
  SIGNIFICANT_IMPROVEMENT: {
    label: 'Sig. Improvement',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  MODERATE_IMPROVEMENT: {
    label: 'Mod. Improvement',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    borderColor: 'border-teal-200 dark:border-teal-800',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  STABLE: {
    label: 'Stable',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    borderColor: 'border-slate-200 dark:border-slate-700',
    icon: <Minus className="w-3.5 h-3.5" />,
  },
  MODERATE_DECLINE: {
    label: 'Mod. Decline',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: <TrendingDown className="w-3.5 h-3.5" />,
  },
  SIGNIFICANT_DECLINE: {
    label: 'Sig. Decline',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: <TrendingDown className="w-3.5 h-3.5" />,
  },
};

function parseChangesToMetrics(data: any): ChangeMetric[] {
  if (!data || !data.baselineVsCurrent) return [];
  return Object.entries(data.baselineVsCurrent).map(([key, val]: [string, any]) => {
    const delta = (val.current ?? 0) - (val.baseline ?? 0);
    const deltaPercent = val.baseline !== 0 ? (delta / Math.abs(val.baseline)) * 100 : 0;
    let classification: ChangeMetric['classification'] = 'STABLE';
    if (deltaPercent > 15) classification = 'SIGNIFICANT_IMPROVEMENT';
    else if (deltaPercent > 5) classification = 'MODERATE_IMPROVEMENT';
    else if (deltaPercent < -15) classification = 'SIGNIFICANT_DECLINE';
    else if (deltaPercent < -5) classification = 'MODERATE_DECLINE';

    const INDICATOR_LABELS: Record<string, string> = {
      ndvi: 'NDVI — Vegetation Vigor',
      evi: 'EVI — Enhanced Vegetation',
      savi: 'SAVI — Soil-Adjusted Veg.',
      ndwi: 'NDWI — Surface Water',
      ndmi: 'NDMI — Moisture Index',
      nbr: 'NBR — Burn Ratio',
      bsi: 'BSI — Bare Soil Index',
    };

    return {
      indicator: key.toUpperCase(),
      label: INDICATOR_LABELS[key.toLowerCase()] ?? key.toUpperCase(),
      baseline: val.baseline ?? 0,
      current: val.current ?? 0,
      delta,
      deltaPercent,
      classification,
    };
  });
}

export function ChangeDetectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['intelligence-changes', projectId],
    queryFn: () => intelligenceApi.getChanges(projectId),
    staleTime: 5 * 60 * 1000,
  });

  const metrics = parseChangesToMetrics(data);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading">Change Detection</CardTitle>
            <CardDescription>Baseline vs. current spectral indicators — automated delta classification</CardDescription>
          </div>
          {metrics.length > 0 && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground border px-2 py-1 rounded">
              {metrics.length} indicators
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : error || metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <AlertCircle className="w-10 h-10 opacity-20" />
            <p className="text-sm">No change data available. Monitoring cycle required.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.map((m) => {
              const cfg = CLASSIFICATION_CONFIG[m.classification] ?? CLASSIFICATION_CONFIG.STABLE;
              const barWidth = Math.min(100, Math.abs(m.deltaPercent));
              const isPositive = m.delta >= 0;

              return (
                <div
                  key={m.indicator}
                  className={`rounded-xl border p-4 ${cfg.bg} ${cfg.borderColor} transition-all duration-200 hover:shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{m.indicator}</span>
                  </div>

                  <p className="text-sm font-semibold text-foreground mb-3">{m.label}</p>

                  {/* Delta bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Baseline: <span className="font-mono font-bold text-foreground">{m.baseline.toFixed(3)}</span></span>
                      <span>Current: <span className="font-mono font-bold text-foreground">{m.current.toFixed(3)}</span></span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={`absolute top-0 h-full rounded-full transition-all duration-700 ${isPositive ? 'bg-emerald-500 left-1/2' : 'bg-red-500 right-1/2'}`}
                        style={{ width: `${barWidth / 2}%` }}
                      />
                      <div className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/30" />
                    </div>
                    <div className={`text-right text-xs font-mono font-bold ${cfg.color}`}>
                      {isPositive ? '+' : ''}{m.delta.toFixed(4)} ({isPositive ? '+' : ''}{m.deltaPercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
