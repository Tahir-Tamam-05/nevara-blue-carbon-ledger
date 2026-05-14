import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Leaf, TrendingUp, AlertTriangle, ActivitySquare, BadgeCheck } from 'lucide-react';
import { IntelligenceSummary } from '@/lib/intelligence-api';

export function EnvironmentalSummaryCards({ summary }: { summary: IntelligenceSummary }) {
  const getQualityColor = (score: string) => {
    switch (score) {
      case 'A': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
      case 'B': return 'text-teal-500 bg-teal-50 dark:bg-teal-950/30';
      case 'C': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30';
      case 'D': return 'text-orange-500 bg-orange-50 dark:bg-orange-950/30';
      case 'F': return 'text-red-500 bg-red-50 dark:bg-red-950/30';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-950/30';
    }
  };

  const getEhiStatus = (ehi?: number | null) => {
    if (ehi == null) return { label: 'Unknown', color: 'text-slate-500' };
    if (ehi > 0.8) return { label: 'Excellent', color: 'text-emerald-500' };
    if (ehi > 0.6) return { label: 'Good', color: 'text-teal-500' };
    if (ehi > 0.4) return { label: 'Moderate', color: 'text-amber-500' };
    return { label: 'Poor', color: 'text-red-500' };
  };

  const ehiStatus = getEhiStatus(summary.ecosystemHealthIndex);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ecosystem Health</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold font-heading">{summary.ecosystemHealthIndex != null ? (summary.ecosystemHealthIndex * 100).toFixed(1) : '--'}</h3>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <p className={`text-sm font-medium ${ehiStatus.color}`}>{ehiStatus.label} Condition</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ActivitySquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quality Grade</p>
              <div className="flex items-center gap-3">
                <h3 className={`text-3xl font-bold font-heading w-12 h-12 flex items-center justify-center rounded-xl ${getQualityColor(summary.qualityScore?.overallGrade || '-')}`}>
                  {summary.qualityScore?.overallGrade || '-'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">Environmental Score</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BadgeCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Trajectory</p>
              <h3 className="text-2xl font-bold font-heading capitalize mt-2">
                {summary.ecosystemTrajectory || 'Stable'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Multi-cycle trend</p>
            </div>
            <div className={`p-3 rounded-lg ${summary.ecosystemTrajectory === 'improving' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : summary.ecosystemTrajectory === 'degrading' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monitoring</p>
              <h3 className="text-3xl font-bold font-heading mt-1">{summary.monitoringTimelineCount}</h3>
              <p className="text-sm text-muted-foreground mt-1">Total Cycles Completed</p>
            </div>
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <Leaf className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
