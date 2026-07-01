import { useState, useEffect, useCallback } from "react";
import {
  Bell, Clock, Video, CheckCircle, X, ExternalLink,
  AlertCircle, AlertTriangle, Timer, Activity, CheckCheck,
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../../services/notificationService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoStr) {
  const ms = Date.now() - new Date(isoStr).getTime();
  const m  = Math.floor(ms / 60000);
  const h  = Math.floor(ms / 3600000);
  const d  = Math.floor(ms / 86400000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  const date     = new Date(dateStr + 'T12:00:00');
  const today    = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString())    return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TASK_NOTIF_ICONS = {
  task_overdue:            <AlertCircle  className="w-3.5 h-3.5 text-red-500" />,
  task_stale_todo:         <Timer        className="w-3.5 h-3.5 text-amber-500" />,
  task_stale_in_progress:  <Activity     className="w-3.5 h-3.5 text-orange-500" />,
  task_no_activity:        <Clock        className="w-3.5 h-3.5 text-gray-400" />,
  task_due_soon:           <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
};

const TASK_NOTIF_BG = {
  task_overdue:           'bg-red-500/10 border-red-500/20',
  task_stale_todo:        'bg-amber-500/10 border-amber-500/20',
  task_stale_in_progress: 'bg-orange-500/10 border-orange-500/20',
  task_no_activity:       'bg-gray-500/10 border-gray-500/20',
  task_due_soon:          'bg-amber-500/10 border-amber-400/30',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen]             = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [taskNotifs, setTaskNotifs]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const { isDark }                      = useTheme();
  const navigate                        = useNavigate();

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsPending, bookingsApproved, taskNotifRes] = await Promise.allSettled([
        supabase
          .from('demo_bookings')
          .select('*')
          .or('status.in.(pending,new),status.is.null')
          .order('created_at', { ascending: false }),

        supabase
          .from('demo_bookings')
          .select('*')
          .eq('status', 'approved')
          .gte('preferred_date', new Date().toISOString().split('T')[0])
          .order('preferred_date', { ascending: true })
          .limit(5),

        notificationService.getAll(false, 20),
      ]);

      if (bookingsPending.status === 'fulfilled' && !bookingsPending.value.error)
        setPendingBookings(bookingsPending.value.data || []);
      if (bookingsApproved.status === 'fulfilled' && !bookingsApproved.value.error)
        setUpcomingMeetings(bookingsApproved.value.data || []);
      if (taskNotifRes.status === 'fulfilled')
        setTaskNotifs(taskNotifRes.value.data || []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const sub = supabase
      .channel('booking-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_bookings' }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchAll]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleMarkRead(id) {
    setTaskNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    notificationService.markRead(id).catch(() => {});
  }

  async function handleMarkAllRead() {
    setTaskNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    notificationService.markAllRead().catch(() => {});
  }

  async function handleDismiss(id, e) {
    e.stopPropagation();
    setTaskNotifs(prev => prev.filter(n => n.id !== id));
    notificationService.dismiss(id).catch(() => {});
  }

  function handleTaskClick(notif) {
    handleMarkRead(notif.id);
    setIsOpen(false);
    if (notif.link) navigate(notif.link);
  }

  // ── Counts ──────────────────────────────────────────────────────────────────

  const unreadTaskCount = taskNotifs.filter(n => !n.is_read).length;
  const totalBadge      = pendingBookings.length + upcomingMeetings.length + unreadTaskCount;

  // ── Render ──────────────────────────────────────────────────────────────────

  const panelCls = isDark
    ? 'bg-[#0d1525] border-white/10 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const sectionHeadCls = (color) =>
    `text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? `text-${color}-400` : `text-${color}-600`}`;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`relative p-1.5 rounded-md transition-colors ${isDark
          ? 'hover:bg-white/10 text-gray-400'
          : 'hover:bg-gray-100 text-gray-500'
        }`}
      >
        <Bell className="w-4 h-4" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 bg-[#c9a84c] text-[#0a0e1a] text-xs font-bold rounded-full flex items-center justify-center px-1">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className={`absolute right-0 top-full mt-2 w-96 rounded-xl shadow-xl border z-20 flex flex-col max-h-[520px] ${panelCls}`}>

            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'} flex-shrink-0`}>
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadTaskCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-[#c9a84c] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-4 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : totalBadge === 0 && taskNotifs.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>All caught up!</p>
                </div>
              ) : (
                <>
                  {/* ── Aging / Task Notifications ─────────────────────────── */}
                  {taskNotifs.length > 0 && (
                    <div>
                      <h4 className={sectionHeadCls('orange')}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Task Alerts ({unreadTaskCount > 0 ? `${unreadTaskCount} new` : taskNotifs.length})
                      </h4>
                      <div className="space-y-1.5">
                        {taskNotifs.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleTaskClick(n)}
                            className={`relative flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all hover:opacity-90 ${
                              TASK_NOTIF_BG[n.type] || 'bg-gray-500/10 border-gray-500/20'
                            } ${!n.is_read ? 'ring-1 ring-inset ring-[#c9a84c]/30' : 'opacity-75'}`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {TASK_NOTIF_ICONS[n.type] || <Bell className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium leading-snug ${isDark ? 'text-white' : 'text-gray-900'} ${!n.is_read ? 'font-semibold' : ''}`}>
                                {n.title}
                              </p>
                              {n.body && (
                                <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {n.body}
                                </p>
                              )}
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {timeAgo(n.created_at)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDismiss(n.id, e)}
                              className={`flex-shrink-0 p-0.5 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-100 text-gray-300'}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {!n.is_read && (
                              <span className="absolute top-2 right-7 w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Pending Booking Approvals ──────────────────────────── */}
                  {pendingBookings.length > 0 && (
                    <div>
                      <h4 className={sectionHeadCls('amber')}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pending Approval ({pendingBookings.length})
                      </h4>
                      <div className="space-y-1.5">
                        {pendingBookings.map(b => (
                          <div
                            key={b.id}
                            onClick={() => { setIsOpen(false); navigate('/Admin/Booking', { state: { focusBookingId: b.id } }); }}
                            className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer hover:opacity-90 transition-all ${isDark
                              ? 'bg-amber-500/10 border-amber-500/20'
                              : 'bg-amber-50 border-amber-200'}`}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{b.full_name}</p>
                                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(b.preferred_date)}</span>
                              </div>
                              <div className={`flex items-center gap-2 text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Clock className="w-3 h-3" />{b.preferred_time}
                                {b.company && <span>· {b.company}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Upcoming Meetings ──────────────────────────────────── */}
                  {upcomingMeetings.length > 0 && (
                    <div>
                      <h4 className={sectionHeadCls('emerald')}>
                        <Video className="w-3.5 h-3.5" />
                        Upcoming Meetings ({upcomingMeetings.length})
                      </h4>
                      <div className="space-y-1.5">
                        {upcomingMeetings.map(b => {
                          const link = b.platform === 'zoom' ? b.zoom_join_url : b.platform === 'google_meet' ? b.meet_link : null;
                          return (
                            <div key={b.id} className={`flex items-start gap-2.5 p-3 rounded-lg border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                              <Video className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{b.full_name}</p>
                                  <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(b.preferred_date)}</span>
                                </div>
                                <div className={`flex items-center gap-2 text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <Clock className="w-3 h-3" />{b.preferred_time}
                                </div>
                                {link && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); window.open(link, '_blank'); }}
                                    className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                                  >
                                    <ExternalLink className="w-3 h-3" /> Join
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between px-4 py-2.5 border-t text-xs flex-shrink-0 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
              <button
                onClick={() => { setIsOpen(false); navigate('/Admin/Notifications'); }}
                className="text-[#c9a84c] hover:underline font-medium"
              >
                View all notifications
              </button>
              {taskNotifs.some(n => n.is_read) && (
                <button
                  onClick={() => { notificationService.clearRead().then(fetchAll).catch(() => {}); }}
                  className={`${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Clear read
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
