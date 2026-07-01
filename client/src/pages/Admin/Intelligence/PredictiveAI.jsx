import React, { useEffect, useState, useCallback } from "react";

import {
  getPredictiveAIDashboard,
  createTaskFromPrediction,
  createTaskFromRecommendation,
} from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const TABS = ["sales", "marketing", "operations", "hr", "finance", "inventory", "executive"];

const TAB_LABELS = {
  sales: "💼 Sales",
  marketing: "📣 Marketing",
  operations: "⚙️ Operations",
  hr: "👥 HR",
  finance: "💰 Finance",
  inventory: "📦 Inventory",
  executive: "🏛️ Executive",
};

const RISK_STYLE = {
  low: { bg: "var(--success-soft)", color: "var(--success)", border: "var(--success-soft)" },
  medium: { bg: "rgba(245,166,35,0.1)", color: "#f5a623", border: "rgba(245,166,35,0.3)" },
  high: { bg: "var(--danger-soft)", color: "var(--danger)", border: "var(--danger-soft)" },
};

const EFFORT_STYLE = {
  Low: "var(--success)",
  Medium: "#f5a623",
  High: "var(--danger)",
};

function getProbabilityColor(value) {
  if (value > 70) return "var(--success)";
  if (value > 40) return "#f5a623";
  return "var(--danger)";
}

export default function PredictiveAI() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [activeTab, setActiveTab] = useState("sales");
  const [selectedPred, setSelectedPred] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({ predictions: {}, recommendations: [] });

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    const data = await getPredictiveAIDashboard();
    setDashboardData(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateTaskFromPred = async (pred) => {
    setTaskLoading(true);
    try {
      await createTaskFromPrediction(pred);
      showMsg(`Task created: ${pred.title}`);
      setSelectedPred(null);
    } catch (err) {
      showMsg(err.message || "Task creation failed", false);
    } finally {
      setTaskLoading(false);
    }
  };

  const handleRecommendationAction = async (rec) => {
    setTaskLoading(true);
    try {
      await createTaskFromRecommendation(rec);
      showMsg(`Task created: ${rec.title}`);
    } catch (err) {
      showMsg(err.message || "Task creation failed", false);
    } finally {
      setTaskLoading(false);
    }
  };

  const predictions = dashboardData.predictions[activeTab] || [];
  const allPreds = Object.values(dashboardData.predictions).flat();

  const stats = [
    { label: "Active Predictions", value: allPreds.length, color: "var(--brand-cyan)" },
    { label: "High Risk", value: allPreds.filter((p) => p.risk === "high").length, color: "var(--danger)" },
    { label: "High Confidence (>80%)", value: allPreds.filter((p) => p.confidence > 80).length, color: "var(--success)" },
    {
      label: "Pending Actions",
      value: dashboardData.recommendations.filter((r) => r.status === "pending").length,
      color: "var(--brand-gold)",
    },
  ];

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Predictive AI"
        subtitle="Predict outcomes, detect risks, and recommend next actions across ERP modules"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        onAISummary={() => {}}
      />

      {feedback && (
        <div className="intel-toast" style={{ background: feedback.ok ? "var(--success)" : "var(--danger)" }}>
          {feedback.msg}
        </div>
      )}

      <div className="intel-page-body">
        <div className="intel-grid-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="intel-kpi">
              <div className="intel-kpi-label">{stat.label}</div>
              <div className="intel-kpi-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="intel-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`intel-tab ${activeTab === tab ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setSelectedPred(null);
              }}
              type="button"
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className={`intel-predictive-layout ${selectedPred ? "has-selection" : ""}`}>
          <div className="intel-flex-column">
            <div className="intel-prediction-grid">
              {predictions.map((prediction) => {
                const riskStyle = RISK_STYLE[prediction.risk] || RISK_STYLE.medium;

                return (
                  <div
                    key={prediction.id}
                    className="intel-card intel-card-hover intel-prediction-card"
                    onClick={() =>
                      setSelectedPred(selectedPred?.id === prediction.id ? null : prediction)
                    }
                    style={{
                      borderColor:
                        selectedPred?.id === prediction.id ? "var(--brand-cyan)" : undefined,
                    }}
                  >
                    <div className="intel-report-card-top">
                      <div className="intel-report-card-title">{prediction.title}</div>

                      <span
                        className="intel-badge"
                        style={{
                          background: riskStyle.bg,
                          color: riskStyle.color,
                          borderColor: riskStyle.border,
                        }}
                      >
                        {prediction.risk}
                      </span>
                    </div>

                    <div className="intel-prediction-metrics">
                      {[
                        ["Probability", `${prediction.probability}%`, getProbabilityColor(prediction.probability)],
                        ["Confidence", `${prediction.confidence}%`, "var(--brand-cyan)"],
                        ["Impact", prediction.impact, "var(--brand-gold)"],
                      ].map(([label, value, color]) => (
                        <div key={label} className="intel-mini-metric">
                          <div className="intel-mini-metric-label">{label}</div>
                          <div className="intel-mini-metric-value" style={{ color }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="intel-alert-action-box">✦ {prediction.action}</div>
                  </div>
                );
              })}
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">
                All Predictions — {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </div>

              <div className="intel-table-wrap">
                <table className="intel-table">
                  <thead>
                    <tr>
                      {["Prediction", "Probability", "Confidence", "Impact", "Risk", "Action"].map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {predictions.map((prediction) => {
                      const riskStyle = RISK_STYLE[prediction.risk] || RISK_STYLE.medium;

                      return (
                        <tr
                          key={prediction.id}
                          className="intel-clickable-row"
                          onClick={() => setSelectedPred(prediction)}
                        >
                          <td className="intel-table-title-cell">{prediction.title}</td>
                          <td
                            className="intel-heavy"
                            style={{ color: getProbabilityColor(prediction.probability) }}
                          >
                            {prediction.probability}%
                          </td>
                          <td className="intel-text-cyan intel-bold">{prediction.confidence}%</td>
                          <td className="intel-text-gold intel-bold">{prediction.impact}</td>
                          <td>
                            <span
                              className="intel-badge"
                              style={{
                                background: riskStyle.bg,
                                color: riskStyle.color,
                                borderColor: riskStyle.border,
                              }}
                            >
                              {prediction.risk}
                            </span>
                          </td>
                          <td className="intel-table-action-cell">{prediction.action}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">AI Recommendation Queue</div>

              {dashboardData.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="intel-recommendation-row">
                  <div className="intel-badge intel-badge-gold">#{recommendation.priority}</div>

                  <div className="intel-flex-1 intel-min-w-220">
                    <div className="intel-report-card-title">{recommendation.title}</div>
                    <div className="intel-report-card-meta">
                      {recommendation.module} · {recommendation.owner} · Impact:{" "}
                      <span className="intel-text-gold">{recommendation.impact}</span>
                    </div>
                  </div>

                  <span
                    className="intel-badge"
                    style={{
                      color: EFFORT_STYLE[recommendation.effort] || "var(--text-muted)",
                    }}
                  >
                    Effort: {recommendation.effort}
                  </span>

                  <button
                    className="intel-btn intel-btn-primary"
                    type="button"
                    disabled={taskLoading}
                    onClick={() => handleRecommendationAction(recommendation)}
                  >
                    {taskLoading ? "…" : "Create Task"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selectedPred && (
            <div className="intel-side-panel">
              <div className="intel-report-card-top">
                <div className="intel-chart-title">AI Explainability</div>

                <button className="intel-btn" onClick={() => setSelectedPred(null)} type="button">
                  ✕
                </button>
              </div>

              <div className="intel-insight-title">{selectedPred.title}</div>

              <div className="intel-mb-12">
                <div className="intel-kpi-label">Key Factors</div>

                {selectedPred.factors?.map((factor, index) => (
                  <div key={factor} className="intel-factor-row">
                    <div className="intel-mini-metric intel-factor-card">{factor}</div>

                    <div
                      className="intel-factor-bar"
                      style={{
                        width: `${Math.max(20, (3 - index) * 28)}%`,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="intel-alert-action-box">
                <div className="intel-kpi-label intel-text-cyan">
                  RECOMMENDED NEXT STEP
                </div>
                <div className="intel-insight-text">{selectedPred.action}</div>
              </div>

              <button
                className="intel-btn intel-btn-primary intel-w-full intel-mt-12"
                type="button"
                disabled={taskLoading}
                onClick={() => handleCreateTaskFromPred(selectedPred)}
              >
                {taskLoading ? "Creating Task…" : "Create Task from Recommendation"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
