import React, { useEffect, useState, useCallback } from "react";

import {
  getAIInsightsDashboard,
  getInsightTimeline,
  takeInsightAction,
  createTaskFromInsight,
} from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceInsightCard from "../../../components/admin/intelligence/IntelligenceInsightCard.jsx";

const EFFORT_COLOR = {
  Low: "var(--success)",
  Medium: "#f5a623",
  High: "var(--danger)",
};

const STATUS_COLOR = {
  pending: "#f5a623",
  in_progress: "var(--brand-cyan)",
  done: "var(--success)",
};

const SEV_DOT = {
  critical: "var(--danger)",
  warning: "#f5a623",
  positive: "var(--success)",
  info: "var(--brand-cyan)",
};

export default function AIInsights() {
  const [period, setPeriod] = useState("This Week");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [actionFeedback, setActionFeedback] = useState(null);

  const [dashboardData, setDashboardData] = useState({ insights: [], recommendations: [] });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, tl] = await Promise.all([
      getAIInsightsDashboard(),
      getInsightTimeline(20),
    ]);
    setDashboardData(data);
    setTimeline(tl);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredInsights =
    severityFilter === "all"
      ? dashboardData.insights
      : dashboardData.insights.filter((i) => i.severity === severityFilter);

  const showFeedback = (msg, ok = true) => {
    setActionFeedback({ msg, ok });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleInsightAction = async (action, insight) => {
    try {
      if (action === "Create Task") {
        await createTaskFromInsight(insight);
        showFeedback("Task created successfully");
      } else if (["Mark Reviewed", "Dismiss", "Escalate"].includes(action)) {
        const map = { "Mark Reviewed": "mark_reviewed", "Dismiss": "dismiss", "Escalate": "escalate" };
        await takeInsightAction(insight.id, map[action] || "mark_reviewed");
        showFeedback(`Insight ${action.toLowerCase()}d`);
        load();
      }
    } catch (err) {
      showFeedback(err.message || "Action failed", false);
    }
  };

  const handleQuickAction = async (action) => {
    try {
      if (action === "Mark All Reviewed") {
        await Promise.allSettled(
          dashboardData.insights.map((i) => takeInsightAction(i.id, "mark_reviewed"))
        );
        showFeedback("All insights marked reviewed");
        load();
      } else if (action === "Create Task from Insight") {
        const top = dashboardData.insights[0];
        if (top) {
          await createTaskFromInsight(top);
          showFeedback("Task created from top insight");
        } else {
          showFeedback("No insights available", false);
        }
      } else if (action === "Export All Insights") {
        const blob = new Blob(
          [JSON.stringify(dashboardData.insights, null, 2)],
          { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ai_insights_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showFeedback("Insights exported");
      } else if (action === "Generate AI Report") {
        showFeedback("Navigate to Reports → Generate Report to create an AI report");
      } else if (action === "Send Summary to Team") {
        showFeedback("Use Reports → Schedule to configure team digest emails");
      }
    } catch (err) {
      showFeedback(err.message || "Action failed", false);
    }
  };

  const handleRecommendationAction = async (rec) => {
    try {
      await createTaskFromInsight({ id: rec.id, title: rec.title, explanation: rec.title });
      showFeedback(`Task created: ${rec.title}`);
    } catch (err) {
      showFeedback(err.message || "Failed to create task", false);
    }
  };

  const QUICK_ACTIONS = [
    "Create Task from Insight",
    "Generate AI Report",
    "Send Summary to Team",
    "Export All Insights",
    "Mark All Reviewed",
  ];

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="AI Insights"
        subtitle="AI-generated explanations, root cause analysis, and recommended business actions"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        onAISummary={() => {}}
      />

      {actionFeedback && (
        <div
          className="intel-toast"
          style={{ background: actionFeedback.ok ? "var(--success)" : "var(--danger)" }}
        >
          {actionFeedback.msg}
        </div>
      )}

      <div className="intel-page-body">
        <div className="intel-row-between">
          <div className="intel-actions-row">
            {["all", "critical", "warning", "positive", "info"].map((filter) => (
              <button
                key={filter}
                className={`intel-btn ${severityFilter === filter ? "intel-btn-ai" : ""}`}
                onClick={() => setSeverityFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="intel-text-muted intel-small">
            {loading ? "Loading…" : `${filteredInsights.length} insights`}
          </div>
        </div>

        <div className="intel-main-with-sidebar">
          <div className="intel-flex-column">
            {filteredInsights.map((insight) => (
              <IntelligenceInsightCard
                key={insight.id}
                insight={insight}
                onAction={handleInsightAction}
              />
            ))}

            <div className="intel-panel">
              <div className="intel-panel-header">Prioritized Recommendations</div>

              {dashboardData.recommendations.map((rec) => {
                const effortColor = EFFORT_COLOR[rec.effort] || "var(--text-muted)";
                const statusColor = STATUS_COLOR[rec.status] || "var(--text-muted)";
                return (
                  <div key={rec.id} className="intel-recommendation-row">
                    <div className="intel-priority-badge">#{rec.priority}</div>
                    <div className="intel-flex-1 intel-min-w-220">
                      <div className="intel-section-title">{rec.title}</div>
                      <div className="intel-section-subtitle">
                        {rec.module} · {rec.owner} ·{" "}
                        <span style={{ color: effortColor }}>Effort: {rec.effort}</span> · Impact:{" "}
                        <span className="intel-text-gold">{rec.impact}</span>
                      </div>
                    </div>
                    <span
                      className="intel-badge"
                      style={{ background: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}44` }}
                    >
                      {String(rec.status || "pending").replace("_", " ")}
                    </span>
                    <button
                      className="intel-btn intel-btn-primary"
                      type="button"
                      onClick={() => handleRecommendationAction(rec)}
                    >
                      Take Action
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="intel-flex-column">
            <div className="intel-panel">
              <div className="intel-panel-header">Insight Timeline</div>
              <div className="intel-timeline">
                <div className="intel-timeline-line" />
                {timeline.map((item, index) => {
                  const dotColor = SEV_DOT[item.severity] || "var(--brand-cyan)";
                  return (
                    <div key={`${item.time}-${index}`} className="intel-timeline-item">
                      <span className="intel-timeline-dot" style={{ background: dotColor }} />
                      <div>
                        <div className="intel-small intel-text-secondary">{item.event}</div>
                        <div className="intel-xs intel-text-muted intel-mt-4">{item.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-section-title intel-mb-10">Quick Actions</div>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  className="intel-btn intel-quick-action"
                  type="button"
                  onClick={() => handleQuickAction(action)}
                >
                  → {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
