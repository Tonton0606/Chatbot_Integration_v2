import React, { useEffect, useState, useCallback } from "react";

import {
  getAlertsMonitoringDashboard,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getAlertTimeline,
} from "../../../services/intelligence";
import { takeInsightAction } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceAlertCard from "../../../components/admin/intelligence/IntelligenceAlertCard.jsx";

const SEV_FILTER = ["All", "Critical", "Warning", "Info", "Resolved"];

const MODULES_LIST = ["CRM", "Finance", "HR", "Marketing", "Operations", "Inventory", "Intelligence"];
const OPERATORS = [">", "<", ">=", "<=", "==", "!="];
const SEVERITIES = ["critical", "warning", "info"];

const EMPTY_RULE = { name: "", module: "CRM", metric: "", operator: ">", threshold: "", severity: "warning" };

export default function AlertsMonitoring() {
  const [period, setPeriod] = useState("This Week");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [feedback, setFeedback] = useState(null);

  const [dashboardData, setDashboardData] = useState({ activeAlerts: [], monitoringRules: [] });
  const [timeline, setTimeline] = useState([]);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    const [data, tl] = await Promise.all([
      getAlertsMonitoringDashboard(),
      getAlertTimeline(20),
    ]);
    setDashboardData(data);
    setTimeline(tl);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredAlerts =
    severityFilter === "All"
      ? dashboardData.activeAlerts
      : severityFilter === "Resolved"
        ? dashboardData.activeAlerts.filter((a) => a.status === "resolved")
        : dashboardData.activeAlerts.filter((a) => a.severity === severityFilter.toLowerCase());

  const critical = dashboardData.activeAlerts.filter((a) => a.severity === "critical").length;
  const warning = dashboardData.activeAlerts.filter((a) => a.severity === "warning").length;
  const info = dashboardData.activeAlerts.filter((a) => a.severity === "info").length;

  const summaryCards = [
    { label: "Critical Alerts", value: critical, color: "var(--danger)" },
    { label: "Warning Alerts", value: warning, color: "#f5a623" },
    { label: "Info Alerts", value: info, color: "var(--brand-cyan)" },
    { label: "Active Monitors", value: dashboardData.monitoringRules.filter((r) => r.status === "active").length, color: "var(--brand-cyan)" },
    { label: "Total Alerts", value: dashboardData.activeAlerts.length, color: "var(--success)" },
  ];

  const handleAlertAction = async (action, alert) => {
    try {
      const map = { "Investigate": "mark_reviewed", "Resolve": "mark_done", "Dismiss": "dismiss", "Escalate": "escalate" };
      const apiAction = map[action];
      if (apiAction) {
        await takeInsightAction(alert.id, apiAction);
        showMsg(`Alert ${action.toLowerCase()}d`);
        load();
      }
    } catch (err) {
      showMsg(err.message || "Action failed", false);
    }
  };

  const openAddModal = () => {
    setEditingRule(null);
    setRuleForm(EMPTY_RULE);
    setShowRuleModal(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      module: rule.module || "CRM",
      metric: rule.config?.metric || "",
      operator: rule.config?.operator || ">",
      threshold: rule.config?.threshold ?? "",
      severity: rule.config?.severity || "warning",
    });
    setShowRuleModal(true);
  };

  const handleSaveRule = async () => {
    if (!ruleForm.name || !ruleForm.metric) {
      showMsg("Name and metric are required", false);
      return;
    }
    setSaving(true);
    try {
      if (editingRule) {
        await updateAlertRule(editingRule.id, {
          name: ruleForm.name,
          config: {
            module: ruleForm.module,
            metric: ruleForm.metric,
            operator: ruleForm.operator,
            threshold: Number(ruleForm.threshold) || 0,
            severity: ruleForm.severity,
            condition: `${ruleForm.metric} ${ruleForm.operator} ${ruleForm.threshold}`,
          },
        });
        showMsg("Rule updated");
      } else {
        await createAlertRule({
          name: ruleForm.name,
          module: ruleForm.module,
          metric: ruleForm.metric,
          operator: ruleForm.operator,
          threshold: ruleForm.threshold,
          severity: ruleForm.severity,
        });
        showMsg("Rule created");
      }
      setShowRuleModal(false);
      load();
    } catch (err) {
      showMsg(err.message || "Save failed", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await deleteAlertRule(ruleId);
      showMsg("Rule deleted");
      load();
    } catch (err) {
      showMsg(err.message || "Delete failed", false);
    }
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Alerts & Monitoring"
        subtitle="Track anomalies, threshold breaches, and critical business risks"
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
        <div className="intel-stat-strip">
          {summaryCards.map((card) => (
            <div key={card.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: card.color }} />
              <div className="intel-kpi-label">{card.label}</div>
              <div className="intel-kpi-value" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div className="intel-actions-row">
          {SEV_FILTER.map((filter) => (
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

        <div className="intel-main-with-sidebar">
          <div className="intel-flex-column">
            <div className="intel-section-subtitle">Active Alerts ({filteredAlerts.length})</div>

            {filteredAlerts.length === 0 ? (
              <div className="intel-card intel-alert-empty">
                <div className="intel-kpi-value">✅</div>
                <div className="intel-section-title">No alerts in this category</div>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <IntelligenceAlertCard key={alert.id} alert={alert} onAction={handleAlertAction} />
              ))
            )}

            <div className="intel-panel intel-mt-8">
              <div className="intel-panel-header">
                <div className="intel-row-between">
                  <span>Monitoring Rules</span>
                  <button className="intel-btn intel-btn-ai" type="button" onClick={openAddModal}>
                    + Add Rule
                  </button>
                </div>
              </div>

              {dashboardData.monitoringRules.map((rule) => {
                const isActive = rule.status === "active";
                return (
                  <div key={rule.id} className="intel-rule-row">
                    <span
                      className="intel-status-dot"
                      style={{ background: isActive ? "var(--success)" : "var(--danger)" }}
                    />
                    <div className="intel-flex-1 intel-min-w-220">
                      <div className="intel-section-title">{rule.name}</div>
                      <div className="intel-section-subtitle">{rule.module} · {rule.condition}</div>
                    </div>
                    <span className={`intel-badge ${rule.triggers > 0 ? "intel-badge-danger" : ""}`}>
                      {rule.triggers} triggers
                    </span>
                    <button className="intel-btn" type="button" onClick={() => openEditModal(rule)}>
                      Edit
                    </button>
                    <button
                      className="intel-btn"
                      type="button"
                      style={{ color: "var(--danger)" }}
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}

              {dashboardData.monitoringRules.length === 0 && (
                <div className="intel-text-muted intel-small" style={{ padding: "12px 0" }}>
                  No monitoring rules yet. Click "+ Add Rule" to create one.
                </div>
              )}
            </div>
          </div>

          <div className="intel-panel intel-sticky-top">
            <div className="intel-panel-header">Alert Lifecycle</div>
            <div className="intel-timeline">
              <div className="intel-timeline-line" />
              {timeline.map((item, index) => (
                <div key={`${item.time}-${index}`} className="intel-timeline-item">
                  <span className="intel-lifecycle-dot" style={{ background: item.color }} />
                  <div>
                    <div className="intel-mb-2">
                      <span
                        className="intel-badge"
                        style={{ background: `${item.color}18`, color: item.color, borderColor: `${item.color}44` }}
                      >
                        {item.action}
                      </span>
                    </div>
                    <div className="intel-small intel-text-secondary">{item.title}</div>
                    <div className="intel-xs intel-text-muted intel-mt-4">{item.time} · {item.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showRuleModal && (
        <div className="intel-modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="intel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="intel-modal-header">
              <span>{editingRule ? "Edit Monitoring Rule" : "Add Monitoring Rule"}</span>
              <button className="intel-btn" onClick={() => setShowRuleModal(false)} type="button">✕</button>
            </div>

            <div className="intel-form-group">
              <label className="intel-muted-label">Rule Name</label>
              <input
                className="intel-input intel-w-full intel-mt-4"
                placeholder="e.g. Low Conversion Rate Alert"
                value={ruleForm.name}
                onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="intel-form-group">
              <label className="intel-muted-label">Module</label>
              <select
                className="intel-select intel-w-full intel-mt-4"
                value={ruleForm.module}
                onChange={(e) => setRuleForm((f) => ({ ...f, module: e.target.value }))}
              >
                {MODULES_LIST.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="intel-form-group">
              <label className="intel-muted-label">Metric Key</label>
              <input
                className="intel-input intel-w-full intel-mt-4"
                placeholder="e.g. conversion_rate"
                value={ruleForm.metric}
                onChange={(e) => setRuleForm((f) => ({ ...f, metric: e.target.value }))}
              />
            </div>

            <div className="intel-grid-two">
              <div className="intel-form-group">
                <label className="intel-muted-label">Operator</label>
                <select
                  className="intel-select intel-w-full intel-mt-4"
                  value={ruleForm.operator}
                  onChange={(e) => setRuleForm((f) => ({ ...f, operator: e.target.value }))}
                >
                  {OPERATORS.map((op) => <option key={op}>{op}</option>)}
                </select>
              </div>
              <div className="intel-form-group">
                <label className="intel-muted-label">Threshold</label>
                <input
                  className="intel-input intel-w-full intel-mt-4"
                  type="number"
                  placeholder="e.g. 20"
                  value={ruleForm.threshold}
                  onChange={(e) => setRuleForm((f) => ({ ...f, threshold: e.target.value }))}
                />
              </div>
            </div>

            <div className="intel-form-group">
              <label className="intel-muted-label">Severity</label>
              <select
                className="intel-select intel-w-full intel-mt-4"
                value={ruleForm.severity}
                onChange={(e) => setRuleForm((f) => ({ ...f, severity: e.target.value }))}
              >
                {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="intel-actions-row intel-mt-16">
              <button className="intel-btn" onClick={() => setShowRuleModal(false)} type="button">
                Cancel
              </button>
              <button
                className="intel-btn intel-btn-primary"
                onClick={handleSaveRule}
                disabled={saving}
                type="button"
              >
                {saving ? "Saving…" : editingRule ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
