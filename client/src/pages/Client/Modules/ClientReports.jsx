import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../config/supabaseClient";
import { BarChart2, Plus, Play, Download, Trash2, FileText } from "lucide-react";

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

const REPORT_TYPES = [
  { label: "Sales Summary", value: "sales_summary" },
  { label: "Lead Pipeline", value: "lead_pipeline" },
  { label: "Revenue Breakdown", value: "revenue_breakdown" },
  { label: "Inventory Status", value: "inventory_status" },
  { label: "Delivery Performance", value: "delivery_performance" },
  { label: "HR Summary", value: "hr_summary" },
];

function CreateReportModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("sales_summary");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim()) { setErr("Name is required."); return; }
    setSaving(true); setErr("");
    try {
      await authFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), report_type: type }),
      });
      onCreated(); onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440 }}>
        <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginBottom: 20 }}>New Report</h3>
        {err && <p style={{ color: "#ef4444", marginBottom: 12, fontSize: 13 }}>{err}</p>}
        <label style={{ color: "var(--text-muted)", fontSize: 13, display: "block", marginBottom: 4 }}>Report Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Sales Report"
          style={{ width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", marginBottom: 16, fontSize: 14, boxSizing: "border-box" }} />
        <label style={{ color: "var(--text-muted)", fontSize: 13, display: "block", marginBottom: 4 }}>Report Type</label>
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", marginBottom: 20, fontSize: 14, boxSizing: "border-box" }}>
          {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--brand-gold)", color: "#000", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch("/api/reports");
      setReports(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error("Reports load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runReport(id) {
    setRunningId(id);
    try {
      await authFetch(`/api/reports/${id}/run`, { method: "POST" });
      await load();
    } catch (e) {
      console.error("Run report error:", e);
    } finally {
      setRunningId(null);
    }
  }

  async function exportReport(id) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
      const res = await fetch(`/api/reports/${id}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        },
        body: JSON.stringify({ format: "csv" }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `report_${id}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
    }
  }

  async function deleteReport(id) {
    if (!confirm("Delete this report?")) return;
    await authFetch(`/api/reports/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ padding: "24px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Reports</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Create and run business reports</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--brand-gold)", border: "none", borderRadius: 8, color: "#000", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
          <Plus size={16} /> New Report
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: 12 }}>
          <BarChart2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>No reports yet. Create your first report above.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {reports.map(r => (
            <div key={r.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <FileText size={22} color="var(--brand-gold)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3, textTransform: "capitalize" }}>
                    {(r.report_type || "custom").replace(/_/g, " ")}
                  </div>
                </div>
              </div>
              {r.last_run_at && (
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>
                  Last run: {new Date(r.last_run_at).toLocaleString("en-PH")}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => runReport(r.id)} disabled={runningId === r.id}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", background: "var(--brand-gold)", border: "none", borderRadius: 8, color: "#000", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                  <Play size={14} /> {runningId === r.id ? "Running…" : "Run"}
                </button>
                <button onClick={() => exportReport(r.id)} title="Export CSV"
                  style={{ padding: "8px 12px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)", cursor: "pointer" }}>
                  <Download size={15} />
                </button>
                <button onClick={() => deleteReport(r.id)}
                  style={{ padding: "8px 12px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "#ef4444", cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateReportModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
