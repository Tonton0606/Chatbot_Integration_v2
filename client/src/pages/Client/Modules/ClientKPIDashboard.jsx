import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Star,
  Users, FolderKanban, CheckCircle2, Clock, RotateCcw,
  ChevronRight, RefreshCw, Award, Zap
} from 'lucide-react';
import { kpiService } from '../../../services/kpi/kpiService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function scoreBg(score) {
  if (score >= 70) return 'bg-green-500/10 border-green-500/30';
  if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function ScoreRing({ score, size = 80 }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const fill = ((score || 0) / 100) * circ;
  const color = score >= 70 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-white/10" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        className="rotate-90" fill={color}
        style={{ transform: `rotate(90deg) translate(0, -${size/2}px)`, fontSize: size * 0.22, fontWeight: 700 }}>
        {Math.round(score || 0)}
      </text>
    </svg>
  );
}

function TrendIcon({ trend }) {
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function StatPill({ label, value, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green:  'bg-green-500/10 text-green-600 dark:text-green-400',
    amber:  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red:    'bg-red-500/10 text-red-600 dark:text-red-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors[color]}`}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <div>
        <p className="text-xs font-medium leading-none">{label}</p>
        <p className="text-sm font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    high:     'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    medium:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    low:      'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[priority] || map.low}`}>
      {priority}
    </span>
  );
}

// ── Section Components ────────────────────────────────────────────────────────

function TopPerformers({ people }) {
  if (!people?.length) return (
    <div className="text-center py-8 text-gray-400 text-sm">No top performer data yet.</div>
  );
  return (
    <div className="space-y-2">
      {people.map((p, i) => (
        <div key={p.subject_id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-white/5">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.subject_name || 'Unknown'}</p>
            <div className="flex gap-3 mt-0.5">
              <span className="text-xs text-gray-500">On-time: {p.component_scores?.on_time_rate ?? '—'}%</span>
              <span className="text-xs text-gray-500">Quality: {p.component_scores?.reopen_score ?? '—'}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={p.score_trend} />
            <span className={`text-lg font-bold ${scoreColor(p.overall_score)}`}>{Math.round(p.overall_score)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AtRiskList({ people }) {
  if (!people?.length) return (
    <div className="text-center py-8 text-gray-400 text-sm">No at-risk members. Great!</div>
  );
  return (
    <div className="space-y-2">
      {people.map((p) => (
        <div key={p.subject_id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${scoreBg(p.overall_score)}`}>
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.subject_name || 'Unknown'}</p>
            <p className="text-xs text-gray-500 capitalize">{p.score_state?.replace('_', ' ')} · {p.score_trend}</p>
          </div>
          <span className={`text-lg font-bold ${scoreColor(p.overall_score)}`}>{Math.round(p.overall_score)}</span>
        </div>
      ))}
    </div>
  );
}

function TeamScoreList({ teams }) {
  if (!teams?.length) return (
    <div className="text-center py-8 text-gray-400 text-sm">No team scores computed yet.</div>
  );
  return (
    <div className="space-y-2">
      {teams.map((t) => (
        <div key={t.team_id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-white/5">
          <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white">{t.team_id}</p>
            <p className="text-xs text-gray-500">
              {t.members_evaluated}/{t.member_count} members · {t.availability_rate}% available
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${t.composite_score >= 70 ? 'bg-green-500' : t.composite_score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${t.composite_score}%` }} />
            </div>
            <span className={`text-sm font-bold ${scoreColor(t.composite_score)}`}>{Math.round(t.composite_score)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingActions({ recs, onAck }) {
  if (!recs?.length) return (
    <div className="text-center py-8 text-gray-400 text-sm">No pending critical actions.</div>
  );
  return (
    <div className="space-y-2">
      {recs.map((r) => (
        <div key={r.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <PriorityBadge priority={r.priority} />
              <span className="text-xs text-gray-500 capitalize">{r.category?.replace('_', ' ')}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{r.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.body}</p>
          </div>
          <button
            onClick={() => onAck(r.id)}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium whitespace-nowrap mt-0.5"
          >
            Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientKPIDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await kpiService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
  }

  async function handleAcknowledge(recId) {
    try {
      await kpiService.acknowledgeRec(recId, 'acknowledged');
      setDashboard(prev => ({
        ...prev,
        pending_actions: prev.pending_actions.filter(r => r.id !== recId),
      }));
    } catch {}
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-sm text-gray-500">Failed to load KPI dashboard.</p>
      <p className="text-xs text-gray-400 mt-1">{error}</p>
      <button onClick={load} className="mt-4 text-sm text-blue-500 hover:underline">Retry</button>
    </div>
  );

  const d = dashboard || {};

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'people',    label: 'People' },
    { id: 'teams',     label: 'Teams' },
    { id: 'actions',   label: `Actions ${d.pending_actions?.length ? `(${d.pending_actions.length})` : ''}` },
  ];

  return (
    <div className="space-y-5 p-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Performance Dashboard</h1>
          <p className="text-sm text-gray-500">KPI scores, team health, and improvement actions</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill label="Top Performers"  value={d.top_performers?.length || 0}   icon={Star}         color="amber" />
        <StatPill label="At Risk"         value={d.at_risk?.length || 0}           icon={AlertTriangle} color="red"   />
        <StatPill label="Teams Tracked"   value={d.team_scores?.length || 0}       icon={Users}         color="blue"  />
        <StatPill label="Pending Actions" value={d.pending_actions?.length || 0}   icon={Zap}           color="purple"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--brand-gold,#f59e0b)] text-[var(--brand-gold,#f59e0b)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">

        {activeTab === 'overview' && (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Top Performers This Week
              </h3>
              <TopPerformers people={d.top_performers} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Needs Attention
              </h3>
              <AtRiskList people={d.at_risk} />
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">All Scored Individuals</h3>
            {(!d.top_performers?.length && !d.at_risk?.length) ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                No individual scores yet. Scores appear as tasks are completed.
              </div>
            ) : (
              <div className="space-y-2">
                {[...(d.top_performers || []), ...(d.at_risk || [])].map(p => (
                  <div key={p.subject_id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${scoreBg(p.overall_score)}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{p.subject_name || 'Unknown'}</p>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        {p.component_scores && Object.entries(p.component_scores).map(([k, v]) => (
                          <span key={k} className="text-xs text-gray-500">
                            {k.replace(/_/g, ' ')}: {typeof v === 'number' ? `${Math.round(v)}%` : '—'}
                          </span>
                        ))}
                        {p.stats?.tasks_total && (
                          <span className="text-xs text-gray-400">{p.stats.tasks_total} tasks</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <TrendIcon trend={p.score_trend} />
                      <span className={`text-xl font-bold ${scoreColor(p.overall_score)}`}>
                        {Math.round(p.overall_score)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Team Health Scores
            </h3>
            <TeamScoreList teams={d.team_scores} />
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> High-Priority Recommended Actions
            </h3>
            <PendingActions recs={d.pending_actions} onAck={handleAcknowledge} />
          </div>
        )}
      </div>

      {/* Period note */}
      {d.period && (
        <p className="text-xs text-gray-400 text-center">
          Current period starting {d.period} · Scores update hourly
        </p>
      )}
    </div>
  );
}
