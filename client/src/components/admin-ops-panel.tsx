/**
 * AdminOpsPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin operational monitoring panel.
 * Shows: system health, cache stats, SSE clients, audit event feed, queue status.
 * Accessible at /admin with admin role only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Server, Database, Wifi, Activity, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Clock, Cpu, MemoryStick, Zap, Eye, Shield
} from 'lucide-react';
import { format } from 'date-fns';

function StatusBadgeSimple({ status }: { status: string }) {
  const color =
    status === 'ok' || status === 'healthy' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
    status === 'degraded' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
    'bg-red-500/10 text-red-600 border-red-500/20';

  const icon =
    status === 'ok' || status === 'healthy' ? <CheckCircle2 className="w-3 h-3" /> :
    status === 'degraded' ? <AlertTriangle className="w-3 h-3" /> :
    <XCircle className="w-3 h-3" />;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${color}`}>
      {icon} {status}
    </span>
  );
}

export function AdminOpsPanel() {
  const { toast } = useToast();

  const { data: ops, isLoading, refetch } = useQuery({
    queryKey: ['/api/ops/status'],
    queryFn: async () => {
      const res = await fetch('/api/ops/status');
      if (!res.ok) throw new Error('Failed to fetch ops status');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const { data: auditData } = useQuery({
    queryKey: ['/api/ops/audit-events'],
    queryFn: async () => {
      const res = await fetch('/api/ops/audit-events?limit=20');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const invalidateCache = useMutation({
    mutationFn: (projectId: string) =>
      apiRequest('POST', '/api/ops/cache/invalidate', { projectId }),
    onSuccess: () => {
      toast({ title: 'Cache invalidated', description: 'Project cache cleared successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/ops/status'] });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to invalidate cache.' });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading operational status...
      </div>
    );
  }

  const health = ops?.health;
  const cache = ops?.cache;
  const sse = ops?.sse;
  const auditStats = ops?.auditEvents;
  const scheduler = ops?.scheduler;

  const memMb = health?.memory
    ? (health.memory.heapUsed / 1024 / 1024).toFixed(1)
    : null;
  const memTotalMb = health?.memory
    ? (health.memory.heapTotal / 1024 / 1024).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-500" />
            Operational Status
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time system health and infrastructure monitoring
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall health banner */}
      {health && (
        <Card className={`border-2 ${
          health.status === 'healthy' ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10' :
          health.status === 'degraded' ? 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10' :
          'border-red-500/30 bg-red-50/30 dark:bg-red-950/10'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">System Health</h3>
                    <StatusBadgeSimple status={health.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
                    &nbsp;·&nbsp; v{health.version}
                    &nbsp;·&nbsp; {format(new Date(health.ts), 'HH:mm:ss')}
                  </p>
                </div>
              </div>
              {memMb && (
                <div className="text-right text-sm">
                  <p className="font-bold">{memMb} MB</p>
                  <p className="text-muted-foreground text-xs">Heap / {memTotalMb} MB total</p>
                </div>
              )}
            </div>

            {/* Individual checks */}
            {health.checks && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-muted/30">
                {health.checks.map((check: any) => (
                  <div key={check.name} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">{check.name.replace('_', ' ')}</p>
                      {check.latencyMs && (
                        <p className="text-xs text-muted-foreground">{check.latencyMs}ms</p>
                      )}
                      {check.detail && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{check.detail}</p>
                      )}
                    </div>
                    <StatusBadgeSimple status={check.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cache stats */}
        {cache && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Intelligence Cache
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entries</span>
                <span className="font-bold">{cache.size} / {cache.maxEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cache Hits</span>
                <span className="font-bold text-emerald-600">{cache.totalHits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expired</span>
                <span className="font-bold text-amber-600">{cache.expired}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.round((cache.size / cache.maxEntries) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* SSE stats */}
        {sse && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-500" /> Live Connections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SSE Clients</span>
                <span className="font-bold">{sse.totalClients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projects Watched</span>
                <span className="font-bold">{sse.projectSubscribers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Streams</span>
                <span className="font-bold">{sse.adminClients}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scheduler + audit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Scheduler & Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scheduler</span>
              <span className={`font-bold ${scheduler?.running ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {scheduler?.running ? 'Running' : 'Idle'}
              </span>
            </div>
            {auditStats && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audit Events</span>
                  <span className="font-bold">{auditStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Errors</span>
                  <span className={`font-bold ${(auditStats.bySeverity?.ERROR ?? 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {auditStats.bySeverity?.ERROR ?? 0}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent audit events */}
      {auditData?.events && auditData.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Audit Events
            </CardTitle>
            <CardDescription>Last {auditData.events.length} system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditData.events.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    event.severity === 'ERROR' || event.severity === 'CRITICAL' ? 'bg-red-500' :
                    event.severity === 'WARN' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-muted-foreground">{event.category}</span>
                      <span className="text-xs font-semibold">{event.action}</span>
                      {event.projectId && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          project: {event.projectId.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{event.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {format(new Date(event.ts), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
