import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../config/supabaseClient";
import { ShieldCheck, Search, Download } from "lucide-react";

async function authFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      ...opts.headers,
    },
  });
  return res.json();
}

const ACTION_COLORS = {
  create: "#22c55e",
  update: "var(--brand-gold)",
  delete: "#ef4444",
  login: "var(--brand-cyan)",
  logout: "var(--text-muted)",
  export: "#a855f7",
};

export default function ClientAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, st] = await Promise.all([
        authFetch(`/api/audit-logs?limit=200`),
        authFetch(`/api/audit-logs/stats`),
      ]);
      setLogs(Array.isArray(data) ? data : data.data || []);
      setStats(st || {});
    } catch (e) {
      console.error("Audit logs error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l =>
    !search || [l.action, l.resource_type, l.actor_email, l.description]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  async function exportCSV() {
    const rows = [["Time", "Actor", "Action", "Resource", "Description"]];
    filtered.forEach(l => rows.push([
      new Date(l.created_at).toLocaleString("en-PH"),
      l.actor_email || l.actor_id || "-",
      l.action || "-",
      l.resource_type || "-",
      l.description || "-",
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit_logs.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "24px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Audit Logs</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Full trail of actions in your workspace</p>
        </div>
        <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)", cursor: "pointer", fontSize: 14 }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Events", value: logs.length },
          { label: "Today", value: stats.today || 0 },
          { label: "Creates", value: stats.creates || logs.filter(l => l.action === "create").length },
          { label: "Deletes", value: stats.deletes || logs.filter(l => l.action === "delete").length },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: 18 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by action, resource, actor…"
          style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "9px 12px 9px 36px", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading…</div>
      ) : paginated.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: 12 }}>
          <ShieldCheck size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>No audit logs found.</p>
        </div>
      ) : (
        <>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                  {["Time", "Actor", "Action", "Resource", "Description"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((l, i) => (
                  <tr key={l.id || i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(l.created_at).toLocaleString("en-PH")}
                    </td>
                    <td style={{ padding: "10px 14px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.actor_email || l.actor_id || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ color: ACTION_COLORS[l.action] || "var(--text-primary)", fontWeight: 600, textTransform: "capitalize" }}>
                        {l.action || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--brand-cyan)" }}>{l.resource_type || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 14px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-primary)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <span style={{ padding: "6px 14px", color: "var(--text-muted)", fontSize: 13 }}>Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 14px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-primary)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
