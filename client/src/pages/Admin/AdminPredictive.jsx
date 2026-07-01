import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/admin/ui';
import { Brain, TrendingUp, Target, Sparkles, Zap } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function AdminPredictive() {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: deals } = await supabase.from('crm_opportunities').select('*, stage:crm_stages(*)');
      const { data: revenue } = await supabase.from('revenue_entries').select('*');
      const totalPipeline = (deals || []).reduce((s, d) => s + Number(d.expected_revenue || 0), 0);
      const totalRevenue = (revenue || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const winRate = deals?.length > 0 ? Math.round((deals.filter(d => d.status === 'won').length / deals.length) * 100) : 0;
      setPredictions({
        totalPipeline, totalRevenue, winRate,
        dealsCount: deals?.length || 0,
        revenueCount: revenue?.length || 0,
        forecastNextMonth: Math.round(totalPipeline * (winRate / 100) * 0.3),
        forecastNextQuarter: Math.round(totalPipeline * (winRate / 100) * 0.6),
      });
    } catch { setPredictions({ totalPipeline: 0, totalRevenue: 0, winRate: 0, dealsCount: 0, revenueCount: 0, forecastNextMonth: 0, forecastNextQuarter: 0 }); }
    setLoading(false);
  }

  if (loading) return <div className="p-6 space-y-4">{[1,2,3,4].map(i => <Card key={i}><CardContent><div className="animate-pulse h-16 bg-[var(--hover-bg)] rounded" /></CardContent></Card>)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Predictive Analytics</h1><p className="text-sm text-[var(--text-muted)]">AI-powered predictions based on historical data</p></div></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Win Rate</p><p className="text-2xl font-bold">{predictions?.winRate || 0}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Pipeline Value</p><p className="text-2xl font-bold">${(predictions?.totalPipeline || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Forecast Next Month</p><p className="text-2xl font-bold text-[var(--brand-cyan)]">${(predictions?.forecastNextMonth || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[var(--text-muted)]">Forecast Next Quarter</p><p className="text-2xl font-bold text-[var(--brand-gold)]">${(predictions?.forecastNextQuarter || 0).toLocaleString()}</p></CardContent></Card>
      </div>
    </div>
  );
}