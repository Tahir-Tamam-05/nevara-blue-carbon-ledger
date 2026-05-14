import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from 'recharts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intelligenceApi } from '@/lib/intelligence-api';
import { Loader2 } from 'lucide-react';

interface IndicatorPoint {
  date: string;
  value: number;
  baseline?: boolean;
  confidence?: number;
}

export function HistoricalChart({ projectId }: { projectId: string }) {
  const [indicator, setIndicator] = useState('ndvi');

  const { data, isLoading } = useQuery({
    queryKey: ['intelligence-history', projectId, indicator],
    queryFn: () => intelligenceApi.getIndicatorHistory(projectId, indicator)
  });

  const chartData: IndicatorPoint[] = (data ?? []).map((d: { date: string; value: number; isBaseline?: boolean; confidence?: number }) => ({
    date: new Date(d.date).toLocaleDateString(),
    value: d.value,
    baseline: d.isBaseline,
    confidence: d.confidence ?? 0.7,
  }));

  const trendDirection = chartData.length > 1
    ? chartData[chartData.length - 1].value - chartData[0].value
    : 0;

  return (
    <Card className="col-span-full h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Historical Trend Analysis</CardTitle>
          <CardDescription>Time-series observations of spectral indicators</CardDescription>
        </div>
        <div className="w-48">
          <Select value={indicator} onValueChange={setIndicator}>
            <SelectTrigger>
              <SelectValue placeholder="Select Indicator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ndvi">NDVI (Vegetation)</SelectItem>
              <SelectItem value="evi">EVI (Enhanced Veg)</SelectItem>
              <SelectItem value="ndwi">NDWI (Water)</SelectItem>
              <SelectItem value="ndmi">NDMI (Moisture)</SelectItem>
              <SelectItem value="savi">SAVI (Soil-Adjusted)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-1 rounded border bg-muted/30">Trend: {trendDirection > 0.02 ? 'Improving' : trendDirection < -0.02 ? 'Declining' : 'Stable'}</span>
          <span className="text-xs px-2 py-1 rounded border bg-muted/30">Points: {chartData.length}</span>
        </div>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No historical data available.
          </div>
        ) : (
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val.toFixed(2)}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value.toFixed(3), indicator.toUpperCase()]}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="value" stroke="none" fill="#67e8f9" fillOpacity={0.1} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#06b6d4" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
