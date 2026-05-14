import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemo, useState } from 'react';
import type { SatelliteArtifact } from '@/lib/intelligence-api';

interface TemporalComparisonViewerProps {
  artifacts: SatelliteArtifact[];
}

export function TemporalComparisonViewer({ artifacts }: TemporalComparisonViewerProps) {
  const sorted = useMemo(
    () => [...artifacts].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()),
    [artifacts],
  );

  const [leftId, setLeftId] = useState<string>('0');
  const [rightId, setRightId] = useState<string>(String(Math.max(0, sorted.length - 1)));

  const left = sorted[Number(leftId)] ?? sorted[0];
  const right = sorted[Number(rightId)] ?? sorted[sorted.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temporal Comparison</CardTitle>
        <CardDescription>Side-by-side satellite evidence from two monitoring dates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No satellite snapshots available.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select value={leftId} onValueChange={setLeftId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sorted.map((item, idx) => (
                    <SelectItem key={`l-${idx}`} value={String(idx)}>
                      {new Date(item.observedAt).toLocaleDateString()} • {item.observationType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rightId} onValueChange={setRightId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sorted.map((item, idx) => (
                    <SelectItem key={`r-${idx}`} value={String(idx)}>
                      {new Date(item.observedAt).toLocaleDateString()} • {item.observationType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[left, right].map((item, idx) => (
                <div key={idx} className="rounded-xl border overflow-hidden bg-muted/10">
                  <div className="aspect-video flex items-center justify-center bg-muted/30">
                    {item?.thumbnailPath ? (
                      <img
                        src={`/api/mrv/raster-thumbnail/${item.thumbnailPath}`}
                        alt={`${item.observationType}-${item.observedAt}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No thumbnail</span>
                    )}
                  </div>
                  <div className="p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">{new Date(item?.observedAt ?? Date.now()).toLocaleDateString()}</p>
                    <p>{item?.observationType ?? 'unknown'} • {item?.sourceDataset ?? 'dataset unavailable'}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
