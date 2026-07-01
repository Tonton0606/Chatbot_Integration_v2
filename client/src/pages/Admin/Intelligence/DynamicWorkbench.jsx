import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Brain, GripVertical, LineChart as LineIcon, Play, Plus, Table2, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import {
  createIntelligenceAutomation,
  createIntelligenceModule,
  listIntelligenceModules,
  runIntelligenceModule,
  subscribeToIntelligence,
} from "../../../services/intelligence/dynamicIntelligenceService.js";

const GOLD = "#d4af37";

function formatValue(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value !== "number") return String(value);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function titleize(value = "") {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function KpiWidget({ widget, data }) {
  const value = data.metrics?.[widget.metric] ?? 0;
  return (
    <div className="intel-mini-metric" style={{ minHeight: 128 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="intel-section-title">{widget.title || titleize(widget.metric)}</div>
          <div className="intel-kpi-value" style={{ color: GOLD }}>{formatValue(value)}</div>
        </div>
        <Activity size={20} color={GOLD} />
      </div>
      <div className="intel-mini-metric-label">Metric: {widget.metric}</div>
    </div>
  );
}

function ChartWidget({ widget, data }) {
  const chartData = Object.entries(data.metrics || {}).slice(0, 8).map(([name, value]) => ({
    name: titleize(name),
    value: Number(value || 0),
  }));

  const Chart = widget.chart === "bar" ? BarChart : LineChart;
  return (
    <div className="intel-chart-box" style={{ minHeight: 260 }}>
      <div className="intel-chart-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {widget.chart === "bar" ? <BarChart3 size={16} /> : <LineIcon size={16} />}
        {widget.title || "Metric Trend"}
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <Chart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          {widget.chart === "bar" ? <Bar dataKey="value" fill={GOLD} radius={[3, 3, 0, 0]} /> : <Line dataKey="value" stroke={GOLD} strokeWidth={2} />}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

function TableWidget({ data }) {
  const rows = Object.entries(data.metrics || {}).slice(0, 12);
  return (
    <div className="intel-chart-box">
      <div className="intel-chart-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Table2 size={16} /> Metric Table
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key} style={{ borderBottom: "1px solid var(--border-color)" }}>
              <td style={{ padding: "10px 6px", color: "var(--text-secondary)" }}>{titleize(key)}</td>
              <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 700 }}>{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightsWidget({ data }) {
  return (
    <div className="intel-ai-insight-box">
      <div className="intel-ai-badge" style={{ marginBottom: 12 }}><Brain size={14} /> Decision Brief</div>
      {(data.insights || []).slice(0, 4).map((insight) => (
        <div key={insight.id || insight.title} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            {insight.severity === "critical" ? <AlertTriangle size={15} color="#dc2626" /> : <Brain size={15} color={GOLD} />}
            {insight.title}
          </div>
          <p style={{ margin: "5px 0 0", color: "var(--text-secondary)", lineHeight: 1.5 }}>{insight.content}</p>
        </div>
      ))}
    </div>
  );
}

function PredictionsWidget({ data }) {
  return (
    <div className="intel-chart-box">
      <div className="intel-chart-title">Forecasts</div>
      {(data.predictions || []).map((prediction) => (
        <div key={prediction.id || prediction.metric} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 700 }}>
            <span>{titleize(prediction.metric)}</span>
            <span>{prediction.confidence}% confidence</span>
          </div>
          <div className="intel-mini-metric-label">
            {(prediction.forecast_data || []).map((point) => `${point.date}: ${formatValue(point.value)}`).join(" | ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function AutomationsWidget({ data }) {
  return (
    <div className="intel-chart-box">
      <div className="intel-chart-title" style={{ display: "flex", alignItems: "center", gap: 8 }}><Zap size={16} /> Automation Runs</div>
      {(data.automations || []).length ? data.automations.map((run, index) => (
        <div key={run.id || index} className="intel-mini-metric" style={{ marginBottom: 8 }}>
          <strong>{titleize(run.status)}</strong>
          <div className="intel-mini-metric-label">{run.trigger_payload?.metric} {run.trigger_payload?.operator} {run.trigger_payload?.expected}</div>
        </div>
      )) : <div className="intel-mini-metric-label">No automation triggers in the latest run.</div>}
    </div>
  );
}

const componentMap = {
  kpi: KpiWidget,
  chart: ChartWidget,
  table: TableWidget,
  heatmap: TableWidget,
  insights: InsightsWidget,
  predictions: PredictionsWidget,
  automations: AutomationsWidget,
};

function DynamicWidget({ widget, data, onDragStart, onDrop }) {
  const Component = componentMap[widget.type] || TableWidget;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={{ minWidth: 0 }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4, cursor: "grab", color: "var(--text-secondary)" }}>
        <GripVertical size={16} />
      </div>
      <Component widget={widget} data={data} />
    </div>
  );
}

export default function DynamicWorkbench() {
  const [modules, setModules] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("executive_decision_engine");
  const [runData, setRunData] = useState({ metrics: {}, insights: [], predictions: [], automations: [] });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [liveStatus, setLiveStatus] = useState("Polling ready");

  const selectedModule = useMemo(
    () => modules.find((module) => module.slug === selectedSlug) || modules[0],
    [modules, selectedSlug]
  );

  const visuals = selectedModule?.config?.visuals || [];

  async function loadModules() {
    const data = await listIntelligenceModules();
    setModules(data);
    if (data[0]?.slug) setSelectedSlug(data[0].slug);
  }

  async function run(moduleSlug = selectedSlug) {
    setRunning(true);
    setError("");
    try {
      const data = await runIntelligenceModule({ module: moduleSlug, days: 30, persist: true });
      setRunData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    let cleanup = () => {};
    loadModules()
      .then(() => run(selectedSlug))
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    subscribeToIntelligence(
      ({ event, data }) => {
        setLiveStatus(event === "connected" ? "Live stream connected" : "Live update received");
        if (event === "intelligence.run") setRunData(data);
      },
      () => setLiveStatus("Live stream unavailable; using manual refresh")
    ).then((stop) => {
      cleanup = stop;
    });

    return () => cleanup();
  }, []);

  function reorderVisuals(from, to) {
    if (from === null || from === to || !selectedModule) return;
    const nextVisuals = [...visuals];
    const [moved] = nextVisuals.splice(from, 1);
    nextVisuals.splice(to, 0, moved);
    setModules((current) =>
      current.map((module) =>
        module.slug === selectedModule.slug
          ? { ...module, config: { ...module.config, visuals: nextVisuals } }
          : module
      )
    );
    setDragIndex(null);
  }

  async function createSampleModule() {
    setError("");
    try {
      const module = await createIntelligenceModule({
        name: `Marketing KPI ${Date.now()}`,
        slug: `marketing_kpi_${Date.now()}`,
        description: "Config-driven marketing decision module.",
        config: {
          refresh_seconds: 60,
          sources: ["marketing", "crm"],
          metrics: ["click_rate", "open_rate", "new_leads", "qualified_leads", "lead_conversion_rate"],
          filters: ["date_range", "campaign", "source"],
          visuals: [
            { id: "click_rate", type: "kpi", metric: "click_rate", title: "Click Rate" },
            { id: "qualified", type: "kpi", metric: "qualified_leads", title: "Qualified Leads" },
            { id: "funnel", type: "chart", chart: "bar", title: "Marketing Metrics" },
            { id: "brief", type: "insights", title: "AI Brief" },
          ],
          predictions: [{ metric: "new_leads", horizon_days: 30 }],
          automations: [
            {
              name: "Low Conversion Watch",
              rule: { if: "lead_conversion_rate < 15" },
              actions: [{ type: "send_alert", severity: "warning", message: "Lead conversion below threshold." }],
            },
          ],
        },
      });
      setModules((current) => [module, ...current]);
      setSelectedSlug(module.slug);
      await run(module.slug);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createGuardrail() {
    if (!selectedModule?.id) {
      setError("Save a module before adding persistent automations.");
      return;
    }

    try {
      await createIntelligenceAutomation({
        module_id: selectedModule.id,
        name: "ROAS Guardrail",
        rule: { if: "roas < 1.5" },
        actions: [
          { type: "send_alert", severity: "critical", message: "ROAS dropped below guardrail." },
          { type: "pause_campaign", requires_approval: true },
        ],
      });
      await run(selectedModule.slug);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Dynamic Intelligence Workbench"
        subtitle="Config-driven decision engine for live ERP metrics, forecasts, insights, and governed automations"
      />

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={selectedSlug}
            onChange={(event) => {
              setSelectedSlug(event.target.value);
              run(event.target.value);
            }}
            className="intel-filter-select"
          >
            {modules.map((module) => (
              <option key={module.slug} value={module.slug}>{module.name}</option>
            ))}
          </select>
          <button className="intel-action-btn" onClick={() => run()} disabled={running}>
            <Play size={16} /> {running ? "Running" : "Run Engine"}
          </button>
          <button className="intel-secondary-btn" onClick={createSampleModule}>
            <Plus size={16} /> New Config Module
          </button>
          <button className="intel-secondary-btn" onClick={createGuardrail}>
            <Zap size={16} /> Add Guardrail
          </button>
        </div>
        <div className="intel-mini-metric-label">{liveStatus}</div>
      </div>

      {error && (
        <div className="intel-ai-insight-box" style={{ borderColor: "#dc262655", color: "#dc2626", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="intel-ai-insight-box" style={{ marginBottom: 16 }}>
        <div className="intel-ai-badge">JSON Config</div>
        <pre style={{ overflow: "auto", margin: "12px 0 0", fontSize: 12, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(selectedModule?.config || {}, null, 2)}
        </pre>
      </div>

      {loading ? (
        <div className="intel-chart-box">Loading intelligence engine...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {visuals.map((widget, index) => (
            <DynamicWidget
              key={widget.id || `${widget.type}-${index}`}
              widget={widget}
              data={runData}
              onDragStart={() => setDragIndex(index)}
              onDrop={() => reorderVisuals(dragIndex, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
