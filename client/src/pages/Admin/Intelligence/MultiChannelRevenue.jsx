import React, { useEffect, useState, useCallback } from "react";
import {
  getMultiChannelDashboard,
  addChannelEntry,
  getChannelSummary,
  CHANNELS,
  CHANNEL_LABELS,
} from "../../../services/intelligence/multiChannelRevenueService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const today = () => new Date().toISOString().slice(0, 10);

const BLANK_ENTRY = {
  channel: "",
  gross_revenue: "",
  net_revenue: "",
  orders: "",
  roas: "",
  period_date: today(),
};

const RANK_COLORS = ["#f5a623", "var(--brand-cyan)", "var(--success)", "#9ca3af", "#9ca3af"];

export default function MultiChannelRevenue({ onRefresh }) {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(false);
  const [formData, setFormData] = useState(BLANK_ENTRY);
  const [saving, setSaving] = useState(false);

  const [dashboard, setDashboard] = useState({ channels: [] });
  const [summary, setSummary] = useState({ channels: [], totals: {} });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, sum] = await Promise.all([
        getMultiChannelDashboard(),
        getChannelSummary(days),
      ]);
      setDashboard(dash || { channels: [] });
      setSummary(sum || { channels: [], totals: {} });
    } catch (err) {
      setError(err.message || "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const channels = summary.channels || [];
  const totals = summary.totals || {};

  const bestChannel = channels.reduce(
    (best, ch) => (!best || (ch.net_revenue || 0) > (best.net_revenue || 0) ? ch : best),
    null
  );

  const totalNet = channels.reduce((sum, ch) => sum + (ch.net_revenue || 0), 0);

  const kpis = [
    { label: "Total Gross Revenue", value: fmt(totals.gross_revenue), color: "var(--brand-cyan)" },
    { label: "Total Net Revenue", value: fmt(totals.net_revenue), color: "var(--success)" },
    { label: "Total Orders", value: (totals.orders || 0).toLocaleString("en-PH"), color: "#f5a623" },
    {
      label: "Best Channel",
      value: bestChannel ? (CHANNEL_LABELS?.[bestChannel.channel] || bestChannel.channel) : "—",
      color: "var(--success)",
    },
  ];

  const handleSave = async () => {
    if (!formData.channel || !formData.gross_revenue || !formData.net_revenue) {
      showToast("Channel, gross revenue, and net revenue are required", false);
      return;
    }
    setSaving(true);
    try {
      await addChannelEntry({
        ...formData,
        gross_revenue: Number(formData.gross_revenue),
        net_revenue: Number(formData.net_revenue),
        orders: Number(formData.orders || 0),
        roas: formData.roas ? Number(formData.roas) : null,
      });
      showToast("Revenue entry logged");
      setModal(false);
      setFormData(BLANK_ENTRY);
      load();
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast(err.message || "Save failed", false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="intel-loading">Loading...</div>;
  if (error) return <div className="intel-error">{error}</div>;

  const sortedChannels = [...channels].sort((a, b) => (b.net_revenue || 0) - (a.net_revenue || 0));

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Multi-Channel Revenue Intelligence"
        subtitle="Cross-channel revenue tracking: Shopee, Lazada, TikTok Shop, physical stores, and more"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
      />

      {toast && (
        <div
          className="intel-toast"
          style={{ background: toast.ok ? "var(--success)" : "var(--danger)" }}
        >
          {toast.msg}
        </div>
      )}

      <div className="intel-page-body">
        <div className="intel-actions-row">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              className={`intel-btn ${days === d ? "intel-btn-ai" : ""}`}
              onClick={() => setDays(d)}
            >
              {d} Days
            </button>
          ))}
          <button
            type="button"
            className="intel-btn intel-btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={() => { setFormData(BLANK_ENTRY); setModal(true); }}
          >
            + Log Revenue Entry
          </button>
        </div>

        <div className="intel-kpi-strip">
          {kpis.map((k) => (
            <div key={k.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: k.color }} />
              <div className="intel-kpi-label">{k.label}</div>
              <div className="intel-kpi-value" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="intel-grid-auto">
          {sortedChannels.map((ch, i) => (
            <div key={ch.channel} className="intel-card intel-card-hover">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: RANK_COLORS[i] || "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#fff",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div className="intel-heavy" style={{ fontSize: 15 }}>
                  {CHANNEL_LABELS?.[ch.channel] || ch.channel}
                </div>
                {ch.roas && (
                  <span
                    className="intel-badge"
                    style={{ marginLeft: "auto", background: "var(--success-soft)", color: "var(--success)" }}
                  >
                    {Number(ch.roas).toFixed(2)}x ROAS
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div className="intel-kpi-label">Gross Revenue</div>
                  <div className="intel-heavy">{fmt(ch.gross_revenue)}</div>
                </div>
                <div>
                  <div className="intel-kpi-label">Net Revenue</div>
                  <div className="intel-heavy" style={{ color: "var(--success)" }}>{fmt(ch.net_revenue)}</div>
                </div>
                <div>
                  <div className="intel-kpi-label">Orders</div>
                  <div className="intel-heavy">{(ch.orders || 0).toLocaleString("en-PH")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="intel-panel">
          <div className="intel-panel-header">Channel Comparison — Last {days} Days</div>
          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  {["Channel", "Gross Revenue", "Net Revenue", "Orders", "Avg ROAS", "% of Total"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedChannels.map((ch) => {
                  const pct = totalNet > 0 ? ((ch.net_revenue || 0) / totalNet * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={ch.channel}>
                      <td className="intel-heavy">{CHANNEL_LABELS?.[ch.channel] || ch.channel}</td>
                      <td className="intel-table-money">{fmt(ch.gross_revenue)}</td>
                      <td className="intel-table-money" style={{ color: "var(--success)" }}>{fmt(ch.net_revenue)}</td>
                      <td>{(ch.orders || 0).toLocaleString("en-PH")}</td>
                      <td>{ch.roas ? `${Number(ch.roas).toFixed(2)}x` : "—"}</td>
                      <td>
                        <span className="intel-badge" style={{ background: "rgba(74,144,217,0.12)", color: "var(--brand-cyan)" }}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sortedChannels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="intel-text-muted" style={{ padding: 16 }}>
                      No channel data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="intel-modal-overlay">
          <div className="intel-modal">
            <div className="intel-modal-header">
              <span>Log Revenue Entry</span>
              <button type="button" className="intel-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="intel-modal-body">
              <label className="intel-label">Channel *</label>
              <select
                className="intel-input"
                value={formData.channel}
                onChange={(e) => setFormData((p) => ({ ...p, channel: e.target.value }))}
              >
                <option value="">Select Channel</option>
                {(CHANNELS || []).map((c) => (
                  <option key={c} value={c}>{CHANNEL_LABELS?.[c] || c}</option>
                ))}
              </select>

              <label className="intel-label">Gross Revenue (₱) *</label>
              <input
                type="number"
                className="intel-input"
                value={formData.gross_revenue}
                onChange={(e) => setFormData((p) => ({ ...p, gross_revenue: e.target.value }))}
                placeholder="0.00"
                min="0"
              />

              <label className="intel-label">Net Revenue (₱) *</label>
              <input
                type="number"
                className="intel-input"
                value={formData.net_revenue}
                onChange={(e) => setFormData((p) => ({ ...p, net_revenue: e.target.value }))}
                placeholder="0.00"
                min="0"
              />

              <label className="intel-label">Orders</label>
              <input
                type="number"
                className="intel-input"
                value={formData.orders}
                onChange={(e) => setFormData((p) => ({ ...p, orders: e.target.value }))}
                placeholder="0"
                min="0"
              />

              <label className="intel-label">ROAS (optional)</label>
              <input
                type="number"
                className="intel-input"
                value={formData.roas}
                onChange={(e) => setFormData((p) => ({ ...p, roas: e.target.value }))}
                placeholder="e.g. 3.5"
                min="0"
                step="0.01"
              />

              <label className="intel-label">Period Date</label>
              <input
                type="date"
                className="intel-input"
                value={formData.period_date}
                onChange={(e) => setFormData((p) => ({ ...p, period_date: e.target.value }))}
              />
            </div>
            <div className="intel-modal-footer">
              <button type="button" className="intel-btn intel-btn-secondary" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="intel-btn intel-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Log Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
