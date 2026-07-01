import React, { useEffect, useState, useCallback } from "react";
import { getCustomer360Dashboard, runChurnAnalysis } from "../../../services/intelligence/customer360Service";
import { createTaskFromRecommendation } from "../../../services/intelligence";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const RISK_STYLE = {
  critical: { bg: "var(--danger-soft)", color: "var(--danger)", label: "Critical" },
  high: { bg: "rgba(245,166,35,0.12)", color: "#f5a623", label: "High Risk" },
  medium: { bg: "rgba(74,144,217,0.12)", color: "var(--brand-cyan)", label: "Medium" },
  low: { bg: "var(--success-soft)", color: "var(--success)", label: "Low" },
};

function HealthBar({ score }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--brand-cyan)" : score >= 40 ? "#f5a623" : "var(--danger)";
  return (
    <div className="intel-health-bar">
      <div className="intel-health-fill" style={{ width: `${score}%`, background: color }} />
    </div>
  );
}

export default function Customer360() {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [filter, setFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [data, setData] = useState({
    summary: { totalCustomers: 0, atRisk: 0, churned: 0, healthy: 0, avgHealthScore: 0, revenue_at_risk: 0, churn_rate: 0, nps_avg: 0 },
    churnInsights: [],
    healthDistribution: [],
    topDeals: [],
  });

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    const d = await getCustomer360Dashboard();
    setData(d);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all"
    ? data.churnInsights
    : data.churnInsights.filter((c) => c.churnRisk === filter);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      await runChurnAnalysis();
      showMsg("Churn analysis complete — scores updated");
      load();
    } catch (err) {
      showMsg(err.message || "Analysis failed", false);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateTask = async (customer) => {
    try {
      await createTaskFromRecommendation({
        title: `Churn Prevention: ${customer.customerName}`,
        module: "Customer 360",
        impact: `Revenue at risk: ₱${customer.revenue?.toLocaleString()}`,
        owner: "",
        effort: "High",
      });
      showMsg("Task created for churn prevention");
    } catch (err) {
      showMsg(err.message || "Failed", false);
    }
  };

  const s = data.summary;
  const summaryCards = [
    { label: "Total Customers", value: s.totalCustomers, color: "var(--brand-cyan)" },
    { label: "At Risk", value: s.atRisk, color: "#f5a623" },
    { label: "Churned (30d)", value: s.churned, color: "var(--danger)" },
    { label: "Healthy", value: s.healthy, color: "var(--success)" },
    { label: "Avg Health Score", value: `${s.avgHealthScore}`, color: "var(--brand-cyan)" },
    { label: "Revenue at Risk", value: s.revenue_at_risk ? `₱${s.revenue_at_risk.toLocaleString()}` : "—", color: "var(--danger)" },
    { label: "Churn Rate", value: `${s.churn_rate}%`, color: "#f5a623" },
    { label: "NPS Average", value: s.nps_avg, color: "var(--success)" },
  ];

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Customer 360 & Churn Intelligence"
        subtitle="AI-powered customer health scoring, churn prediction, and retention recommendations"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        onAISummary={handleRunAnalysis}
      />

      {feedback && (
        <div className="intel-toast" style={{ background: feedback.ok ? "var(--success)" : "var(--danger)" }}>
          {feedback.msg}
        </div>
      )}

      <div className="intel-page-body">
        <div className="intel-kpi-strip">
          {summaryCards.map((k) => (
            <div key={k.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: k.color }} />
              <div className="intel-kpi-label">{k.label}</div>
              <div className="intel-kpi-value" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="intel-actions-row">
          {["all", "critical", "high", "medium", "low"].map((f) => (
            <button
              key={f}
              className={`intel-btn ${filter === f ? "intel-btn-ai" : ""}`}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f === "all" ? "All" : RISK_STYLE[f]?.label || f}
            </button>
          ))}
          <button
            className="intel-btn intel-btn-primary"
            type="button"
            onClick={handleRunAnalysis}
            disabled={analyzing}
            style={{ marginLeft: "auto" }}
          >
            {analyzing ? "⏳ Analyzing…" : "🔄 Run Churn Analysis"}
          </button>
        </div>

        <div className={`intel-predictive-layout ${selectedCustomer ? "has-selection" : ""}`}>
          <div className="intel-flex-column">
            <div className="intel-panel">
              <div className="intel-panel-header">At-Risk Customers ({filtered.length})</div>
              <div className="intel-table-wrap">
                <table className="intel-table">
                  <thead>
                    <tr>
                      {["Customer", "Health Score", "Churn Risk", "Probability", "Revenue", "Last Activity", "Action"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const rs = RISK_STYLE[c.churnRisk] || RISK_STYLE.medium;
                      return (
                        <tr
                          key={c.id}
                          className="intel-clickable-row"
                          onClick={() => setSelectedCustomer(selectedCustomer?.id === c.id ? null : c)}
                          style={{ borderColor: selectedCustomer?.id === c.id ? "var(--brand-cyan)" : undefined }}
                        >
                          <td className="intel-table-title-cell">{c.customerName}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <HealthBar score={c.healthScore} />
                              <span className="intel-heavy">{c.healthScore}</span>
                            </div>
                          </td>
                          <td>
                            <span className="intel-badge" style={{ background: rs.bg, color: rs.color }}>
                              {rs.label}
                            </span>
                          </td>
                          <td className="intel-heavy" style={{ color: rs.color }}>{c.churnProbability}%</td>
                          <td className="intel-table-money">₱{(c.revenue || 0).toLocaleString()}</td>
                          <td className="intel-text-muted intel-small">
                            {c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : "—"}
                          </td>
                          <td>
                            <button
                              className="intel-btn intel-btn-primary"
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCreateTask(c); }}
                            >
                              Intervene
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="intel-text-muted" style={{ padding: 16 }}>
                          No customers in this risk category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">Health Score Distribution</div>
              <div className="intel-actions-row" style={{ flexWrap: "wrap", gap: 12 }}>
                {data.healthDistribution.map((d) => (
                  <div key={d.label} className="intel-kpi" style={{ minWidth: 140 }}>
                    <div className="intel-scenario-accent" style={{ background: d.color }} />
                    <div className="intel-kpi-label">{d.label}</div>
                    <div className="intel-kpi-value" style={{ color: d.color }}>{d.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedCustomer && (
            <div className="intel-side-panel">
              <div className="intel-report-card-top">
                <div className="intel-chart-title">Customer Intelligence</div>
                <button className="intel-btn" onClick={() => setSelectedCustomer(null)} type="button">✕</button>
              </div>

              <div className="intel-insight-title">{selectedCustomer.customerName}</div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <span className="intel-badge" style={{ background: RISK_STYLE[selectedCustomer.churnRisk]?.bg, color: RISK_STYLE[selectedCustomer.churnRisk]?.color }}>
                  {RISK_STYLE[selectedCustomer.churnRisk]?.label}
                </span>
                <span className="intel-badge">Health: {selectedCustomer.healthScore}/100</span>
              </div>

              <div className="intel-kpi-strip" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="intel-kpi">
                  <div className="intel-kpi-label">Churn Probability</div>
                  <div className="intel-kpi-value" style={{ color: "var(--danger)" }}>{selectedCustomer.churnProbability}%</div>
                </div>
                <div className="intel-kpi">
                  <div className="intel-kpi-label">Revenue Value</div>
                  <div className="intel-kpi-value">₱{(selectedCustomer.revenue || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="intel-mb-12">
                <div className="intel-kpi-label intel-mb-6">Risk Factors</div>
                {(selectedCustomer.factors || []).map((f, i) => (
                  <div key={i} className="intel-factor-row">
                    <div className="intel-mini-metric intel-factor-card">{f}</div>
                  </div>
                ))}
              </div>

              <div className="intel-alert-action-box">
                <div className="intel-kpi-label intel-text-cyan">RECOMMENDED ACTION</div>
                <div className="intel-insight-text">{selectedCustomer.recommendation}</div>
              </div>

              <button
                className="intel-btn intel-btn-primary intel-w-full intel-mt-12"
                type="button"
                onClick={() => handleCreateTask(selectedCustomer)}
              >
                Create Retention Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
