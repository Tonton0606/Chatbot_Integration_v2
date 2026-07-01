import React, { useEffect, useState, useCallback } from "react";
import {
  getIndustryBenchmarks,
  getBenchmarkComparison,
  getAllBenchmarks,
  PH_INDUSTRIES,
  BENCHMARK_SEGMENTS,
  BENCHMARK_METRICS,
} from "../../../services/intelligence/industryBenchmarksService";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";

const STATUS_STYLE = {
  above_benchmark: { color: "var(--success)", label: "▲ Above" },
  below_benchmark: { color: "#ef4444", label: "▼ Below" },
  on_par: { color: "var(--text-muted)", label: "= On Par" },
};

export default function IndustryBenchmarks({ onRefresh }) {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [feedback, setFeedback] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(BENCHMARK_SEGMENTS?.[0] || "SMB");
  const [comparing, setComparing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [benchmarks, setBenchmarks] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [allIndustries, setAllIndustries] = useState([]);

  const showMsg = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadAll = useCallback(async () => {
    try {
      const d = await getAllBenchmarks();
      setAllIndustries(Array.isArray(d) ? d : d.industries || []);
    } catch (err) {
      showMsg(err.message || "Failed to load benchmarks", false);
    }
  }, []);

  const loadIndustry = useCallback(async (industry, segment) => {
    if (!industry) return;
    setLoading(true);
    try {
      const d = await getIndustryBenchmarks(industry, segment);
      setBenchmarks(Array.isArray(d) ? d : d.benchmarks || []);
      setComparison(null);
    } catch (err) {
      showMsg(err.message || "Failed to load industry benchmarks", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (selectedIndustry) loadIndustry(selectedIndustry, selectedSegment);
    else setBenchmarks([]);
  }, [selectedIndustry, selectedSegment, loadIndustry]);

  const handleCompare = async () => {
    if (!selectedIndustry) { showMsg("Please select an industry first", false); return; }
    setComparing(true);
    try {
      const d = await getBenchmarkComparison(selectedIndustry, selectedSegment);
      setComparison(Array.isArray(d) ? d : d.comparison || []);
      showMsg("Comparison loaded");
    } catch (err) {
      showMsg(err.message || "Comparison failed", false);
    } finally {
      setComparing(false);
    }
  };

  // Group allIndustries by industry name for overview table
  const industryMap = {};
  allIndustries.forEach((b) => {
    const key = b.industry || b.name;
    if (!industryMap[key]) industryMap[key] = {};
    if (b.metric_key === "gross_margin_pct" || b.metric === "gross_margin_pct") industryMap[key].gross = b.benchmark_value ?? b.value;
    if (b.metric_key === "net_margin_pct" || b.metric === "net_margin_pct") industryMap[key].net = b.benchmark_value ?? b.value;
  });

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Industry Benchmarks"
        subtitle="Compare your KPIs against Philippine industry standards (PSE/BSP/SEC data)"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => { loadAll(); if (selectedIndustry) loadIndustry(selectedIndustry, selectedSegment); }}
        showAI={false}
      />

      {feedback && (
        <div className="intel-toast" style={{ background: feedback.ok ? "var(--success)" : "var(--danger)" }}>
          {feedback.msg}
        </div>
      )}

      <div className="intel-page-body">
        {/* Controls */}
        <div className="intel-panel">
          <div className="intel-panel-header">Select Industry & Segment</div>
          <div className="intel-actions-row" style={{ flexWrap: "wrap", gap: 12 }}>
            <select
              className="intel-select"
              style={{ minWidth: 220 }}
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
            >
              <option value="">— All Industries —</option>
              {(PH_INDUSTRIES || []).map((ind) => (
                <option key={ind.value || ind} value={ind.value || ind}>{ind.label || ind}</option>
              ))}
            </select>

            <div className="intel-actions-row">
              {(BENCHMARK_SEGMENTS || ["SMB", "Enterprise"]).map((seg) => (
                <button
                  key={seg}
                  className={`intel-btn ${selectedSegment === seg ? "intel-btn-ai" : ""}`}
                  onClick={() => setSelectedSegment(seg)}
                  type="button"
                >
                  {seg}
                </button>
              ))}
            </div>

            <button
              className="intel-btn intel-btn-primary"
              onClick={handleCompare}
              disabled={comparing || !selectedIndustry}
              type="button"
            >
              {comparing ? "Comparing…" : "⇌ Compare vs My Business"}
            </button>
          </div>

          <div className="intel-xs intel-text-muted" style={{ marginTop: 8 }}>
            Source: PSE/BSP/SEC Philippine Industry Data 2024
          </div>
        </div>

        {/* Comparison Table */}
        {comparison && comparison.length > 0 && (
          <div className="intel-panel">
            <div className="intel-panel-header">Benchmark Comparison — {selectedIndustry} ({selectedSegment})</div>
            <table className="intel-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  {["Metric", "Industry Benchmark", "Our Value", "Gap", "Gap %", "Status"].map((h) => (
                    <th key={h} className="intel-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => {
                  const ss = STATUS_STYLE[row.status] || STATUS_STYLE.on_par;
                  return (
                    <tr key={i}>
                      <td className="intel-td intel-small">{row.metric_label || row.metric}</td>
                      <td className="intel-td intel-small">
                        {row.benchmark_value != null ? `${row.benchmark_value}${row.unit || ""}` : "—"}
                      </td>
                      <td className="intel-td intel-small">
                        {row.our_value != null ? `${row.our_value}${row.unit || ""}` : "—"}
                      </td>
                      <td className="intel-td intel-small">{row.gap != null ? row.gap : "—"}</td>
                      <td className="intel-td intel-small">{row.gap_pct != null ? `${row.gap_pct}%` : "—"}</td>
                      <td className="intel-td">
                        <span className="intel-badge" style={{ color: ss.color }}>{ss.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Benchmark Cards for selected industry */}
        {selectedIndustry && benchmarks.length > 0 && (
          <div className="intel-panel">
            <div className="intel-panel-header">
              Benchmarks for {selectedIndustry} · {selectedSegment}
              {loading && <span className="intel-badge intel-ml-8" style={{ color: "var(--brand-cyan)" }}>Loading…</span>}
            </div>
            <div className="intel-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {benchmarks.map((b, i) => (
                <div key={i} className="intel-kpi-card">
                  <div className="intel-kpi-label">{b.metric_label || b.label || b.metric_key}</div>
                  <div className="intel-kpi-value" style={{ color: "var(--brand-cyan)", fontSize: "1.4rem" }}>
                    {b.benchmark_value != null ? `${b.benchmark_value}${b.unit || ""}` : "—"}
                  </div>
                  {b.percentile_context && (
                    <div className="intel-xs intel-text-muted" style={{ marginTop: 4 }}>{b.percentile_context}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Industries Overview */}
        {!selectedIndustry && Object.keys(industryMap).length > 0 && (
          <div className="intel-panel">
            <div className="intel-panel-header">All Industries Overview</div>
            <table className="intel-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  {["Industry", "Gross Margin %", "Net Margin %"].map((h) => (
                    <th key={h} className="intel-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(industryMap).map(([industry, vals]) => (
                  <tr
                    key={industry}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedIndustry(industry)}
                  >
                    <td className="intel-td intel-small" style={{ color: "var(--brand-cyan)" }}>{industry}</td>
                    <td className="intel-td intel-small">{vals.gross != null ? `${vals.gross}%` : "—"}</td>
                    <td className="intel-td intel-small">{vals.net != null ? `${vals.net}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="intel-xs intel-text-muted" style={{ marginTop: 8 }}>
              Click an industry row to drill down.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
