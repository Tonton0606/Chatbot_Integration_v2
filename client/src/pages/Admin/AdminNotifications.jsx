import { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, AlertCircle, AlertTriangle, Clock, Timer,
  Activity, Info, CheckCircle, X, Settings, RefreshCw
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

// ── Icon/color maps ───────────────────────────────────────────────────────────

const TYPE_META = {
  task_overdue:           { icon: AlertCircle,  color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-200 dark:border-red-500/20',    label: 'Overdue' },
  task_stale_todo:        { icon: Timer,         color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-200 dark:border-amber-500/20',  label: 'Stale (Todo)' },
  task_stale_in_progress: { icon: Activity,      color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', label: 'Stale (In Progress)' },
  task_no_activity:       { icon: Clock,         color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-200 dark:border-white/10',        label: 'No Activity' },
  task_due_soon:          { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-200 dark:border-amber-400/20',   label: 'Due Soon' },
  task_assigned:          { icon: CheckCircle,   color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-200 dark:border-blue-500/20',     label: 'Assigned' },
  task_completed:         { icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-200 dark:border-green-500/20',   label: 'Completed' },
  task_reopened:          { icon: RefreshCw,     color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', label: 'Reopened' },
};

function getMeta(type) {
  return TYPE_META[type] || { icon: Info, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-200 dark:border-white/10', label: type };
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(ms / 86400000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Config Panel ──────────────────────────────────────────────────────────────

function AgingConfigPanel({ onClose }) {
  const [cfg, setCfg]       = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    notificationService.getConfig()
      .then(res => setCfg(res.data || {}))
      .catch(() => {});
  }, []);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await notificationService.updateConfig(cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  function numField(key, label) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <input
          type="number" min={0} value={cfg[key] ?? 0}
          onChange={e => setCfg(c => ({ ...c, [key]: Number(e.target.value) }))}
          className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
    );
  }

  function toggleField(key, label) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <button
          onClick={() => setCfg(c => ({ ...c, [key]: !c[key] }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cfg[key] ? 'bg-[var(--brand-gold,#f59e0b)]' : 'bg-gray-200 dark:bg-white/20'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cfg[key] ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/10 w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Aging Alert Settings</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Set 0 to disable a rule. Scans run every 6 hours.</p>
          {numField('overdue_alert_days',     'Alert N days after due date (0 = immediately)')}
          {numField('stale_todo_days',        'Stale "To Do" threshold (days)')}
          {numField('stale_in_progress_days', 'Stale "In Progress" threshold (days)')}
          {numField('no_activity_days',       'No activity threshold (days)')}
          <hr className="border-gray-100 dark:border-white/10" />
          {toggleField('notify_assignee',  'Notify task assignee')}
          {toggleField('notify_manager',   'Notify workspace managers')}
          {toggleField('channel_email',    'Also send email alerts')}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 text-sm rounded-lg bg-[var(--brand-gold,#f59e0b)] text-white font-medium disabled:opacity-50">
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'all',                    label: 'All' },
  { id: 'unread',                 label: 'Unread' },
  { id: 'task_overdue',           label: 'Overdue' },
  { id: 'task_stale_todo',        label: 'Stale Todo' },
  { id: 'task_stale_in_progress', label: 'Stale In Progress' },
  { id: 'task_due_soon',          label: 'Due Soon' },
];

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');
  const [showConfig, setShowConfig]       = useState(false);
  const [unread, setUnread]               = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getAll(false, 100);
      setNotifications(res.data || []);
      setUnread(res.unread || 0);
    } catch {
      // non-fatal — user may not be authenticated yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(u => Math.max(0, u - 1));
    notificationService.markRead(id).catch(() => {});
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    notificationService.markAllRead().catch(() => {});
  }

  function dismiss(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    notificationService.dismiss(id).catch(() => {});
  }

  function clearRead() {
    setNotifications(prev => prev.filter(n => !n.is_read));
    notificationService.clearRead().catch(() => {});
  }

  const visible = notifications.filter(n => {
    if (filter === 'all')    return true;
    if (filter === 'unread') return !n.is_read;
    return n.type === filter;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[var(--brand-gold,#f59e0b)]" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unread > 0 ? `${unread} unread · ` : ''}{notifications.length} total
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          <button onClick={load}
            className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => setShowConfig(true)}
            className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            title="Aging alert settings">
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${filter === f.id
              ? 'bg-[var(--brand-gold,#f59e0b)] border-[var(--brand-gold,#f59e0b)] text-white'
              : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300'}`}>
            {f.label}
          </button>
        ))}
        {notifications.some(n => n.is_read) && (
          <button onClick={clearRead}
            className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">
            Clear read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-gray-100 dark:border-white/10">
            <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No notifications{filter !== 'all' ? ' matching this filter' : ''}.</p>
            <p className="text-xs text-gray-400 mt-1">Task aging alerts appear here automatically every 6 hours.</p>
          </div>
        ) : (
          visible.map(n => {
            const { icon: Icon, color, bg, border, label } = getMeta(n.type);
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${bg} ${border} ${n.is_read ? 'opacity-60' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-white dark:bg-black/20 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-semibold ${color}`}>{label}</span>
                    {n.priority === 'critical' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 font-medium">Critical</span>
                    )}
                    {n.priority === 'high' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 font-medium">High</span>
                    )}
                  </div>
                  <p className={`text-sm text-gray-900 dark:text-white ${n.is_read ? '' : 'font-semibold'}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--brand-gold,#f59e0b)]" />}
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                    className="p-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/10 text-gray-300 dark:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showConfig && <AgingConfigPanel onClose={() => setShowConfig(false)} />}
    </div>
  );
}
