import React, { useEffect, useState } from "react";

import { getDataAnalyticsDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceChartCard, {
  RevenueTrendChart,
  DeptPerformanceChart,
} from "../../../components/admin/intelligence/IntelligenceChartCard.jsx";
import IntelligenceFilters from "../../../components/admin/intelligence/IntelligenceFilters.jsx";

const VIEWS = ["Dashboard", "Charts", "Table", "Comparison"];


const STATUS_STYLE = {
  up: {
    color: "var(--success)",
    symbol: "^",
  },
  down: {
    color: "var(--danger)",
    symbol: "v",
  },
};

const AI_SUMMARY_ITEMS = [
  {
    label: "Revenue",
    text: "Revenue grew 18.4% this period, outperforming the 15% target. Sales pipeline velocity improved by 12%.",
    color: "var(--success)",
  },
  {
    label: "Marketing",
    text: "Campaign ROAS increased to 4.8x from 3.6x. Email CTR improved 28% from A/B test optimization.",
    color: "var(--brand-cyan)",
  },
  {
    label: "Operations",
    text: "Project completion rate dropped to 73% from 81%. Task review bottleneck identified as primary cause.",
    color: "#f5a623",
  },
  {
    label: "HR",
    text: "Employee retention at 94%, above industry average. Attendance anomaly in Dept A needs attention.",
    color: "#9b59b6",
  },
  {
    label: "Legal",
    text: "Compliance score dropped 24% due to missed filings. BIR deadline is critical: 8 days remaining.",
    color: "var(--danger)",
  },
];


export default function DataAnalytics() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [view, setView] = useState("Dashboard");

  const [dashboardData, setDashboardData] = useState({
    kpis: [],
    revenueTrend: [],
    departmentPerformance: [],
  });

  const [filters, setFilters] = useState({
    dateRange: "Last 30 Days",
    department: "All Departments",
    metric: "All Metrics",
    chartType: "Line",
    comparePeriod: "vs Previous Period",
    search: "",
  });


  useEffect(() => {
    let isMounted = true;

    async function loadDataAnalyticsDashboard() {
      const data = await getDataAnalyticsDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadDataAnalyticsDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const numericDept = dashboardData.departmentPerformance.filter(
    (department) =>
      typeof department.current === "number" && department.current > 1000
  );


  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title={view === "Market Research" ? "AI Market Research" : "Data Analytics"}
        subtitle={
          view === "Market Research"
            ? "Provide details about your business and research goals. AI will generate market insights in seconds."
            : "Unified ERP analytics across sales, marketing, operations, HR, finance, and executive modules"
        }
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        showAI={view !== "Market Research"}
        showControls={view !== "Market Research"}
      />

      {view !== "Market Research" && (
        <div className="intel-filter-shell">
          <IntelligenceFilters
            filters={filters}
            onChange={setFilters}
            fields={[
              "dateRange",
              "department",
              "metric",
              "chartType",
              "comparePeriod",
              "search",
            ]}
          />
        </div>
      )}

      <div className="intel-tabs intel-view-tabs">
        {VIEWS.map((item) => (
          <button
            key={item}
            className={`intel-tab ${view === item ? "is-active" : ""}`}
            onClick={() => setView(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="intel-page-body">
        {view !== "Market Research" && (
          <div className="intel-stat-strip">
            {dashboardData.kpis.map((kpi, index) => (
              <div key={`${kpi.label}-${index}`} className="intel-kpi">
                <div
                  className="intel-scenario-accent"
                  style={{ background: kpi.color || "var(--brand-cyan)" }}
                />
                <div className="intel-kpi-label">{kpi.label}</div>
                <div
                  className="intel-kpi-value"
                  style={{ color: kpi.color || "var(--brand-cyan)" }}
                >
                  {kpi.value}
                </div>
                <div className="intel-kpi-sub">{kpi.raw}</div>
              </div>
            ))}
          </div>
        )}

        {view === "Dashboard" && (
          <div className="intel-analytics-layout">
            <div className="intel-flex-column">
              <IntelligenceChartCard
                title="Revenue Trend"
                subtitle="Monthly actual vs forecast vs target"
              >
                <RevenueTrendChart data={dashboardData.revenueTrend} />
              </IntelligenceChartCard>

              <IntelligenceChartCard
                title="Department Performance"
                subtitle="Current vs previous period"
              >
                <DeptPerformanceChart data={numericDept} />
              </IntelligenceChartCard>
            </div>

            <div className="intel-ai-panel">
              <div className="intel-row intel-mb-12">
                <span className="intel-text-cyan">AI</span>
                <div className="intel-section-title">AI Analytics Summary</div>
              </div>

              {AI_SUMMARY_ITEMS.map((item) => (
                <div key={item.label} className="intel-mb-12">
                  <div className="intel-kpi-label" style={{ color: item.color }}>
                    {item.label}
                  </div>
                  <div className="intel-insight-text">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(view === "Table" || view === "Dashboard") && (
          <div className="intel-panel">
            <div className="intel-panel-header">Analytics Drilldown</div>

            <div className="intel-table-wrap">
              <table className="intel-table">
                <thead>
                  <tr>
                    {[
                      "Department",
                      "Metric",
                      "Current Value",
                      "Previous Value",
                      "Change",
                      "Status",
                      "Owner",
                    ].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {dashboardData.departmentPerformance.map((row, index) => {
                    const statusStyle =
                      STATUS_STYLE[row.status] || STATUS_STYLE.up;

                    return (
                      <tr key={`${row.dept}-${index}`}>
                        <td className="intel-table-title-cell">{row.dept}</td>
                        <td>{row.metric}</td>
                        <td className="intel-table-money">
                          {typeof row.current === "number" && row.current > 1000
                            ? `PHP ${row.current.toLocaleString()}`
                            : row.current}
                        </td>
                        <td>
                          {typeof row.previous === "number" &&
                          row.previous > 1000
                            ? `PHP ${row.previous.toLocaleString()}`
                            : row.previous}
                        </td>
                        <td>
                          <span
                            className="intel-bold"
                            style={{ color: statusStyle.color }}
                          >
                            {statusStyle.symbol} {row.change}
                          </span>
                        </td>
                        <td>
                          <span
                            className="intel-status-dot"
                            style={{ background: statusStyle.color }}
                          />
                        </td>
                        <td>{row.owner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "Charts" && (
          <div className="intel-card-grid">
            <IntelligenceChartCard title="Revenue Trend">
              <RevenueTrendChart data={dashboardData.revenueTrend} />
            </IntelligenceChartCard>

            <IntelligenceChartCard title="Department Performance">
              <DeptPerformanceChart data={numericDept} />
            </IntelligenceChartCard>
          </div>
        )}

        {view === "Comparison" && (
          <div className="intel-empty-state">
            Comparison view is ready for future real-data benchmarking.
          </div>
        )}

      </div>
    </div>
  );
}
