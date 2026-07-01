import React, { useEffect, useState, useCallback } from "react";

import { getRevenueForecastDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceChartCard, {
  RevenueTrendChart,
} from "../../../components/admin/intelligence/IntelligenceChartCard.jsx";
import ForecastScenarioCard from "../../../components/admin/intelligence/ForecastScenarioCard.jsx";

const FALLBACK_KPIS = [
  { label: "Current Revenue", value: "—", color: "var(--brand-cyan)" },
  { label: "Forecasted (Best)", value: "—", color: "var(--success)" },
  { label: "Forecast Accuracy", value: "—", color: "var(--brand-cyan)" },
  { label: "Pipeline Value", value: "—", color: "var(--brand-gold)" },
  { label: "Collection Rate", value: "—", color: "#9b59b6" },
  { label: "Revenue vs Target", value: "—", color: "var(--success)" },
];

function getProbabilityColor(probability) {
  if (probability >= 70) return "var(--success)";
  if (probability >= 40) return "#f5a623";
  return "var(--danger)";
}

export default function RevenueForecast() {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [convRate, setConvRate] = useState(28);
  const [velocity, setVelocity] = useState(35);
  const [includeRisky, setIncludeRisky] = useState(true);

  const [dashboardData, setDashboardData] = useState({
    forecastScenarios: [],
    pipelineContribution: [],
    revenueTrend: [],
    liveKpis: [],
    baseForecast: 0,
    aiInsights: [],
  });

  const load = useCallback(async () => {
    const data = await getRevenueForecastDashboard();
    setDashboardData(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const adjustment =
    (1 + (Number(convRate) - 28) / 100) *
    (Number(velocity) / 35) *
    (includeRisky ? 1 : 0.88);

  // Anchored to the real expected-case forecast from the backend (no mock base).
  const baseForecast = Number(dashboardData.baseForecast) || 0;
  const adjustedForecast = Math.max(0, Math.round(baseForecast * adjustment));

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Revenue Forecast"
        subtitle="Predict future revenue using pipeline trends, sales velocity, and forecast scenarios"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={load}
        onAISummary={load}
      />

      <div className="intel-page-body">
        <div className="intel-kpi-strip">
          {(dashboardData.liveKpis?.length ? dashboardData.liveKpis : FALLBACK_KPIS).map((kpi) => (
            <div key={kpi.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: kpi.color }} />
              <div className="intel-kpi-label">{kpi.label}</div>
              <div className="intel-kpi-value" style={{ color: kpi.color }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        <div className="intel-scenario-grid">
          {dashboardData.forecastScenarios.map((scenario) => (
            <ForecastScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>

        <div className="intel-forecast-layout">
          <IntelligenceChartCard
            title="Revenue Forecast Chart"
            subtitle="Historical solid line vs forecast dashed line vs target"
          >
            <RevenueTrendChart data={dashboardData.revenueTrend} />
          </IntelligenceChartCard>

          <div className="intel-flex-column">
            <div className="intel-card">
              <div className="intel-chart-title">Scenario Planning</div>

              <div className="intel-form-group">
                <div className="intel-report-card-top">
                  <span className="intel-kpi-sub">Conversion Rate</span>
                  <span className="intel-badge intel-badge-gold">{convRate}%</span>
                </div>

                <input
                  className="intel-range"
                  type="range"
                  min={10}
                  max={50}
                  value={convRate}
                  onChange={(event) => setConvRate(Number(event.target.value))}
                />
              </div>

              <div className="intel-form-group">
                <div className="intel-report-card-top">
                  <span className="intel-kpi-sub">Deal Velocity (days)</span>
                  <span className="intel-badge intel-badge-cyan">{velocity}d</span>
                </div>

                <input
                  className="intel-range"
                  type="range"
                  min={10}
                  max={90}
                  value={velocity}
                  onChange={(event) => setVelocity(Number(event.target.value))}
                />
              </div>

              <label className="intel-checkbox-row" htmlFor="include-risky-deals">
                <input
                  type="checkbox"
                  checked={includeRisky}
                  onChange={(event) => setIncludeRisky(event.target.checked)}
                  id="include-risky-deals"
                />
                <span className="intel-muted-label">Include high-risk deals</span>
              </label>

              <div className="intel-mini-metric intel-badge-success">
                <div className="intel-mini-metric-label">Adjusted Forecast</div>
                <div className="intel-kpi-value">
                  {baseForecast > 0 ? `₱${adjustedForecast.toLocaleString()}` : "—"}
                </div>
              </div>
            </div>

            <div className="intel-ai-panel">
              <div className="intel-ai-title">✦ AI Forecast Explanation</div>
              {dashboardData.aiInsights?.length ? (
                dashboardData.aiInsights.slice(0, 3).map((insight, index) => (
                  <div
                    key={insight.id || insight.title || index}
                    className="intel-insight-text"
                    style={{ marginBottom: 10 }}
                  >
                    <strong>{insight.title}</strong>
                    {insight.content ? ` — ${insight.content}` : ""}
                  </div>
                ))
              ) : (
                <div className="intel-insight-text">
                  No AI forecast explanation yet. Click “AI Summary” to generate
                  insights from your live pipeline and finance data.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="intel-panel">
          <div className="intel-panel-header">
            Pipeline Contribution to Forecast
          </div>

          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  {[
                    "Deal / Segment",
                    "Owner",
                    "Stage",
                    "Value",
                    "Probability",
                    "Expected Close",
                    "Weighted Revenue",
                  ].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {dashboardData.pipelineContribution.map((row, index) => {
                  const probabilityColor = getProbabilityColor(row.probability);

                  return (
                    <tr key={`${row.deal}-${index}`}>
                      <td className="intel-table-title-cell">{row.deal}</td>
                      <td>{row.owner}</td>
                      <td>
                        <span className="intel-badge">{row.stage}</span>
                      </td>
                      <td className="intel-table-money">
                        ₱{row.value.toLocaleString()}
                      </td>
                      <td>
                        <div className="intel-insight-tags">
                          <div className="intel-health-bar intel-progress-fixed">
                            <div
                              className="intel-health-fill"
                              style={{
                                width: `${row.probability}%`,
                                background: probabilityColor,
                              }}
                            />
                          </div>
                          <span>{row.probability}%</span>
                        </div>
                      </td>
                      <td>{row.close}</td>
                      <td className="intel-table-cyan">
                        ₱{row.weighted.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
