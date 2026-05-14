import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { intelligenceApi, SatelliteArtifact } from '@/lib/intelligence-api';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export function SatelliteViewer({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const { data: artifacts, isLoading } = useQuery({
    queryKey: ['satellite-artifacts', projectId],
    queryFn: () => intelligenceApi.getSatelliteArtifacts(projectId)
  });

  const sorted = useMemo(
    () => [...(artifacts ?? [])].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()),
    [artifacts],
  );
  const filtered = sorted.filter((a) => `${a.observationType} ${a.sourceDataset ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const active = filtered[Math.min(cursor, Math.max(0, filtered.length - 1))];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Satellite Evidence</CardTitle>
        <CardDescription>Processed multispectral imagery and raster thumbnails</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !artifacts || artifacts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
            <p>No satellite artifacts generated yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Input placeholder="Filter by indicator or dataset..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="rounded-lg border p-3 bg-muted/10">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Timeline Cursor</p>
              <Slider
                value={[Math.min(cursor, Math.max(0, filtered.length - 1))]}
                max={Math.max(0, filtered.length - 1)}
                step={1}
                onValueChange={(v) => setCursor(v[0] ?? 0)}
              />
              {active && (
                <p className="text-xs mt-2 text-muted-foreground">
                  Active snapshot: {format(new Date(active.observedAt), 'PPP')} • {active.observationType}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((artifact, idx) => (
              <div key={idx} className="border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow">
                <div className="aspect-video bg-muted/30 relative flex items-center justify-center overflow-hidden">
                  {artifact.thumbnailPath ? (
                    <img 
                      src={`/api/mrv/raster-thumbnail/${artifact.thumbnailPath}`} 
                      alt={`${artifact.observationType} at ${artifact.observedAt}`}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center opacity-50">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-xs">No Thumbnail</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded uppercase">
                    {artifact.observationType}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold">
                    {format(new Date(artifact.observedAt), 'MMM d, yyyy')}
                  </p>
                  {artifact.sourceDataset && (
                    <p className="text-xs text-muted-foreground mt-1">Source: {artifact.sourceDataset}</p>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
