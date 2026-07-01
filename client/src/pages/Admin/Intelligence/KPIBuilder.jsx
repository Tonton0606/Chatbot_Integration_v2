import React, { useEffect, useState, useCallback } from "react";

import { getKpiBuilderDashboard, saveKpiDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import KpiBuilderWidget from "../../../components/admin/intelligence/KpiBuilderWidget.jsx";

const AVAILABLE_WIDGETS = [
  { id: "avail-1", title: "Revenue KPI", type: "kpi", metric: "Total Revenue" },
  { id: "avail-2", title: "Sales Funnel", type: "chart", metric: "Sales Stages" },
  { id: "avail-3", title: "Lead Conversion", type: "kpi", metric: "Conversion Rate" },
  { id: "avail-4", title: "Project Health", type: "gauge", metric: "Completion Rate" },
  { id: "avail-5", title: "Task Completion", type: "kpi", metric: "Tasks Done" },
  { id: "avail-6", title: "Inventory Movement", type: "chart", metric: "Stock Turnover" },
  { id: "avail-7", title: "Employee Attendance", type: "kpi", metric: "Attendance Rate" },
  { id: "avail-8", title: "Marketing Engagement", type: "kpi", metric: "Email CTR" },
  { id: "avail-9", title: "Forecast Widget", type: "forecast", metric: "Q3 Revenue" },
  { id: "avail-10", title: "AI Insight Widget", type: "insight", metric: "Critical Insights" },
];

const CHART_TYPES = ["KPI Card", "Line Chart", "Bar Chart", "Area Chart", "Gauge", "Funnel", "Forecast"];
const DATA_SOURCES = ["CRM", "Marketing", "Operations", "HR", "Finance", "Inventory", "Intelligence"];
const PERIOD_OPTIONS = ["Today", "This Week", "This Month", "This Quarter", "This Year"];
const ACCENT_COLORS = [
  "var(--brand-cyan)",
  "var(--success)",
  "var(--brand-gold)",
  "var(--danger)",
  "#9b59b6",
  "var(--brand-cyan-bright)",
];

export default function KPIBuilder() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [canvasWidgets, setCanvasWidgets] = useState([]);
  const [savedDashboards, setSavedDashboards] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [dashboardName, setDashboardName] = useState("Custom Dashboard");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDashName, setNewDashName] = useState("");

  const [widgetConfig, setWidgetConfig] = useState({
    title: "",
    source: "CRM",
    metric: "Revenue",
    period: "This Month",
    chartType: "KPI Card",
    threshold: "",
    color: "var(--brand-cyan)",
  });

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    const data = await getKpiBuilderDashboard();
    setSavedDashboards(data.savedDashboards || []);
    if (!selectedDashboard && data.savedDashboards?.length > 0) {
      const first = data.savedDashboards[0];
      setSelectedDashboard(first.id);
      setDashboardName(first.name);
      setCanvasWidgets(first.widgets || []);
    } else {
      setCanvasWidgets(data.kpiWidgets || []);
    }
  }, [selectedDashboard]);

  useEffect(() => { load(); }, []); // eslint-disable-line

  const switchDashboard = (dash) => {
    setSelectedDashboard(dash.id);
    setDashboardName(dash.name);
    setCanvasWidgets(dash.widgets || []);
    setSelectedWidget(null);
  };

  const addWidget = (avail) => {
    const next = { ...avail, id: `canvas-${Date.now()}`, x: 0, y: canvasWidgets.length, w: 2, h: 1 };
    setCanvasWidgets((cur) => [...cur, next]);
    setSelectedWidget(next);
  };

  const removeWidget = (id) => {
    setCanvasWidgets((cur) => cur.filter((w) => w.id !== id));
    if (selectedWidget?.id === id) setSelectedWidget(null);
  };

  const applySettings = () => {
    if (!selectedWidget) return;
    setCanvasWidgets((cur) =>
      cur.map((w) => w.id === selectedWidget.id ? { ...w, ...widgetConfig } : w)
    );
    setSelectedWidget((prev) => ({ ...prev, ...widgetConfig }));
    showMsg("Settings applied");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveKpiDashboard(dashboardName, canvasWidgets, selectedDashboard);
      showMsg("Dashboard saved");
      const data = await getKpiBuilderDashboard();
      setSavedDashboards(data.savedDashboards || []);
    } catch (err) {
      showMsg(err.message || "Save failed", false);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newDashName.trim()) {
      showMsg("Enter a dashboard name", false);
      return;
    }
    setSaving(true);
    try {
      const res = await saveKpiDashboard(newDashName, []);
      showMsg(`Dashboard "${newDashName}" created`);
      setShowNewModal(false);
      setNewDashName("");
      setCanvasWidgets([]);
      setSelectedWidget(null);
      setDashboardName(newDashName);
      setSelectedDashboard(res.data?.id || null);
      const data = await getKpiBuilderDashboard();
      setSavedDashboards(data.savedDashboards || []);
    } catch (err) {
      showMsg(err.message || "Create failed", false);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setWidgetConfig((cur) => ({ ...cur, [key]: value }));
  };

  const renderSettingsField = ([label, key, type]) => {
    const commonProps = {
      value: widgetConfig[key] || "",
      onChange: (e) => updateConfig(key, e.target.value),
    };

    let control;
    if (type === "select-source") {
      control = (
        <select className="intel-select intel-w-full intel-mt-4" {...commonProps}>
          {DATA_SOURCES.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    } else if (type === "select-chart") {
      control = (
        <select className="intel-select intel-w-full intel-mt-4" {...commonProps}>
          {CHART_TYPES.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    } else if (type === "select-period") {
      control = (
        <select className="intel-select intel-w-full intel-mt-4" {...commonProps}>
          {PERIOD_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    } else {
      control = <input className="intel-input intel-w-full intel-mt-4" type="text" placeholder={label} {...commonProps} />;
    }

    return (
      <div key={key} className="intel-form-group">
        <label className="intel-muted-label">{label}</label>
        {control}
      </div>
    );
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="KPI Builder"
        subtitle="Build custom intelligence dashboards using ERP metrics and widgets"
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

      <div className="intel-toolbar intel-dashboard-toolbar">
        <div className="intel-text-muted intel-small">Saved Dashboards:</div>
        {savedDashboards.map((dash) => (
          <button
            key={dash.id}
            className={`intel-btn ${selectedDashboard === dash.id ? "intel-btn-ai" : ""}`}
            onClick={() => switchDashboard(dash)}
            type="button"
          >
            {dash.name}
            {dash.shared && <span className="intel-badge intel-badge-success">shared</span>}
          </button>
        ))}
        <button className="intel-btn intel-btn-primary" type="button" onClick={() => setShowNewModal(true)}>
          + New Dashboard
        </button>
        <button className="intel-btn" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "💾 Saving…" : "💾 Save"}
        </button>
      </div>

      <div className="intel-builder-layout">
        <div className="intel-builder-sidebar">
          <div className="intel-kpi-label">Widget Library</div>
          <div className="intel-library-list intel-mt-10">
            {AVAILABLE_WIDGETS.map((w) => (
              <div
                key={w.id}
                className="intel-builder-widget intel-card-hover"
                onClick={() => addWidget(w)}
              >
                <div className="intel-builder-widget-title">{w.title}</div>
                <div className="intel-builder-widget-metric">{w.metric}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="intel-builder-canvas">
          <div className="intel-row-between intel-mb-14">
            <input
              className="intel-input"
              style={{ fontWeight: 600, fontSize: "1rem", background: "transparent", border: "none", borderBottom: "1px solid var(--border)" }}
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="Dashboard name"
            />
            <div className="intel-text-muted intel-small">{canvasWidgets.length} widgets</div>
          </div>

          <div className="intel-widget-canvas-grid">
            {canvasWidgets.map((widget) => (
              <div key={widget.id} className="intel-widget-shell">
                <KpiBuilderWidget
                  widget={widget}
                  selected={selectedWidget?.id === widget.id}
                  onClick={(w) => {
                    setSelectedWidget(w);
                    setWidgetConfig({
                      title: w.title || "",
                      source: w.source || "CRM",
                      metric: w.metric || "",
                      period: w.period || "This Month",
                      chartType: w.chartType || "KPI Card",
                      threshold: w.threshold || "",
                      color: w.color || "var(--brand-cyan)",
                    });
                  }}
                />
                <button className="intel-widget-remove" onClick={() => removeWidget(widget.id)} type="button">
                  ✕
                </button>
              </div>
            ))}
            <div className="intel-empty-dropzone">
              <div className="intel-kpi-value">+</div>
              <div className="intel-small">Add Widget</div>
            </div>
          </div>
        </div>

        <div className="intel-builder-settings">
          <div className="intel-kpi-label">Widget Settings</div>
          {selectedWidget ? (
            <div className="intel-flex-column intel-mt-12">
              <div className="intel-settings-preview">
                <div className="intel-section-title">{selectedWidget.title}</div>
                <div className="intel-text-muted intel-xs">{selectedWidget.type}</div>
              </div>
              {[
                ["Title", "title", "text"],
                ["Metric", "metric", "text"],
                ["Time Period", "period", "select-period"],
                ["Data Source", "source", "select-source"],
                ["Chart Type", "chartType", "select-chart"],
                ["Threshold", "threshold", "text"],
              ].map(renderSettingsField)}
              <div className="intel-form-group">
                <label className="intel-muted-label">Accent Color</label>
                <div className="intel-color-palette intel-mt-4">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`intel-color-swatch ${widgetConfig.color === color ? "is-active" : ""}`}
                      style={{ background: color }}
                      onClick={() => updateConfig("color", color)}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <button
                className="intel-btn intel-btn-primary intel-w-full"
                type="button"
                onClick={applySettings}
              >
                Apply Settings
              </button>
            </div>
          ) : (
            <div className="intel-empty-settings">
              <div className="intel-kpi-value">🧩</div>
              <div className="intel-small">Select a widget to configure</div>
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <div className="intel-modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="intel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="intel-modal-header">
              <span>New Dashboard</span>
              <button className="intel-btn" onClick={() => setShowNewModal(false)} type="button">✕</button>
            </div>
            <div className="intel-form-group">
              <label className="intel-muted-label">Dashboard Name</label>
              <input
                className="intel-input intel-w-full intel-mt-4"
                placeholder="e.g. Executive Overview"
                value={newDashName}
                onChange={(e) => setNewDashName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateNew()}
                autoFocus
              />
            </div>
            <div className="intel-actions-row intel-mt-16">
              <button className="intel-btn" onClick={() => setShowNewModal(false)} type="button">Cancel</button>
              <button className="intel-btn intel-btn-primary" onClick={handleCreateNew} disabled={saving} type="button">
                {saving ? "Creating…" : "Create Dashboard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
