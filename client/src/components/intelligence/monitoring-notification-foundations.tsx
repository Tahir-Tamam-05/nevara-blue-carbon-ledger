import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell } from 'lucide-react';
import { useState } from 'react';

export function MonitoringNotificationFoundations() {
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [cycleComplete, setCycleComplete] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4" /> Monitoring Notifications</CardTitle>
        <CardDescription>Foundation controls for alert channels and routing (UI-only in this phase)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="risk-alerts">Risk & anomaly alerts</Label>
          <Switch id="risk-alerts" checked={riskAlerts} onCheckedChange={setRiskAlerts} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="cycle-complete">Cycle completion updates</Label>
          <Switch id="cycle-complete" checked={cycleComplete} onCheckedChange={setCycleComplete} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="weekly-digest">Weekly digest</Label>
          <Switch id="weekly-digest" checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notification-email">Notification email</Label>
          <Input id="notification-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@example.org" />
          <p className="text-xs text-muted-foreground">Saved settings integration is intentionally deferred to backend notification services.</p>
        </div>
      </CardContent>
    </Card>
  );
}
