import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TimelineEvent } from '@/lib/intelligence-api';
import { CheckCircle2, Clock, AlertTriangle, FileText, Satellite } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MonitoringTimeline({ events, activeIndex }: { events: TimelineEvent[]; activeIndex?: number }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(
    () => events.filter((event) => {
      const matchesType = typeFilter === 'all' ? true : event.type.toLowerCase() === typeFilter;
      const text = `${event.title} ${event.description}`.toLowerCase();
      const matchesQuery = query.trim() ? text.includes(query.toLowerCase()) : true;
      return matchesType && matchesQuery;
    }),
    [events, query, typeFilter],
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'baseline': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'monitoring': return <Satellite className="w-4 h-4 text-cyan-500" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'report': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'baseline': return 'bg-emerald-500';
      case 'monitoring': return 'bg-cyan-500';
      case 'alert': return 'bg-red-500';
      case 'report': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Monitoring Timeline</CardTitle>
        <CardDescription>Chronological sequence of project events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <Input placeholder="Search timeline..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="md:col-span-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by event type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                <SelectItem value="baseline">Baseline</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
                <SelectItem value="report">Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No events recorded yet.
          </div>
        ) : (
          <div className="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
            {filtered.map((event, idx) => (
              <div key={idx} className={`relative pl-10 rounded-lg ${idx === activeIndex ? 'bg-cyan-50/50 dark:bg-cyan-950/20 p-2 -ml-2' : ''}`}>
                <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-background flex items-center justify-center shadow-sm ${getEventColor(event.type)} text-white`}>
                  {getEventIcon(event.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{event.title}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {format(new Date(event.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
