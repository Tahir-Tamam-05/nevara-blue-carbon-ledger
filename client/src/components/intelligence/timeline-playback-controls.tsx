import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface PlaybackEvent {
  date: string;
  title: string;
  type?: string;
}

interface TimelinePlaybackControlsProps {
  events: PlaybackEvent[];
  onActiveIndexChange: (index: number) => void;
}

export function TimelinePlaybackControls({ events, onActiveIndexChange }: TimelinePlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [index, setIndex] = useState(0);

  const safeEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  );

  useEffect(() => {
    onActiveIndexChange(index);
  }, [index, onActiveIndexChange]);

  useEffect(() => {
    if (!isPlaying || safeEvents.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1 >= safeEvents.length ? 0 : prev + 1));
    }, 1800);
    return () => clearInterval(timer);
  }, [isPlaying, safeEvents.length]);

  useEffect(() => {
    setIndex(0);
  }, [safeEvents.length]);

  if (safeEvents.length === 0) return null;

  const active = safeEvents[Math.min(index, safeEvents.length - 1)];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Timeline Playback</p>
          <p className="text-sm font-semibold">{active.title}</p>
        </div>
        <Badge variant="secondary">{new Date(active.date).toLocaleDateString()}</Badge>
      </div>

      <Slider
        value={[index]}
        max={Math.max(0, safeEvents.length - 1)}
        step={1}
        onValueChange={(v) => setIndex(v[0] ?? 0)}
      />

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setIndex((v) => Math.max(0, v - 1))}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={() => setIsPlaying((v) => !v)}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIndex((v) => Math.min(safeEvents.length - 1, v + 1))}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
