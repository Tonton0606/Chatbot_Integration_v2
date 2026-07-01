import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../config/supabaseClient";
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle } from "lucide-react";

async function authFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      ...opts.headers,
    },
  }).then(r => r.json());
}

const ICONS = {
  success: <CheckCircle size={18} color="#22c55e" />,
  warning: <AlertTriangle size={18} color="#f59e0b" />,
  error: <AlertTriangle size={18} color="#ef4444" />,
  info: <Info size={18} color="var(--brand-cyan)" />,
};

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread | read

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
      const { data, error } = await supabase
        .from("workflow_notifications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error) setNotifications(data || []);
    } catch (e) {
      console.error("Notifications load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
    await supabase.from("workflow_notifications").update({ is_read: true }).eq("id", id).eq("workspace_id", workspaceId);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("workflow_notifications").update({ is_read: true }).in("id", unreadIds).eq("workspace_id", workspaceId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function deleteNotification(id) {
    const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
    await supabase.from("workflow_notifications").delete().eq("id", id).eq("workspace_id", workspaceId);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const filtered = filter === "unread" ? notifications.filter(n => !n.is_read)
    : filter === "read" ? notifications.filter(n => n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ padding: "24px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Notifications</h2>
          {unreadCount > 0 && (
            <span style={{ background: "var(--brand-gold)", color: "#000", borderRadius: 20, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
        {["all", "unread", "read"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 18px", background: "transparent", border: "none", cursor: "pointer", fontWeight: filter === f ? 700 : 400, color: filter === f ? "var(--brand-gold)" : "var(--text-muted)", borderBottom: filter === f ? "2px solid var(--brand-gold)" : "2px solid transparent", fontSize: 14, textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: 12 }}>
          <Bell size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>{filter === "unread" ? "No unread notifications." : "No notifications yet."}</p>
          <p style={{ fontSize: 13 }}>Workflow events and system alerts will appear here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(n => (
            <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
              style={{ background: n.is_read ? "var(--bg-card)" : "rgba(212,175,55,0.06)", border: `1px solid ${n.is_read ? "var(--border-color)" : "rgba(212,175,55,0.25)"}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, cursor: n.is_read ? "default" : "pointer" }}>
              <div style={{ marginTop: 2 }}>{ICONS[n.type] || ICONS.info}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                {n.message && <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 3 }}>{n.message}</div>}
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                  {n.trigger_module && <span style={{ marginRight: 8, color: "var(--brand-cyan)" }}>{n.trigger_module}</span>}
                  {new Date(n.created_at).toLocaleString("en-PH")}
                </div>
              </div>
              {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand-gold)", marginTop: 5, flexShrink: 0 }} />}
              <button onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
