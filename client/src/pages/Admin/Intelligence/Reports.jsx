import React, { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import ReportTemplateCard from "../../../components/admin/intelligence/ReportTemplateCard.jsx";

import {
  listReports,
  getTemplates,
  generateReport,
  runReport,
  scheduleReport,
  exportReportCSV,
  exportPDF,
  deleteReport,
  getStatsOverview,
} from "../../../services/intelligence/reportsService";

// ── constants ─────────────────────────────────────────────────────────────────

const REPORT_TABS = ["executive", "crm", "marketing", "hr", "finance", "ai"];

const TAB_META = {
  executive: { label: "Executive",  icon: "🏛️", module: "executive" },
  crm:       { label: "CRM",        icon: "💼", module: "crm" },
  marketing: { label: "Marketing",  icon: "📣", module: "marketing" },
  hr:        { label: "HR",         icon: "👥", module: "hr" },
  finance:   { label: "Finance",    icon: "💰", module: "finance" },
  ai:        { label: "AI Reports", icon: "✦",  module: "executive" },
};

const PERIOD_DAYS = {
  "Last 7 Days": 7,
  "Last 30 Days": 30,
  "Last 90 Days": 90,
  "This Year": 365,
};

const CRON_OPTS = [
  { label: "Daily at 8am",    cron: "0 8 * * *" },
  { label: "Weekly (Mon 8am)", cron: "0 8 * * 1" },
  { label: "Monthly (1st)",   cron: "0 8 1 * *" },
  { label: "Quarterly",       cron: "0 8 1 1,4,7,10 *" },
];

const GOLD = "#D4AF37";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n === undefined || n === null) return "—";
  if (typeof n !== "number") return String(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function scoreColor(s) {
  if (s >= 75) return "#16a34a";
  if (s >= 50) return "#ca8a04";
  return "#dc2626";
}

function metricsToChartData(metrics = {}) {
  return Object.entries(metrics).map(([key, val]) => ({
    name: key.replace(/_/g, " "),
    value: typeof val === "number" ? val : 0,
  }));
}

function byMonthToAreaData(byMonth = {}) {
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, val]) => ({ month, value: val }));
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = GOLD }) {
  return (
    <div className="intel-mini-metric" style={{ minWidth: 120 }}>
      <div className="intel-kpi-value" style={{ color, fontSize: 22 }}>{value}</div>
      <div className="intel-section-title" style={{ fontSize: 11 }}>{label}</div>
      {sub && <div className="intel-mini-metric-label">{sub}</div>}
    </div>
  );
}

function HealthBadge({ score }) {
  if (score === undefined || score === null) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: `${scoreColor(score)}22`,
        border: `1px solid ${scoreColor(score)}55`,
        borderRadius: 8,
        padding: "4px 14px",
        color: scoreColor(score),
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      ◉ Health Score: {score}/100
    </div>
  );
}

function AIPanel({ ai }) {
  if (!ai) return null;
  return (
    <div className="intel-ai-insight-box" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <span className="intel-ai-badge">✦ AI Executive Summary</span>
        <HealthBadge score={ai.health_score} />
      </div>

      {ai.executive_summary && (
        <p style={{ color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 12 }}>
          {ai.executive_summary}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: "Highlights", items: ai.highlights, color: "#16a34a" },
          { label: "Risks",      items: ai.risks,       color: "#dc2626" },
          { label: "Recommendations", items: ai.recommendations, color: "#2563eb" },
        ].map(({ label, items, color }) =>
          items?.length ? (
            <div key={label}>
              <div style={{ fontWeight: 700, fontSize: 11, color, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </div>
              <ul style={{ margin: 0, paddingLeft: 14 }}>
                {items.map((item, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 3 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function MetricsGrid({ metrics = {} }) {
  const entries = Object.entries(metrics);
  if (!entries.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
      {entries.map(([key, val]) => (
        <StatCard
          key={key}
          label={key.replace(/_/g, " ")}
          value={typeof val === "number" ? fmt(val) : String(val ?? "—")}
        />
      ))}
    </div>
  );
}

function ReportCharts({ data }) {
  if (!data) return null;

  const metrics = data.metrics || data.summary_metrics || {};
  const byMonth  = data.by_month || {};
  const bySource = data.by_source || data.leads_by_source || {};
  const byStage  = data.by_stage || {};

  const chartData   = metricsToChartData(metrics);
  const areaData    = byMonthToAreaData(byMonth);
  const sourceData  = Object.entries(bySource).map(([name, value]) => ({ name, value }));
  const stageData   = Object.entries(byStage).map(([name, value]) => ({ name, value }));

  if (!chartData.length && !areaData.length && !sourceData.length) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
      {areaData.length > 1 && (
        <div className="intel-chart-box">
          <div className="intel-chart-title" style={{ marginBottom: 8 }}>Trend</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={GOLD} fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {sourceData.length > 0 && (
        <div className="intel-chart-box">
          <div className="intel-chart-title" style={{ marginBottom: 8 }}>By Source</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill={GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stageData.length > 0 && (
        <div className="intel-chart-box">
          <div className="intel-chart-title" style={{ marginBottom: 8 }}>By Stage</div>
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={stageData}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis tick={{ fontSize: 8 }} />
              <Radar dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.25} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ScheduleModal({ reportId, reportName, onClose }) {
  const [cron, setCron]         = useState(CRON_OPTS[1].cron);
  const [recipients, setRecipients] = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const recipientList = recipients.split(",").map((e) => e.trim()).filter(Boolean);
      await scheduleReport(reportId, { cron, recipients: recipientList });
      setSaved(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="intel-modal-backdrop" onClick={onClose}>
      <div className="intel-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="intel-row-between intel-mb-14">
          <div className="intel-section-title">⏰ Schedule Report</div>
          <button className="intel-btn" onClick={onClose} type="button">✕</button>
        </div>

        <div style={{ marginBottom: 8, color: "var(--text-secondary)", fontSize: 13 }}>
          {reportName}
        </div>

        <div className="intel-form-group">
          <label className="intel-muted-label">Frequency</label>
          <select
            className="intel-select intel-w-full intel-mt-4"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
          >
            {CRON_OPTS.map((o) => (
              <option key={o.cron} value={o.cron}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="intel-form-group" style={{ marginTop: 12 }}>
          <label className="intel-muted-label">Email Recipients (comma-separated)</label>
          <input
            className="intel-select intel-w-full intel-mt-4"
            style={{ height: 36 }}
            placeholder="user@example.com, boss@example.com"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
          />
        </div>

        {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{error}</div>}
        {saved && <div style={{ color: "#16a34a", fontSize: 12, marginTop: 8 }}>✓ Schedule saved!</div>}

        <div className="intel-actions-row" style={{ marginTop: 16 }}>
          <button className="intel-btn intel-btn-primary intel-flex-1" onClick={handleSave} disabled={saving || saved} type="button">
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Schedule"}
          </button>
          <button className="intel-btn" onClick={onClose} type="button">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GenerateModal({ template, periodDays, onClose, onDone }) {
  const [name, setName]         = useState(template?.name || "");
  const [days, setDays]         = useState(periodDays || 30);
  const [includeAI, setIncludeAI] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await generateReport({
        module: template?.module || "executive",
        days: Number(days),
        include_ai: includeAI,
        save: true,
        name: name || template?.name,
      });
      setResult(res.report || res);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!result) return;
    await exportPDF(result, result.name || "Report");
  }

  return (
    <div className="intel-modal-backdrop" onClick={onClose}>
      <div
        className="intel-modal"
        style={{ maxWidth: result ? 760 : 440, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="intel-row-between intel-mb-14">
          <div className="intel-section-title">
            {result ? "📄 Report Preview" : "⚙ Generate Report"}
          </div>
          <button className="intel-btn" onClick={onClose} type="button">✕</button>
        </div>

        {!result ? (
          <>
            <div className="intel-form-group">
              <label className="intel-muted-label">Report Name</label>
              <input
                className="intel-select intel-w-full intel-mt-4"
                style={{ height: 36 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q2 Executive Summary"
              />
            </div>

            <div className="intel-form-group" style={{ marginTop: 12 }}>
              <label className="intel-muted-label">Period</label>
              <select
                className="intel-select intel-w-full intel-mt-4"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
                <option value={365}>This Year</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <input
                type="checkbox"
                id="includeAI"
                checked={includeAI}
                onChange={(e) => setIncludeAI(e.target.checked)}
              />
              <label htmlFor="includeAI" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Include AI Executive Summary (Groq/LLM)
              </label>
            </div>

            {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{error}</div>}

            <div className="intel-actions-row" style={{ marginTop: 16 }}>
              <button
                className="intel-btn intel-btn-primary intel-flex-1"
                onClick={handleGenerate}
                disabled={loading}
                type="button"
              >
                {loading ? "⏳ Generating…" : "Generate Report"}
              </button>
              <button className="intel-btn" onClick={onClose} type="button">Cancel</button>
            </div>
          </>
        ) : (
          <>
            <AIPanel ai={result.ai_summary} />
            <MetricsGrid metrics={result.data?.metrics || result.data?.summary_metrics || {}} />
            <ReportCharts data={result.data} />

            <div className="intel-actions-row" style={{ marginTop: 12 }}>
              <button className="intel-btn intel-btn-primary" onClick={handleExportPDF} type="button">
                ↓ Export PDF
              </button>
              {result.id && (
                <button
                  className="intel-btn"
                  onClick={() => exportReportCSV(result.id, `${result.name || "report"}.csv`)}
                  type="button"
                >
                  ↓ Export CSV
                </button>
              )}
              <button className="intel-btn intel-flex-1" onClick={onClose} type="button">
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [period, setPeriod]         = useState("Last 30 Days");
  const [workspace, setWorkspace]   = useState("All Workspaces");
  const [activeTab, setActiveTab]   = useState("executive");

  // data
  const [templates, setTemplates]   = useState({});
  const [reports, setReports]       = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // modals
  const [generateTarget, setGenerateTarget] = useState(null); // template object
  const [scheduleTarget, setScheduleTarget] = useState(null); // { id, name }
  const [previewReport, setPreviewReport]   = useState(null); // saved report object

  // builder panel
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderConfig, setBuilderConfig] = useState({
    module: "executive",
    days: 30,
    include_ai: true,
  });
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderResult, setBuilderResult]   = useState(null);
  const [builderError, setBuilderError]     = useState("");

  const periodDays = PERIOD_DAYS[period] || 30;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tmplRes, rptRes, statRes] = await Promise.all([
        getTemplates(),
        listReports({ limit: 20 }),
        getStatsOverview(),
      ]);
      setTemplates(tmplRes.templates || {});
      setReports(rptRes.reports || []);
      setStats(statRes.stats || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabTemplates = templates[activeTab] || [];

  async function handleBuilderGenerate() {
    setBuilderLoading(true);
    setBuilderError("");
    setBuilderResult(null);
    try {
      const res = await generateReport({
        module: builderConfig.module,
        days: Number(builderConfig.days),
        include_ai: builderConfig.include_ai,
        save: true,
        name: `${builderConfig.module.charAt(0).toUpperCase() + builderConfig.module.slice(1)} Report — ${new Date().toLocaleDateString()}`,
      });
      setBuilderResult(res.report || res);
      await load();
    } catch (err) {
      setBuilderError(err.message);
    } finally {
      setBuilderLoading(false);
    }
  }

  async function handleRunReport(report) {
    try {
      const res = await runReport(report.id);
      setPreviewReport(res.report || report);
      await load();
    } catch (err) {
      alert("Run failed: " + err.message);
    }
  }

  async function handleDeleteReport(id) {
    if (!window.confirm("Delete this report?")) return;
    try {
      await deleteReport(id);
      await load();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  // ── render ──

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Reports"
        subtitle="Generate, schedule, and share AI-powered ERP reports"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        showAI={false}
      />

      <div className="intel-page-body">
        {/* Stats bar */}
        {stats && (
          <div className="intel-panel" style={{ marginBottom: 16 }}>
            <div className="intel-card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
              <StatCard label="Total Reports" value={stats.total_reports ?? "—"} />
              <StatCard label="With AI" value={stats.reports_with_ai ?? "—"} color="#a855f7" />
              <StatCard label="Scheduled" value={stats.scheduled_reports ?? "—"} color="#2563eb" />
              <StatCard label="Exports" value={stats.total_exports ?? "—"} color="#16a34a" />
              <StatCard label="Modules" value={stats.modules_covered ?? "—"} color="#ca8a04" />
            </div>
          </div>
        )}

        {error && (
          <div className="intel-panel" style={{ borderColor: "#dc262644", background: "#dc262611", marginBottom: 16, padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
            ⚠ {error}
            <button className="intel-btn" style={{ marginLeft: 12 }} onClick={load} type="button">Retry</button>
          </div>
        )}

        {/* Tabs + toolbar */}
        <div className="intel-tabs">
          {REPORT_TABS.map((tab) => {
            const m = TAB_META[tab];
            return (
              <button
                key={tab}
                className={`intel-tab ${activeTab === tab ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {m.icon} {m.label}
              </button>
            );
          })}

          <div className="intel-toolbar intel-flex-1">
            <button
              className={`intel-btn ${showBuilder ? "intel-btn-ai" : ""}`}
              onClick={() => { setShowBuilder(!showBuilder); setBuilderResult(null); }}
              type="button"
            >
              ⚙ Builder
            </button>
            <button
              className="intel-btn intel-btn-primary"
              onClick={() => setGenerateTarget({ name: `${TAB_META[activeTab].label} Report`, module: TAB_META[activeTab].module })}
              type="button"
            >
              + Generate
            </button>
          </div>
        </div>

        <div className={showBuilder ? "intel-main-with-sidebar" : "intel-grid"}>
          {/* Main content */}
          <div className="intel-flex-column">
            {/* Template cards */}
            {loading ? (
              <div className="intel-panel" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                ⏳ Loading reports…
              </div>
            ) : tabTemplates.length > 0 ? (
              <div className="intel-card-grid" style={{ marginBottom: 16 }}>
                {tabTemplates.map((tpl) => (
                  <ReportTemplateCard
                    key={tpl.id}
                    report={tpl}
                    onGenerate={() => setGenerateTarget(tpl)}
                    onPreview={() => setPreviewReport(tpl)}
                    onSchedule={() => setScheduleTarget({ id: tpl.id, name: tpl.name })}
                  />
                ))}
              </div>
            ) : (
              <div className="intel-panel" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", marginBottom: 16 }}>
                No templates for this tab yet.
                <br />
                <button
                  className="intel-btn intel-btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => setGenerateTarget({ name: `${TAB_META[activeTab].label} Report`, module: TAB_META[activeTab].module })}
                  type="button"
                >
                  Generate First Report
                </button>
              </div>
            )}

            {/* Recent report runs */}
            <div className="intel-panel">
              <div className="intel-panel-header">Recent Report Runs</div>

              {reports.length === 0 ? (
                <div style={{ padding: "16px 20px", color: "var(--text-muted)", fontSize: 13 }}>
                  No reports generated yet.
                </div>
              ) : (
                <div className="intel-table-wrap">
                  <table className="intel-table">
                    <thead>
                      <tr>
                        {["Name", "Module", "Period", "AI", "Created", "Actions"].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((rpt) => (
                        <tr key={rpt.id}>
                          <td className="intel-table-title-cell">{rpt.name}</td>
                          <td style={{ textTransform: "capitalize" }}>{rpt.module}</td>
                          <td>{rpt.period_days}d</td>
                          <td>
                            {rpt.has_ai_summary ? (
                              <span style={{ color: GOLD, fontSize: 12 }}>✦ AI</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td>{rpt.created_at ? new Date(rpt.created_at).toLocaleDateString() : "—"}</td>
                          <td>
                            <div className="intel-actions-row">
                              <button
                                className="intel-btn"
                                onClick={() => handleRunReport(rpt)}
                                title="Run & preview"
                                type="button"
                              >
                                ▶
                              </button>
                              <button
                                className="intel-btn"
                                onClick={() => setScheduleTarget({ id: rpt.id, name: rpt.name })}
                                title="Schedule"
                                type="button"
                              >
                                ⏰
                              </button>
                              <button
                                className="intel-btn"
                                onClick={() => exportReportCSV(rpt.id, `${rpt.name || "report"}.csv`)}
                                title="Export CSV"
                                type="button"
                              >
                                ↓
                              </button>
                              <button
                                className="intel-btn"
                                style={{ color: "#dc2626" }}
                                onClick={() => handleDeleteReport(rpt.id)}
                                title="Delete"
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Builder sidebar */}
          {showBuilder && (
            <div className="intel-side-panel">
              <div className="intel-chart-title">⚙ Report Builder</div>

              <div className="intel-flex-column intel-mt-14">
                <div className="intel-form-group">
                  <label className="intel-muted-label">Module</label>
                  <select
                    className="intel-select intel-w-full intel-mt-4"
                    value={builderConfig.module}
                    onChange={(e) => setBuilderConfig((c) => ({ ...c, module: e.target.value }))}
                  >
                    {["executive", "crm", "finance", "hr", "marketing"].map((m) => (
                      <option key={m} value={m} style={{ textTransform: "capitalize" }}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="intel-form-group" style={{ marginTop: 10 }}>
                  <label className="intel-muted-label">Period</label>
                  <select
                    className="intel-select intel-w-full intel-mt-4"
                    value={builderConfig.days}
                    onChange={(e) => setBuilderConfig((c) => ({ ...c, days: Number(e.target.value) }))}
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                    <option value={365}>This Year</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <input
                    type="checkbox"
                    id="builderAI"
                    checked={builderConfig.include_ai}
                    onChange={(e) => setBuilderConfig((c) => ({ ...c, include_ai: e.target.checked }))}
                  />
                  <label htmlFor="builderAI" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    AI Summary (Groq)
                  </label>
                </div>

                {builderError && (
                  <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{builderError}</div>
                )}

                <button
                  className="intel-btn intel-btn-primary intel-w-full"
                  style={{ marginTop: 14 }}
                  onClick={handleBuilderGenerate}
                  disabled={builderLoading}
                  type="button"
                >
                  {builderLoading ? "⏳ Generating…" : "Generate Report"}
                </button>

                {builderResult && (
                  <div style={{ marginTop: 16 }}>
                    <AIPanel ai={builderResult.ai_summary} />
                    <MetricsGrid metrics={builderResult.data?.metrics || builderResult.data?.summary_metrics || {}} />

                    <div className="intel-actions-row" style={{ flexWrap: "wrap" }}>
                      <button
                        className="intel-btn intel-btn-primary"
                        onClick={() => exportPDF(builderResult, builderResult.name || "Report")}
                        type="button"
                      >
                        ↓ PDF
                      </button>
                      {builderResult.id && (
                        <button
                          className="intel-btn"
                          onClick={() => exportReportCSV(builderResult.id, `${builderResult.name || "report"}.csv`)}
                          type="button"
                        >
                          ↓ CSV
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate modal */}
      {generateTarget && (
        <GenerateModal
          template={generateTarget}
          periodDays={periodDays}
          onClose={() => setGenerateTarget(null)}
          onDone={() => { setGenerateTarget(null); load(); }}
        />
      )}

      {/* Schedule modal */}
      {scheduleTarget && (
        <ScheduleModal
          reportId={scheduleTarget.id}
          reportName={scheduleTarget.name}
          onClose={() => setScheduleTarget(null)}
        />
      )}

      {/* Preview modal for saved reports */}
      {previewReport && previewReport.ai_summary && (
        <div className="intel-modal-backdrop" onClick={() => setPreviewReport(null)}>
          <div
            className="intel-modal"
            style={{ maxWidth: 760, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="intel-row-between intel-mb-14">
              <div className="intel-section-title">{previewReport.name}</div>
              <button className="intel-btn" onClick={() => setPreviewReport(null)} type="button">✕</button>
            </div>

            <AIPanel ai={previewReport.ai_summary} />
            <MetricsGrid metrics={previewReport.data?.metrics || previewReport.data?.summary_metrics || {}} />
            <ReportCharts data={previewReport.data} />

            <div className="intel-actions-row" style={{ marginTop: 12 }}>
              <button
                className="intel-btn intel-btn-primary"
                onClick={() => exportPDF(previewReport, previewReport.name)}
                type="button"
              >
                ↓ Export PDF
              </button>
              {previewReport.id && (
                <button
                  className="intel-btn"
                  onClick={() => exportReportCSV(previewReport.id, `${previewReport.name}.csv`)}
                  type="button"
                >
                  ↓ Export CSV
                </button>
              )}
              <button className="intel-btn intel-flex-1" onClick={() => setPreviewReport(null)} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
