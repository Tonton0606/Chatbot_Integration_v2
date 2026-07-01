import React, { useEffect, useState, useCallback } from "react";

import {
  getDataExportDashboard,
  downloadExportFile,
  runExport,
  scheduleExport,
} from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import ExportOptionCard from "../../../components/admin/intelligence/ExportOptionCard.jsx";

const FORMATS = [
  { format: "CSV", description: "Comma-separated values for spreadsheet import", icon: "📊", color: "var(--brand-cyan)" },
  { format: "Excel", description: "Microsoft Excel format with formatting", icon: "📗", color: "var(--success)" },
  { format: "PDF", description: "Formatted report with charts and branding", icon: "📄", color: "var(--danger)" },
  { format: "JSON", description: "Structured data format for API and integration use", icon: "🔧", color: "var(--brand-gold)" },
];

const MODULES = ["CRM", "Marketing", "Operations", "HR", "Finance", "Legal", "Inventory", "Projects", "Tasks", "Intelligence"];
const SCOPES = ["Current View", "Filtered Data", "Full Report", "Entire Workspace", "Selected Modules", "Custom Dataset"];
const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly"];
const DESTINATIONS = ["Download", "Email", "Google Drive", "Webhook", "Cloud Sync"];

const STATUS_STYLE = {
  ready: { className: "intel-badge-success", label: "✓ Ready" },
  active: { className: "intel-badge-cyan", label: "● Active" },
  paused: { className: "", label: "⏸ Paused" },
};

const CONFIG_FIELDS = [
  ["Date Range", "dateRange", ["Last 7 Days", "Last 30 Days", "This Quarter", "This Year", "Custom"]],
  ["Delivery Method", "delivery", ["Download", "Email", "Google Drive", "Webhook", "Cloud Sync"]],
];

const INCLUDE_OPTIONS = [
  ["includeCharts", "Charts & Visualizations"],
  ["includeRaw", "Raw Data"],
  ["includeAI", "AI Summaries"],
  ["includeFilters", "Applied Filters"],
];

const ADVANCED_OPTIONS = [
  ["🔗 API Export", "Export via REST API endpoint", "api"],
  ["🪝 Webhook Export", "Push data to external webhook", "webhook"],
  ["☁️ Cloud Sync", "Sync to Google Drive / OneDrive", "cloud"],
  ["📧 Scheduled Email", "Auto-send on schedule", "email"],
];

export default function DataExport() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [selectedFormat, setSelectedFormat] = useState("Excel");
  const [selectedScope, setSelectedScope] = useState("Filtered Data");
  const [selectedModules, setSelectedModules] = useState(["CRM", "Finance", "HR"]);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [dashboardData, setDashboardData] = useState({ exportHistory: [], scheduledExports: [] });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedForm, setSchedForm] = useState({ name: "", frequency: "Weekly", destination: "Email" });
  const [scheduling, setScheduling] = useState(false);

  const [config, setConfig] = useState({
    dateRange: "Last 30 Days",
    includeCharts: true,
    includeRaw: true,
    includeAI: false,
    includeFilters: true,
    delivery: "Download",
  });

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  const load = useCallback(async () => {
    const data = await getDataExportDashboard();
    setDashboardData(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleModule = (name) =>
    setSelectedModules((cur) => cur.includes(name) ? cur.filter((m) => m !== name) : [...cur, name]);

  const handleExport = async () => {
    if (selectedModules.length === 0) {
      showMsg("Select at least one module to export", false);
      return;
    }
    setExporting(true);
    try {
      await runExport({
        format: selectedFormat,
        modules: selectedModules,
        scope: selectedScope,
        dateRange: config.dateRange,
        includeAI: config.includeAI,
      });
      showMsg(`${selectedFormat} export downloaded successfully`);
      load();
    } catch (err) {
      showMsg(err.message || "Export failed", false);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadHistory = async (item) => {
    try {
      if (item.downloadUrl) {
        window.open(item.downloadUrl, "_blank");
        return;
      }
      const blob = await downloadExportFile(item.id, item.type?.toLowerCase() || "json");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.name}_${Date.now()}.${(item.type || "json").toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // If report doesn't have a direct download, export fresh
      await handleExport();
    }
  };

  const handleSchedule = async () => {
    if (!schedForm.name) {
      showMsg("Name is required", false);
      return;
    }
    setScheduling(true);
    try {
      await scheduleExport({
        name: schedForm.name,
        format: selectedFormat,
        modules: selectedModules,
        frequency: schedForm.frequency,
        destination: schedForm.destination,
      });
      showMsg("Export scheduled successfully");
      setShowScheduleModal(false);
      load();
    } catch (err) {
      showMsg(err.message || "Schedule failed", false);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Data Export"
        subtitle="Export filtered ERP intelligence data in multiple formats"
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
        <div className="intel-grid-two">
          <div className="intel-flex-column">
            <div className="intel-card">
              <div className="intel-chart-title">Export Format</div>
              <div className="intel-grid-auto intel-mt-12">
                {FORMATS.map((opt) => (
                  <ExportOptionCard
                    key={opt.format}
                    {...opt}
                    selected={selectedFormat === opt.format}
                    onClick={() => setSelectedFormat(opt.format)}
                  />
                ))}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-chart-title">Export Scope</div>
              <div className="intel-actions-row intel-mt-12">
                {SCOPES.map((scope) => (
                  <button
                    key={scope}
                    className={`intel-btn ${selectedScope === scope ? "intel-btn-primary" : ""}`}
                    onClick={() => setSelectedScope(scope)}
                    type="button"
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-chart-title">Modules to Include</div>
              <div className="intel-actions-row intel-mt-12">
                {MODULES.map((name) => {
                  const selected = selectedModules.includes(name);
                  return (
                    <button
                      key={name}
                      className={`intel-btn ${selected ? "intel-btn-ai" : ""}`}
                      onClick={() => toggleModule(name)}
                      type="button"
                    >
                      {selected ? "✓ " : ""}{name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">
                <div className="intel-report-card-top">
                  <span>Scheduled Exports</span>
                  <button
                    className="intel-btn intel-btn-ai"
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    + Schedule
                  </button>
                </div>
              </div>
              <div className="intel-table-wrap">
                <table className="intel-table">
                  <thead>
                    <tr>
                      {["Export Name", "Frequency", "Format", "Destination", "Last Run", "Next Run", "Status"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.scheduledExports.map((s) => {
                      const style = STATUS_STYLE[s.status] || STATUS_STYLE.paused;
                      return (
                        <tr key={s.id}>
                          <td className="intel-table-title-cell">{s.name}</td>
                          <td>{s.frequency}</td>
                          <td><span className="intel-badge">{s.format}</span></td>
                          <td>{s.destination}</td>
                          <td>{s.lastRun ? new Date(s.lastRun).toLocaleDateString() : "—"}</td>
                          <td>{s.nextRun ? new Date(s.nextRun).toLocaleDateString() : "—"}</td>
                          <td><span className={`intel-badge ${style.className}`}>{style.label}</span></td>
                        </tr>
                      );
                    })}
                    {dashboardData.scheduledExports.length === 0 && (
                      <tr><td colSpan={7} className="intel-text-muted" style={{ padding: "12px" }}>No scheduled exports yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">Export History</div>
              <div className="intel-table-wrap">
                <table className="intel-table">
                  <thead>
                    <tr>
                      {["File Name", "Type", "Generated By", "Date", "Size", "Status", "Download"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.exportHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="intel-table-title-cell">{item.name}</td>
                        <td><span className="intel-badge">{item.type}</span></td>
                        <td>{item.generatedBy}</td>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td>{item.size}</td>
                        <td><span className="intel-badge intel-badge-success">Ready</span></td>
                        <td>
                          <button
                            className="intel-btn intel-btn-primary"
                            type="button"
                            onClick={() => handleDownloadHistory(item)}
                          >
                            ↓
                          </button>
                        </td>
                      </tr>
                    ))}
                    {dashboardData.exportHistory.length === 0 && (
                      <tr><td colSpan={7} className="intel-text-muted" style={{ padding: "12px" }}>No export history yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="intel-flex-column">
            <div className="intel-card">
              <div className="intel-chart-title">Export Configuration</div>
              <div className="intel-mt-14">
                {CONFIG_FIELDS.map(([label, key, options]) => (
                  <div key={key} className="intel-form-group">
                    <label className="intel-muted-label">{label}</label>
                    <select
                      className="intel-select intel-w-full intel-mt-4"
                      value={config[key]}
                      onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                    >
                      {options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="intel-form-group">
                <div className="intel-kpi-label">Include</div>
                {INCLUDE_OPTIONS.map(([key, label]) => (
                  <label key={key} className="intel-checkbox-row" htmlFor={`export-${key}`}>
                    <input
                      id={`export-${key}`}
                      type="checkbox"
                      checked={Boolean(config[key])}
                      onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    <span className="intel-muted-label">{label}</span>
                  </label>
                ))}
              </div>

              <div className="intel-mini-metric">
                <div className="intel-mini-metric-label">Export Summary</div>
                <div className="intel-insight-text">
                  Format: <strong>{selectedFormat}</strong> · Scope: <strong>{selectedScope}</strong>
                  <br />
                  Modules: <strong>{selectedModules.length}</strong> selected
                  <br />
                  Delivery: <strong>{config.delivery}</strong>
                </div>
              </div>

              <button
                className={`intel-btn ${exporting ? "" : "intel-btn-primary"} intel-w-full intel-mt-12`}
                onClick={handleExport}
                disabled={exporting}
                type="button"
              >
                {exporting ? "⏳ Exporting…" : `↓ Export as ${selectedFormat}`}
              </button>
            </div>

            <div className="intel-card">
              <div className="intel-chart-title">Advanced Options</div>
              <div className="intel-mt-10">
                {ADVANCED_OPTIONS.map(([label, description, type]) => (
                  <div key={label} className="intel-recommendation-row">
                    <div className="intel-flex-1">
                      <div className="intel-report-card-title">{label}</div>
                      <div className="intel-report-card-meta">{description}</div>
                    </div>
                    <button
                      className="intel-btn"
                      type="button"
                      onClick={() => {
                        if (type === "email") setShowScheduleModal(true);
                        else showMsg(`${label} setup: configure in workspace integrations`, true);
                      }}
                    >
                      Setup
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScheduleModal && (
        <div className="intel-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="intel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="intel-modal-header">
              <span>Schedule Export</span>
              <button className="intel-btn" onClick={() => setShowScheduleModal(false)} type="button">✕</button>
            </div>

            <div className="intel-form-group">
              <label className="intel-muted-label">Export Name</label>
              <input
                className="intel-input intel-w-full intel-mt-4"
                placeholder="e.g. Weekly Finance Export"
                value={schedForm.name}
                onChange={(e) => setSchedForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="intel-form-group">
              <label className="intel-muted-label">Frequency</label>
              <select
                className="intel-select intel-w-full intel-mt-4"
                value={schedForm.frequency}
                onChange={(e) => setSchedForm((f) => ({ ...f, frequency: e.target.value }))}
              >
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div className="intel-form-group">
              <label className="intel-muted-label">Destination</label>
              <select
                className="intel-select intel-w-full intel-mt-4"
                value={schedForm.destination}
                onChange={(e) => setSchedForm((f) => ({ ...f, destination: e.target.value }))}
              >
                {DESTINATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="intel-text-muted intel-small intel-mt-8">
              Format: <strong>{selectedFormat}</strong> · Modules: <strong>{selectedModules.join(", ") || "none selected"}</strong>
            </div>

            <div className="intel-actions-row intel-mt-16">
              <button className="intel-btn" onClick={() => setShowScheduleModal(false)} type="button">Cancel</button>
              <button
                className="intel-btn intel-btn-primary"
                onClick={handleSchedule}
                disabled={scheduling}
                type="button"
              >
                {scheduling ? "Scheduling…" : "Schedule Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
