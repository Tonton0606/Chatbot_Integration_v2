import React, { useEffect, useState, useCallback } from "react";
import {
  getSalesCoachDashboard,
  runSalesAnalysis,
  getWinProbability,
  DEAL_STAGES,
  COACHING_PRIORITIES,
  COACHING_TYPES,
} from "../../../services/intelligence/aiSalesCoachService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const apiFetch = (url, opts = {}) =>
  fetch(url, { headers: { "Content-Type": "application/json" }, ...opts }).then((r) => r.json());

const PRIORITY_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  low: { color: "var(--success)", bg: "var(--success-soft)" },
};

const PH_TIPS = [
  "Follow up within 24 hours in Philippine business culture",
  "Use Filipino (Taglish) for SMB clients to build rapport",
  "Offer installment terms (hutang) for large deals",
  "Reference industry benchmarks when justifying price",
  "Decision maker approval often requires family consensus for family businesses",
];

function WinProbBar({ pct }) {
  const color = pct > 60 ? "var(--success)" : pct >= 40 ? "#eab308" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div className="intel-health-bar" style={{ flex: 1 }}>
        <div className="intel-health-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="intel-xs intel-heavy" style={{ color, minWidth: 34 }}>{pct}%</span>
    </div>
  );
}

export default function AISalesCoach({ onRefresh }) {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [feedback, setFeedback] = useState(null);
  const [running, setRunning] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [escalateId, setEscalateId] = useState(null);

  const [dash, setDash] = useState({
    summary: { totalInsights: 0, critical: 0, highPriority: 0, dealsAnalyzed: 0 },
    insights: [],
    stageDistribution: [],
  });

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const d = await getSalesCoachDashboard();
      setDash(d);
    } catch (err) {
      showMsg(err.message || "Failed to load dashboard", false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRunAnalysis = async () => {
    setRunning(true);
    try {
      await runSalesAnalysis();
      showMsg("Analysis complete — insights updated");
      load();
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(err.message || "Analysis failed", false);
    } finally {
      setRunning(false);
    }
  };

  const handleCreateTask = async (insight) => {
    try {
      await apiFetch("/api/tasks/create", {
        method: "POST",
        body: JSON.stringify({
          title: insight.recommendedAction || insight.action,
          related_deal: insight.dealTitle,
          priority: insight.priority,
          source: "ai_sales_coach",
        }),
      });
      showMsg("Task created successfully");
    } catch (err) {
      showMsg(err.message || "Failed to create task", false);
    }
  };

  const filtered = (dash.insights || []).filter(
    (i) => priorityFilter === "all" || i.priority === priorityFilter
  );

  const s = dash.summary;
  const maxStageCount = Math.max(...(dash.stageDistribution || []).map((x) => x.count || 0), 1);

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="AI Sales Coach"
        subtitle="AI-driven coaching insights, win probability, and pipeline recommendations"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        showAI={false}
      />

      {feedback && (
        <div className="intel-toast" style={{ background: feedback.ok ? "var(--success)" : "var(--danger)" }}>
          {feedback.msg}
        </div>
      )}

      <div className="intel-page-body">
        {/* KPI Strip */}
        <div className="intel-kpi-strip">
          {[
            { label: "Total Insights", value: s.totalInsights, color: "var(--brand-cyan)" },
            { label: "Critical", value: s.critical, color: "#ef4444" },
            { label: "High Priority", value: s.highPriority, color: "#f97316" },
            { label: "Deals Analyzed", value: s.dealsAnalyzed, color: "var(--brand-gold)" },
          ].map((k) => (
            <div key={k.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: k.color }} />
              <div className="intel-kpi-label">{k.label}</div>
              <div className="intel-kpi-value" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="intel-grid-two" style={{ gridTemplateColumns: "2fr 1fr" }}>
          {/* Coaching Insights */}
          <div className="intel-panel">
            <div className="intel-panel-header">
              <div className="intel-row-between">
                <span>Coaching Insights</span>
                <div className="intel-actions-row">
                  {["all", ...COACHING_PRIORITIES].map((p) => (
                    <button
                      key={p}
                      className={`intel-btn ${priorityFilter === p ? "intel-btn-ai" : ""}`}
                      onClick={() => setPriorityFilter(p)}
                      type="button"
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="intel-btn intel-btn-primary"
                    onClick={handleRunAnalysis}
                    disabled={running}
                    type="button"
                  >
                    {running ? "Analyzing…" : "▶ Run Analysis"}
                  </button>
                </div>
              </div>
            </div>

            {filtered.length === 0 && (
              <div className="intel-text-muted intel-small" style={{ padding: "16px 0" }}>
                No coaching insights found. Run an analysis to generate recommendations.
              </div>
            )}

            {filtered.map((ins) => {
              const ps = PRIORITY_STYLE[ins.priority] || PRIORITY_STYLE.low;
              const stuckRed = (ins.daysInStage || 0) > 14;
              return (
                <div key={ins.id} className="intel-recommendation-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div className="intel-row-between" style={{ flexWrap: "wrap", gap: 6 }}>
                    <div className="intel-actions-row" style={{ flexWrap: "wrap" }}>
                      <span className="intel-badge" style={{ background: ps.bg, color: ps.color, fontWeight: 700 }}>
                        {ins.priority?.toUpperCase()}
                      </span>
                      <span className="intel-badge intel-small">{ins.coachingType || ins.type}</span>
                    </div>
                    <span className="intel-badge" style={{ background: "rgba(100,100,100,0.1)" }}>
                      {ins.dealStage || "—"}
                    </span>
                  </div>

                  <div className="intel-section-title" style={{ marginTop: 6 }}>{ins.dealTitle || ins.deal}</div>

                  <div style={{ marginTop: 4 }}>
                    <div className="intel-xs intel-text-muted">Win Probability</div>
                    <WinProbBar pct={ins.winProbability ?? ins.win_probability ?? 0} />
                  </div>

                  {ins.daysInStage != null && (
                    <div className="intel-xs intel-mt-4" style={{ color: stuckRed ? "#ef4444" : "var(--text-muted)" }}>
                      {ins.daysInStage} days in current stage{stuckRed ? " ⚠ stuck" : ""}
                    </div>
                  )}

                  {(ins.recommendedAction || ins.action) && (
                    <div className="intel-section-subtitle intel-mt-4">
                      <strong>Action:</strong> {ins.recommendedAction || ins.action}
                    </div>
                  )}

                  <div style={{ marginTop: 8 }}>
                    <button
                      className="intel-btn intel-btn-primary intel-xs"
                      type="button"
                      onClick={() => handleCreateTask(ins)}
                    >
                      + Create Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Stage Distribution */}
            <div className="intel-panel">
              <div className="intel-panel-header">Stage Distribution</div>
              {(dash.stageDistribution || []).map((st) => (
                <div key={st.stage} className="intel-recommendation-row" style={{ gap: 8 }}>
                  <div className="intel-small" style={{ minWidth: 110, color: "var(--text-secondary)" }}>
                    {st.stage}
                  </div>
                  <div className="intel-health-bar" style={{ flex: 1 }}>
                    <div
                      className="intel-health-fill"
                      style={{ width: `${((st.count || 0) / maxStageCount) * 100}%`, background: "var(--brand-cyan)" }}
                    />
                  </div>
                  <span className="intel-heavy intel-small" style={{ minWidth: 24, textAlign: "right" }}>
                    {st.count}
                  </span>
                </div>
              ))}
              {(dash.stageDistribution || []).length === 0 && (
                <div className="intel-text-muted intel-xs" style={{ padding: "8px 0" }}>No stage data</div>
              )}
            </div>

            {/* Playbook Tips */}
            <div className="intel-panel">
              <div className="intel-panel-header">🇵🇭 PH Sales Playbook</div>
              {PH_TIPS.map((tip, i) => (
                <div key={i} className="intel-recommendation-row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--brand-gold)", fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                  <div className="intel-small intel-text-secondary">{tip}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
