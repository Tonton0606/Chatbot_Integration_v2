import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/admin/ui';
import { TrendingUp, DollarSign, Brain, Sparkles, Calendar } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

export default function AdminRevenueProjections() {
  const [projections, setProjections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: proj } = await supabase.from('revenue_projections').select('*').order('month');
      const { data: entries } = await supabase.from('revenue_entries').select('*');
      const totalProjected = (proj || []).reduce((s, p) => s + Number(p.projected_amount || 0), 0);
      const totalActual = (proj || []).reduce((s, p) => s + Number(p.actual_amount || 0), 0);
      setProjections(proj || []);
      setStats({ totalProjected, totalActual, variance: totalProjected > 0 ? Math.round((totalActual - totalProjected) / totalProjected * 100) : 0, totalEntries: entries?.length || 0 });
    } catch { setProjections([]); setStats({ totalProjected: 0, totalActual: 0, variance: 0, totalEntries: 0 }); }
    setLoading(false);
  }

  const [stats, setStats] = useState({ totalProjected: 0, totalActual: 0, variance: 0, totalEntries: 0 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue Projections</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Projected Total</p><p className="text-2xl font-bold">${(stats?.totalProjected || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Actual Total</p><p className="text-2xl font-bold">${(stats?.totalActual || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Variance</p><p className={'text-2xl font-bold ' + ((stats?.variance || 0) >= 0 ? 'text-green-500' : 'text-red-500')}>{stats?.variance || 0}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Revenue Entries</p><p className="text-2xl font-bold">{stats?.totalEntries || 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly Projections</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th className="pb-2">Month</th><th className="pb-2">Projected</th><th className="pb-2">Actual</th><th className="pb-2">Confidence</th><th className="pb-2">Status</th></tr></thead>
              <tbody>
                {(projections || []).length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-gray-400">No projections data yet. Add revenue entries to generate projections.</td></tr>
                ) : (projections || []).map(p => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-2">{new Date(p.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                    <td className="py-2">${Number(p.projected_amount || 0).toLocaleString()}</td>
                    <td className="py-2">${Number(p.actual_amount || 0).toLocaleString()}</td>
                    <td className="py-2">{p.confidence_score || 'N/A'}%</td>
                    <td className="py-2"><Badge variant={Number(p.actual_amount || 0) >= Number(p.projected_amount || 0) ? 'success' : 'warning'}>{Number(p.actual_amount || 0) >= Number(p.projected_amount || 0) ? 'On Track' : 'Behind'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}