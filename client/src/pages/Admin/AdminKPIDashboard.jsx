import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Star,
  Users, Award, Zap, RefreshCw, BarChart3, Trophy, ChevronDown,
  CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, LineChart
} from 'lucide-react';
import { kpiService } from '../../services/kpi/kpiService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function scoreBg(score) {
  if (score >= 70) return 'bg-green-500/10 border-green-200 dark:border-green-500/30';
  if (score >= 60) return 'bg-amber-500/10 border-amber-200 dark:border-amber-500/30';
  return 'bg-red-500/10 border-red-200 dark:border-red-500/30';
}

function stateLabel(state) {
  const map = {
    healthy:   { label: 'Healthy',  cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
    watch:     { label: 'Watch',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
    concern:   { label: 'Concern',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
    critical:  { label: 'Critical', cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  };
  const s = map[state] || { label: state || '—', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${s.cls}`}>{s.label}</span>;
}

function TrendIcon({ trend, delta }) {
  if (trend === 'improving') return (
    <span className="flex items-center gap-0.5 text-green-500 text-xs font-semibold">
      <ArrowUpRight className="w-3.5 h-3.5" /> {delta !== undefined ? `+${Math.abs(delta).toFixed(1)}` : ''}
    </span>
  );
  if (trend === 'declining') return (
    <span className="flex items-center gap-0.5 text-red-500 text-xs font-semibold">
      <ArrowDownRight className="w-3.5 h-3.5" /> {delta !== undefined ? `-${Math.abs(delta).toFixed(1)}` : ''}
    </span>
  );
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
}

function ScoreBar({ value, max = 100 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= 70 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function KPICard({ title, value, icon: Icon, color, sub }) {
  const cls = {
    gold:   'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400',
    blue:   'from-blue-500/20  to-blue-500/5  border-blue-500/30  text-blue-600  dark:text-blue-400',
    green:  'from-green-500/20 to-green-500/5 border-green-500/30 text-green-600 dark:text-green-400',
    red:    'from-red-500/20   to-red-500/5   border-red-500/30   text-red-600   dark:text-red-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-600 dark:text-purple-400',
  }[color] || '';

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${cls}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon className="w-6 h-6 opacity-50" />}
      </div>
    </div>
  );
}

function LeaderboardTable({ data, type }) {
  const scoreKey = type === 'team' ? 'composite_score' : 'weighted_score';
  const idKey    = type === 'team' ? 'team_id' : 'user_id';

  if (!data?.length) return (
    <div className="text-center py-10 text-sm text-gray-400">
      No leaderboard data yet. Scores appear once tasks are scored.
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-white/10">
            <th className="pb-2 pr-4">#</th>
            <th className="pb-2 pr-4">{type === 'team' ? 'Team' : 'Member'}</th>
            <th className="pb-2 pr-4">Score</th>
            <th className="pb-2 pr-4 hidden sm:table-cell">On-time</th>
            <th className="pb-2 pr-4 hidden md:table-cell">Tasks</th>
            <th className="pb-2">State</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
          {data.map((row, i) => (
            <tr key={row[idKey]} className="group">
              <td className="py-2.5 pr-4">
                {i === 0 ? <Trophy className="w-4 h-4 text-amber-500" />
                  : i === 1 ? <Trophy className="w-4 h-4 text-gray-400" />
                  : i === 2 ? <Trophy className="w-4 h-4 text-orange-400" />
                  : <span className="text-gray-400 text-xs font-mono">{i + 1}</span>}
              </td>
              <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-white truncate max-w-[140px]">
                {row[idKey]}
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${scoreColor(row[scoreKey])}`}>
                    {Math.round(row[scoreKey] ?? 0)}
                  </span>
                  <div className="w-16 hidden sm:block">
                    <ScoreBar value={row[scoreKey] ?? 0} />
                  </div>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-gray-500 hidden sm:table-cell">
                {row.on_time_rate != null ? `${Math.round(row.on_time_rate)}%` : '—'}
              </td>
              <td className="py-2.5 pr-4 text-gray-500 hidden md:table-cell">
                {row.tasks_evaluated ?? '—'}
              </td>
              <td className="py-2.5">{stateLabel(row.score_state)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecommendationsPanel({ recs, onUpdate }) {
  const [updating, setUpdating] = useState(null);

  async function handleAction(id, status) {
    setUpdating(id);
    try {
      await kpiService.acknowledgeRec(id, status);
      onUpdate(id, status);
    } finally {
      setUpdating(null);
    }
  }

  if (!recs?.length) return (
    <div className="text-center py-10 text-sm text-gray-400">
      No pending actions. Dashboard is healthy.
    </div>
  );

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...recs].sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));

  return (
    <div className="space-y-3">
      {sorted.map(r => (
        <div key={r.id} className="rounded-lg border border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  r.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  : r.priority === 'high'   ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                }`}>{r.priority}</span>
                <span className="text-xs text-gray-400 capitalize">{r.category?.replace(/_/g, ' ')}</span>
                {r.subject_name && <span className="text-xs text-gray-400">· {r.subject_name}</span>}
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{r.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.body}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                disabled={updating === r.id}
                onClick={() => handleAction(r.id, 'acknowledged')}
                className="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Ack
              </button>
              <button
                disabled={updating === r.id}
                onClick={() => handleAction(r.id, 'in_progress')}
                className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                In Progress
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecalculateModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ subject_type: 'workspace', subject_id: '', mode: 'corporate' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form.subject_type, form.subject_id || undefined, form.mode);
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/10 w-full max-w-md p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recalculate KPI Scores</h2>
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Recalculation complete.</p>
            <button onClick={onClose} className="mt-4 text-sm text-blue-500 hover:underline">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject type</label>
              <select
                value={form.subject_type}
                onChange={e => setForm(f => ({ ...f, subject_type: e.target.value }))}
                className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="workspace">Entire Workspace (all)</option>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
                <option value="project">Project</option>
              </select>
            </div>
            {form.subject_type !== 'workspace' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject ID (UUID)</label>
                <input
                  type="text"
                  required
                  value={form.subject_id}
                  onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
                  className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter UUID..."
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Governance mode</label>
              <select
                value={form.mode}
                onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="corporate">Corporate</option>
                <option value="smb">SMB</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2 text-sm rounded-lg bg-[var(--brand-gold,#f59e0b)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Running…' : 'Run Recalculation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminKPIDashboard() {
  const [dashboard, setDashboard]     = useState(null);
  const [leaderboard, setLeaderboard] = useState({ individual: [], team: [] });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeTab, setActiveTab]     = useState('overview');
  const [lbType, setLbType]           = useState('individual');
  const [showRecalc, setShowRecalc]   = useState(false);
  const [pending, setPending]         = useState([]);
  const [showForecast, setShowForecast] = useState(false);
  const [forecast, setForecast]       = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [dash, lb_ind, lb_team] = await Promise.all([
        kpiService.getDashboard(),
        kpiService.getLeaderboard('individual'),
        kpiService.getLeaderboard('team'),
      ]);
      setDashboard(dash);
      setPending(dash.pending_actions || []);
      setLeaderboard({ individual: lb_ind || [], team: lb_team || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleRefresh() { setRefreshing(true); await loadAll(); }

  async function loadForecast() {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const data = await kpiService.getForecast(30, 'kpi_score');
      setForecast(data);
    } catch (err) {
      setForecastError(err.message || 'Failed to load forecast');
    } finally {
      setForecastLoading(false);
    }
  }

  useEffect(() => {
    if (showForecast && !forecast && !forecastLoading) {
      loadForecast();
    }
  }, [showForecast]);

  function handleRecUpdate(id, newStatus) {
    if (['resolved', 'dismissed', 'acknowledged', 'in_progress'].includes(newStatus)) {
      setPending(prev => prev.filter(r => r.id !== id));
    }
  }

  async function handleRecalculate(subjectType, subjectId) {
    await kpiService.recalculate(subjectType, subjectId);
    setShowRecalc(false);
    setRefreshing(true);
    await loadAll();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-28">
      <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-sm text-gray-500 mb-1">Failed to load KPI data</p>
      <p className="text-xs text-red-400">{error}</p>
      <button onClick={loadAll} className="mt-4 text-sm text-blue-500 hover:underline">Retry</button>
    </div>
  );

  const d = dashboard || {};

  const TABS = [
    { id: 'overview',     label: 'Overview' },
    { id: 'leaderboard',  label: 'Leaderboard' },
    { id: 'actions',      label: `Actions${pending.length ? ` (${pending.length})` : ''}` },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">KPI Performance Center</h1>
          <p className="text-sm text-gray-500">Workspace-wide performance metrics · Period: {d.period || '—'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowRecalc(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[var(--brand-gold,#f59e0b)]/10 text-[var(--brand-gold,#f59e0b)] border border-[var(--brand-gold,#f59e0b)]/30 hover:bg-[var(--brand-gold,#f59e0b)]/20 transition-colors font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            Recalculate
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Top Performers"   value={d.top_performers?.length || 0}  icon={Award}         color="gold"   sub="score ≥ 85 this week" />
        <KPICard title="At Risk"          value={d.at_risk?.length || 0}          icon={AlertTriangle} color="red"    sub="score < 60" />
        <KPICard title="Teams Monitored"  value={d.team_scores?.length || 0}      icon={Users}         color="blue"   />
        <KPICard title="Open Actions"     value={pending.length}                  icon={Zap}           color="purple" sub="high/critical priority" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-[var(--brand-gold,#f59e0b)] text-[var(--brand-gold,#f59e0b)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">

        {activeTab === 'overview' && (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {/* Top performers */}
            <div className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase mb-3">
                <Star className="w-4 h-4 text-amber-500" /> Top Performers
              </h3>
              {!d.top_performers?.length ? (
                <p className="text-sm text-gray-400 text-center py-5">No top performers yet this period.</p>
              ) : (
                <div className="space-y-2">
                  {d.top_performers.map((p, i) => (
                    <div key={p.subject_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-green-500/5 border border-green-200 dark:border-green-500/20">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.subject_name || p.subject_id}</p>
                        <div className="flex gap-3 flex-wrap mt-0.5">
                          {p.component_scores && Object.entries(p.component_scores).slice(0, 3).map(([k, v]) => (
                            <span key={k} className="text-xs text-gray-500">{k.replace(/_/g,' ')}: {Math.round(v ?? 0)}%</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <TrendIcon trend={p.score_trend} />
                        <span className={`text-xl font-bold ${scoreColor(p.overall_score)}`}>{Math.round(p.overall_score)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* At-risk */}
            <div className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" /> At Risk — Needs Coaching
              </h3>
              {!d.at_risk?.length ? (
                <p className="text-sm text-gray-400 text-center py-5">No at-risk members this period.</p>
              ) : (
                <div className="space-y-2">
                  {d.at_risk.map(p => (
                    <div key={p.subject_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-200 dark:border-red-500/20">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{p.subject_name || p.subject_id}</p>
                        <div className="flex gap-2 items-center mt-0.5">
                          {stateLabel(p.score_state)}
                          <span className="text-xs text-gray-400 capitalize">{p.score_trend}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <TrendIcon trend={p.score_trend} />
                        <span className={`text-xl font-bold ${scoreColor(p.overall_score)}`}>{Math.round(p.overall_score)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teams */}
            <div className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase mb-3">
                <Users className="w-4 h-4 text-blue-500" /> Team Health
              </h3>
              {!d.team_scores?.length ? (
                <p className="text-sm text-gray-400 text-center py-5">No team scores yet.</p>
              ) : (
                <div className="space-y-2">
                  {d.team_scores.map(t => (
                    <div key={t.team_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5">
                      <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.team_id}</p>
                        <p className="text-xs text-gray-400">{t.members_evaluated}/{t.member_count} members · {t.availability_rate}% available</p>
                        <div className="mt-1"><ScoreBar value={t.composite_score} /></div>
                      </div>
                      <span className={`text-lg font-bold flex-shrink-0 ${scoreColor(t.composite_score)}`}>
                        {Math.round(t.composite_score)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase">
                <Trophy className="w-4 h-4 text-amber-500" /> Leaderboard
              </h3>
              <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-white/10 p-0.5">
                {['individual', 'team'].map(t => (
                  <button key={t} onClick={() => setLbType(t)}
                    className={`px-3 py-1 text-xs rounded font-medium capitalize transition-colors ${
                      lbType === t
                        ? 'bg-[var(--brand-gold,#f59e0b)] text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <LeaderboardTable data={leaderboard[lbType]} type={lbType} />
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase mb-4">
              <Zap className="w-4 h-4 text-amber-500" /> Recommended Actions
            </h3>
            <RecommendationsPanel recs={pending} onUpdate={handleRecUpdate} />
          </div>
        )}
      </div>

      {showRecalc && (
        <RecalculateModal
          onClose={() => setShowRecalc(false)}
          onSubmit={handleRecalculate}
        />
      )}

      {/* Forecast Panel */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        <button
          onClick={() => setShowForecast(f => !f)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-[var(--brand-gold,#f59e0b)]" />
            KPI Forecast (30 days)
          </span>
          {showForecast ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400 rotate-180" />}
        </button>

        {showForecast && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-white/10">
            {forecastLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-3 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {forecastError && (
              <div className="py-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-400">{forecastError}</p>
                <button onClick={loadForecast} className="mt-3 text-sm text-blue-500 hover:underline">Retry</button>
              </div>
            )}

            {!forecastLoading && !forecastError && forecast && (
              <div className="mt-4">
                {/* Confidence Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-medium text-gray-500">Confidence</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    (forecast.confidence ?? 0) >= 0.7
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                      : (forecast.confidence ?? 0) >= 0.5
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  }`}>
                    {Math.round((forecast.confidence ?? 0) * 100)}%
                  </span>
                  {(forecast.confidence ?? 0) < 0.5 && (
                    <span className="text-xs text-gray-400 italic">Low confidence — add more KPI data.</span>
                  )}
                </div>

                {/* Simple SVG Line Chart */}
                {forecast.forecast && forecast.forecast.length > 0 ? (
                  <div className="relative h-40 w-full">
                    <svg viewBox={`0 0 ${forecast.forecast.length * 20} 100`} className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--brand-gold,#f59e0b)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--brand-gold,#f59e0b)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const values = forecast.forecast.map(f => f.predicted_value ?? 0);
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const range = max - min || 1;
                        const points = forecast.forecast.map((f, i) => {
                          const x = i * 20 + 10;
                          const y = 90 - ((f.predicted_value - min) / range) * 80;
                          return { x, y, value: f.predicted_value, date: f.date };
                        });

                        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        const areaD = `${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

                        return (
                          <>
                            <path d={areaD} fill="url(#forecastGradient)" />
                            <path d={pathD} fill="none" stroke="var(--brand-gold,#f59e0b)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map((p, i) => (
                              <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--brand-gold,#f59e0b)" />
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{forecast.forecast[0]?.date || 'Start'}</span>
                      <span>{forecast.forecast[forecast.forecast.length - 1]?.date || 'End'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">No forecast data available yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
