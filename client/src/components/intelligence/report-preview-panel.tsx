import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { intelligenceApi, type ReportRecord } from '@/lib/intelligence-api';
import { useState } from 'react';

export function ReportPreviewPanel({ projectId }: { projectId: string }) {
  const [format, setFormat] = useState<'pdf' | 'html'>('pdf');
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['intelligence-reports', projectId],
    queryFn: () => intelligenceApi.getReports(projectId),
  });

  const latest = reports[0] as ReportRecord | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Preview & Export</CardTitle>
        <CardDescription>Manage report versions and export artifacts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={format} onValueChange={(v) => setFormat(v as 'pdf' | 'html')}>
          <TabsList>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No generated reports yet.
          </div>
        ) : (
          <>
            <div className="rounded-lg border p-3 bg-muted/10">
              <p className="font-semibold text-sm">Latest: {latest?.title}</p>
              <p className="text-xs text-muted-foreground">v{latest?.version} • {latest?.reportType} • {new Date(latest?.generatedAt ?? Date.now()).toLocaleString()}</p>
            </div>
            <div className="space-y-2 max-h-52 overflow-auto pr-1">
              {reports.map((r: ReportRecord) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">v{r.version} • {new Date(r.generatedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/projects/${projectId}/reports/${r.id}/download`} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {latest && (
          <div className="flex gap-2">
            <Button asChild size="sm">
              <a href={`/api/projects/${projectId}/reports/${latest.id}/download`} target="_blank" rel="noreferrer">
                <FileText className="w-4 h-4 mr-1" /> Open Latest
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/mrv/report/${projectId}`} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" /> Legacy Report
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
