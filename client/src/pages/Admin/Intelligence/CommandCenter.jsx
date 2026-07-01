import React, { useEffect, useState, useCallback } from "react";
import { getCommandCenterData, generateBoardReport, exportCommandSnapshot } from "../../../services/intelligence/commandCenterService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

function fmt(value, format) {
  if (format === "currency") return `₱${Number(value || 0).toLocaleString()}`;
  if (format === "percent") return `${Number(value || 0)}%`;
  return String(value || 0);
}

const HEALTH_COLOR = {
  healthy: "var(--success)",
  warning: "#f5a623",
  critical: "var(--danger)",
};

const SEVERITY_COLOR = {
  critical: "var(--danger)",
  warning: "#f5a623",
  info: "var(--brand-cyan)",
};

function KpiTile({ kpi }) {
  const isPositive = String(kpi.trend || "").startsWith("+");
  const isNegative = String(kpi.trend || "").startsWith("-");
  return (
    <div className="intel-kpi" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{kpi.icon}</div>
      <div className="intel-kpi-label">{kpi.label}</div>
      <div className="intel-kpi-value" style={{ color: kpi.color }}>{fmt(kpi.value, kpi.format)}</div>
      {kpi.trend && (
        <div
          className="intel-xs intel-mt-4"
          style={{ color: isPositive ? "var(--success)" : isNegative ? "var(--danger)" : "var(--text-muted)" }}
        >
          {kpi.trend} vs last period
        </div>
      )}
    </div>
  );
}

export default function CommandCenter() {
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [feedback, setFeedback] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [dashData, setDashData] = useState({
    commandKpis: [],
    criticalAlerts: [],
    departmentHealth: [],
    loopState: { running: false, state: "idle", decisions: 0, actions: 0 },
  });

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  const load = useCallback(async () => {
    const d = await getCommandCenterData();
    setDashData(d);
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const handleGenerateBoard = async () => {
    setGenerating(true);
    try {
      await generateBoardReport();
      showMsg("Board report generated — check Reports module");
    } catch (err) {
      showMsg(err.message || "Failed to generate report", false);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      await exportCommandSnapshot(format);
      showMsg(`Executive snapshot exported as ${format.toUpperCase()}`);
    } catch (err) {
      showMsg(err.message || "Export failed", false);
    } finally {
      setExporting(false);
    }
  };

  const ls = dashData.loopState;

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Executive Command Center"
        subtitle="Real-time C-suite intelligence dashboard — all critical KPIs, alerts, and decisions in one view"
        period="Live"
        onPeriodChange={() => {}}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        onAISummary={handleGenerateBoard}
        showAI={true}
      />

      {feedback && (
        <div className="intel-toast" style={{ background: feedback.ok ? "var(--success)" : "var(--danger)" }}>
          {feedback.msg}
        </div>
      )}

      <div className="intel-page-body">
        {/* Status Bar */}
        <div className="intel-alert-action-box" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="intel-actions-row">
            <span
              className="intel-status-dot"
              style={{
                background: ls.running ? "var(--success)" : "var(--text-muted)",
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                animation: ls.running ? "pulse 2s infinite" : "none",
              }}
            />
            <span className="intel-small">
              Loop Engine: <strong>{ls.state}</strong> · {ls.decisions} decisions · {ls.actions} actions
            </span>
          </div>
          <div className="intel-actions-row">
            {lastRefreshed && (
              <span className="intel-xs intel-text-muted">
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              className="intel-btn"
              type="button"
              onClick={() => handleExport("csv")}
              disabled={exporting}
            >
              {exporting ? "⏳" : "↓ CSV"}
            </button>
            <button
              className="intel-btn"
              type="button"
              onClick={() => handleExport("json")}
              disabled={exporting}
            >
              {exporting ? "⏳" : "↓ JSON"}
            </button>
            <button
              className="intel-btn intel-btn-primary"
              type="button"
              onClick={handleGenerateBoard}
              disabled={generating}
            >
              {generating ? "⏳ Generating…" : "📋 Board Report"}
            </button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {dashData.criticalAlerts.filter((a) => a.severity === "critical").length > 0 && (
          <div
            className="intel-panel"
            style={{ borderLeft: "4px solid var(--danger)", marginBottom: 16 }}
          >
            <div className="intel-panel-header" style={{ color: "var(--danger)" }}>
              🚨 Critical Alerts Requiring Attention
            </div>
            {dashData.criticalAlerts.filter((a) => a.severity === "critical").map((a) => (
              <div key={a.id} className="intel-recommendation-row">
                <span className="intel-badge" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  {a.module}
                </span>
                <div className="intel-flex-1">
                  <div className="intel-section-title">{a.title}</div>
                  {a.action && <div className="intel-section-subtitle">{a.action}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPI Grid */}
        <div className="intel-panel" style={{ marginBottom: 16 }}>
          <div className="intel-panel-header">Live KPI Dashboard</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {dashData.commandKpis.map((kpi) => (
              <KpiTile key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </div>

        <div className="intel-grid-two">
          {/* Department Health */}
          <div className="intel-panel">
            <div className="intel-panel-header">Department Health</div>
            {dashData.departmentHealth.map((d) => {
              const color = HEALTH_COLOR[d.status] || HEALTH_COLOR.warning;
              return (
                <div key={d.dept} className="intel-recommendation-row">
                  <div className="intel-flex-1">
                    <div className="intel-section-title">{d.dept}</div>
                  </div>
                  <div className="intel-health-bar intel-progress-fixed" style={{ width: 100 }}>
                    <div className="intel-health-fill" style={{ width: `${d.score}%`, background: color }} />
                  </div>
                  <span className="intel-heavy" style={{ color, minWidth: 40 }}>{d.score}%</span>
                  <span className="intel-badge" style={{ background: color + "18", color, borderColor: color + "44" }}>
                    {d.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Alerts */}
          <div className="intel-panel">
            <div className="intel-panel-header">Active Alerts ({dashData.criticalAlerts.length})</div>
            {dashData.criticalAlerts.map((a) => {
              const sevColor = SEVERITY_COLOR[a.severity] || "var(--text-muted)";
              return (
                <div key={a.id} className="intel-recommendation-row">
                  <span
                    className="intel-status-dot"
                    style={{ background: sevColor, display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }}
                  />
                  <div className="intel-flex-1">
                    <div className="intel-small intel-text-secondary">{a.title}</div>
                    <div className="intel-xs intel-text-muted">{a.module}</div>
                  </div>
                  <span className="intel-badge" style={{ color: sevColor, borderColor: sevColor + "44" }}>
                    {a.severity}
                  </span>
                </div>
              );
            })}
            {dashData.criticalAlerts.length === 0 && (
              <div className="intel-text-muted intel-small" style={{ padding: "12px 0" }}>✅ No active alerts</div>
            )}
          </div>
        </div>

        {/* AI Narrative */}
        <div className="intel-ai-panel intel-mt-16">
          <div className="intel-ai-title">✦ AI Executive Narrative</div>
          <div className="intel-insight-text">
            Command Center is monitoring{" "}
            <strong>{dashData.commandKpis.length} KPIs</strong> across all departments in real-time.
            Loop Engine is <strong>{ls.state}</strong> with{" "}
            <strong>{ls.decisions} AI decisions</strong> logged this session.
            {dashData.criticalAlerts.filter((a) => a.severity === "critical").length > 0
              ? ` ⚠️ ${dashData.criticalAlerts.filter((a) => a.severity === "critical").length} critical alerts require executive attention.`
              : " All systems operating within normal parameters."}
            {" "}Generate a Board Report for a full AI-written narrative with recommendations.
          </div>
        </div>
      </div>
    </div>
  );
}
