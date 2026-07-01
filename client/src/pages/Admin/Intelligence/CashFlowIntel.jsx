import React, { useEffect, useState, useCallback } from "react";
import {
  getCashFlowDashboard,
  computeCashFlowProjection,
  CASH_FLOW_HORIZONS,
} from "../../../services/intelligence/cashFlowIntelService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

function AgingBar({ label, amount, max, color }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="intel-small intel-text-muted">{label}</span>
        <span className="intel-small intel-heavy">{fmt(amount)}</span>
      </div>
      <div className="intel-health-bar">
        <div className="intel-health-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function CashFlowIntel({ onRefresh }) {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [horizon, setHorizon] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [computing, setComputing] = useState(false);

  const [dashboard, setDashboard] = useState({});
  const [projection, setProjection] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getCashFlowDashboard();
      setDashboard(d || {});
    } catch (err) {
      setError(err.message || "Failed to load cash flow data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCompute = useCallback(async () => {
    setComputing(true);
    try {
      const result = await computeCashFlowProjection(horizon);
      setProjection(result);
      showToast(`${horizon}-day projection computed`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast(err.message || "Projection failed", false);
    } finally {
      setComputing(false);
    }
  }, [horizon, onRefresh]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { handleCompute(); }, [horizon]); // eslint-disable-line react-hooks/exhaustive-deps

  const proj = projection || {};
  const aging = proj.arAging || {};
  const agingMax = Math.max(
    aging["0_30"] || 0,
    aging["31_60"] || 0,
    aging["61_90"] || 0,
    aging["90_plus"] || 0,
    1
  );
  const burnRate =
    proj.totalOutflows && horizon
      ? (proj.totalOutflows / horizon).toFixed(2)
      : null;

  const kpis = [
    { label: "Total Inflows", value: fmt(proj.totalInflows), color: "var(--success)" },
    { label: "Total Outflows", value: fmt(proj.totalOutflows), color: "var(--danger)" },
    {
      label: "Net Cash Position",
      value: fmt(proj.netCashPosition),
      color: (proj.netCashPosition || 0) >= 0 ? "var(--success)" : "var(--danger)",
    },
    { label: "AR Aging Total", value: fmt(proj.arAgingTotal), color: "var(--brand-cyan)" },
  ];

  if (loading) return <div className="intel-loading">Loading...</div>;
  if (error) return <div className="intel-error">{error}</div>;

  const horizons = CASH_FLOW_HORIZONS || [30, 60, 90];

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Cash Flow Intelligence"
        subtitle="Philippine peso cash flow projection, AR aging analysis, and burn rate monitoring"
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
          {horizons.map((h) => (
            <button
              key={h}
              type="button"
              className={`intel-btn ${horizon === h ? "intel-btn-ai" : ""}`}
              onClick={() => setHorizon(h)}
            >
              {h} Days
            </button>
          ))}
          <button
            type="button"
            className="intel-btn intel-btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={handleCompute}
            disabled={computing}
          >
            {computing ? "⏳ Computing…" : "🔄 Compute Projection"}
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

        {burnRate && (
          <div className="intel-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="intel-scenario-accent" style={{ background: "#f5a623" }} />
            <div>
              <div className="intel-kpi-label">Cash Burn Rate</div>
              <div className="intel-kpi-value" style={{ color: "#f5a623" }}>
                {fmt(burnRate)} / day
              </div>
            </div>
            <div className="intel-text-muted intel-small" style={{ marginLeft: "auto" }}>
              Based on {horizon}-day horizon outflows
            </div>
          </div>
        )}

        {(proj.periods || []).length > 0 && (
          <div className="intel-panel">
            <div className="intel-panel-header">Cash Flow Projection — {horizon} Days</div>
            <div className="intel-table-wrap">
              <table className="intel-table">
                <thead>
                  <tr>
                    {["Period", "Opening Balance", "Inflows (AR)", "Outflows (AP+Payroll)", "Closing Balance", "Status"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proj.periods.map((row, i) => {
                    const positive = (row.closingBalance || 0) >= 0;
                    return (
                      <tr key={i}>
                        <td className="intel-heavy">{row.period}</td>
                        <td className="intel-table-money">{fmt(row.openingBalance)}</td>
                        <td className="intel-table-money" style={{ color: "var(--success)" }}>
                          {fmt(row.inflows)}
                        </td>
                        <td className="intel-table-money" style={{ color: "var(--danger)" }}>
                          {fmt(row.outflows)}
                        </td>
                        <td className="intel-table-money intel-heavy" style={{ color: positive ? "var(--success)" : "var(--danger)" }}>
                          {fmt(row.closingBalance)}
                        </td>
                        <td>
                          <span
                            className="intel-badge"
                            style={{
                              background: positive ? "var(--success-soft)" : "var(--danger-soft)",
                              color: positive ? "var(--success)" : "var(--danger)",
                            }}
                          >
                            {positive ? "Positive" : "Negative"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="intel-panel">
          <div className="intel-panel-header">AR Aging Breakdown</div>
          <div className="intel-card" style={{ border: "none" }}>
            <AgingBar label="0–30 Days" amount={aging["0_30"]} max={agingMax} color="var(--success)" />
            <AgingBar label="31–60 Days" amount={aging["31_60"]} max={agingMax} color="var(--brand-cyan)" />
            <AgingBar label="61–90 Days" amount={aging["61_90"]} max={agingMax} color="#f5a623" />
            <AgingBar label="90+ Days" amount={aging["90_plus"]} max={agingMax} color="var(--danger)" />
          </div>
        </div>
      </div>
    </div>
  );
}
