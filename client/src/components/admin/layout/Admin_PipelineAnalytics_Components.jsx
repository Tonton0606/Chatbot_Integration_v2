import {
  AlertTriangle,
  BarChart3,
  Download,
  Filter,
  Gauge,
  LineChart,
  RefreshCw,
  Route,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import {
  PIPELINE_ANALYTICS_OWNERS,
  PIPELINE_ANALYTICS_SOURCES,
  PIPELINE_DATE_RANGES,
  formatCurrency,
  formatShortCurrency,
} from "../../../services/sales_crm/pipeline_analytics";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const iconBoxClass =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "funnel", label: "Funnel", icon: Route },
  { id: "stages", label: "Stages", icon: Filter },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
  { id: "sources", label: "Sources", icon: LineChart },
];

export function PipelineAnalyticsHeader({ filters, onChange }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales & CRM
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Pipeline Analytics
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Funnel health, conversion analysis, forecasting, and sales velocity.
        </p>
      </div>

      <div className="grid w-full gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm lg:w-auto lg:min-w-[620px] lg:grid-cols-[1fr_1fr_1fr_auto]">
        <select
          value={filters.dateRange}
          onChange={(event) => onChange("dateRange", event.target.value)}
          className="input-base h-10 rounded-xl"
        >
          {PIPELINE_DATE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>

        <select
          value={filters.owner}
          onChange={(event) => onChange("owner", event.target.value)}
          className="input-base h-10 rounded-xl"
        >
          <option value="all">All Owners</option>

          {PIPELINE_ANALYTICS_OWNERS.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>

        <select
          value={filters.source}
          onChange={(event) => onChange("source", event.target.value)}
          className="input-base h-10 rounded-xl"
        >
          <option value="all">All Sources</option>

          {PIPELINE_ANALYTICS_SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </button>
      </div>
    </div>
  );
}

export function PipelineAnalyticsTabs({ section, setSection }) {
  return (
    <div className={`${panelClass} p-2`}>
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold transition ${
                section === item.id
                  ? "border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PipelineKPICards({ kpis }) {
  const cards = [
    {
      label: "Pipeline Value",
      value: formatShortCurrency(kpis.total_pipeline_value),
      helper: "Total active pipeline",
      icon: Gauge,
      tone: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
    {
      label: "Weighted Forecast",
      value: formatShortCurrency(kpis.weighted_forecast),
      helper: "Probability-adjusted value",
      icon: BarChart3,
      tone: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
    {
      label: "Conversion Rate",
      value: `${kpis.conversion_rate}%`,
      helper: "Lead-to-won conversion",
      icon: Target,
      tone: "text-[var(--success)]",
      bar: "bg-[var(--success)]",
    },
    {
      label: "Sales Velocity",
      value: `${kpis.sales_velocity_days} days`,
      helper: "Average sales cycle",
      icon: Zap,
      tone: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
    {
      label: "Avg Stage Time",
      value: `${kpis.average_time_in_stage_days} days`,
      helper: "Open-stage aging",
      icon: LineChart,
      tone: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
    {
      label: "Win Rate",
      value: `${kpis.win_rate}%`,
      helper: "Closed won performance",
      icon: Trophy,
      tone: "text-[var(--success)]",
      bar: "bg-[var(--success)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.label} className={`${panelClass} p-4`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className={`mt-3 truncate text-2xl font-bold ${card.tone}`}>
                  {card.value}
                </h3>

                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                  {card.helper}
                </p>
              </div>

              <div className={iconBoxClass}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 h-1 rounded-full bg-[var(--hover-bg)]">
              <div className={`h-1 w-3/5 rounded-full ${card.bar}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineOverviewSection({
  funnelData,
  sourceAnalytics,
  forecasting,
  insights,
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <FunnelChart data={funnelData} />
        <SourceAnalyticsTable data={sourceAnalytics} />
      </div>

      <div className="space-y-4">
        <ForecastingPanel data={forecasting} />
        <AIPipelineInsights insights={insights} />
      </div>
    </div>
  );
}

export function PipelineFunnelSection({ funnelData, stagePerformance }) {
  return (
    <div className="space-y-4">
      <FunnelChart data={funnelData} />
      <StagePerformanceTable data={stagePerformance} />
    </div>
  );
}

export function PipelineStagesSection({ stagePerformance }) {
  return <StagePerformanceTable data={stagePerformance} />;
}

export function PipelineForecastSection({ forecasting }) {
  return (
    <div className="max-w-5xl">
      <ForecastingPanel data={forecasting} />
    </div>
  );
}

export function PipelineSourcesSection({ sourceAnalytics, insights }) {
  const sourceInsights = insights.filter((item) => item.type === "info");

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SourceAnalyticsTable data={sourceAnalytics} />
      <AIPipelineInsights insights={sourceInsights} />
    </div>
  );
}

function FunnelChart({ data = [] }) {
  const max = Math.max(...data.map((item) => Number(item.count || 0)), 1);

  return (
    <div className={`${panelClass} p-5`}>
      <SectionTitle
        title="Pipeline Funnel"
        subtitle="Stage-by-stage movement and value concentration."
      />

      <div className="space-y-4">
        {data.map((item) => {
          const width = Math.max((Number(item.count || 0) / max) * 100, 8);

          return (
            <div key={item.id || item.stage}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {item.stage}
                  </p>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    {item.count} records
                  </p>
                </div>

                <p className="flex-shrink-0 text-sm font-bold text-[var(--brand-gold)]">
                  {formatCurrency(item.value)}
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--brand-gold)]"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <p className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
            No funnel data yet.
          </p>
        )}
      </div>
    </div>
  );
}

function StagePerformanceTable({ data = [] }) {
  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-[var(--border-color)] px-5 py-3">
        <SectionTitle
          title="Stage Performance"
          subtitle="Conversion, weighted value, and drop-off by stage."
          noBorder
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              {[
                "Stage",
                "Deals",
                "Total Value",
                "Weighted Value",
                "Conversion",
                "Avg Days",
                "Drop-off",
              ].map((header) => (
                <th
                  key={header}
                  className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((item) => (
              <tr
                key={item.id || item.stage}
                className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--hover-bg)]"
              >
                <td className="px-5 py-3 font-semibold text-[var(--text-primary)]">
                  {item.stage}
                </td>

                <td className="px-5 py-3">
                  <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
                    {item.deals_count}
                  </span>
                </td>

                <td className="px-5 py-3 font-semibold text-[var(--brand-gold)]">
                  {formatCurrency(item.total_value)}
                </td>

                <td className="px-5 py-3 font-semibold text-[var(--brand-gold)]">
                  {formatCurrency(item.weighted_value)}
                </td>

                <td className="px-5 py-3">
                  <MetricBar value={item.conversion_rate} goodAt={70} />
                </td>

                <td className="px-5 py-3 font-medium text-[var(--text-secondary)]">
                  {item.average_days}d
                </td>

                <td className="px-5 py-3">
                  <span
                    className={`font-semibold ${
                      item.drop_off_rate >= 40
                        ? "text-[var(--danger)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {item.drop_off_rate}%
                  </span>
                </td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  No stage performance data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ForecastingPanel({ data }) {
  if (!data) return null;

  const forecastCards = [
    {
      label: "Best Case",
      value: data.best_case,
      tone: "text-[var(--success)]",
      description: "Optimistic forecast",
    },
    {
      label: "Commit",
      value: data.commit,
      tone: "text-[var(--brand-gold)]",
      description: "Likely committed revenue",
    },
    {
      label: "Weighted",
      value: data.weighted,
      tone: "text-[var(--brand-gold)]",
      description: "Probability-adjusted forecast",
    },
  ];

  return (
    <div className={`${panelClass} p-5`}>
      <SectionTitle
        title="Revenue Forecast"
        subtitle="Open-pipeline forecast and at-risk deals."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {forecastCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3"
          >
            <p className={`text-2xl font-bold ${card.tone}`}>
              {formatShortCurrency(card.value)}
            </p>

            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {card.label}
            </p>

            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
        At-Risk Deals
      </div>

      <div className="space-y-3">
        {data.at_risk_deals?.length > 0 ? (
          data.at_risk_deals.map((deal) => (
            <div
              key={deal.id}
              className="rounded-xl border border-red-500/20 bg-[var(--danger-soft)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {deal.deal_name}
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {deal.customer_name} · {deal.stage}
                  </p>
                </div>

                <p className="flex-shrink-0 font-bold text-[var(--brand-gold)]">
                  {formatCurrency(deal.value)}
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-1 text-xs text-[var(--danger)] sm:flex-row sm:items-center sm:justify-between">
                <span>{deal.risk_reason}</span>
                <span>{deal.confidence}% confidence</span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
            No open deals currently match the at-risk threshold.
          </p>
        )}
      </div>
    </div>
  );
}

function SourceAnalyticsTable({ data = [] }) {
  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-[var(--border-color)] px-5 py-3">
        <SectionTitle
          title="Source Analytics"
          subtitle="Lead source quality, conversion, and average deal value."
          noBorder
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              {["Source", "Leads", "Converted", "Win Rate", "Avg Deal Value"].map(
                (header) => (
                  <th
                    key={header}
                    className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {data.map((item) => (
              <tr
                key={item.id || item.source}
                className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--hover-bg)]"
              >
                <td className="px-5 py-3 font-semibold text-[var(--text-primary)]">
                  {item.source}
                </td>

                <td className="px-5 py-3 text-[var(--text-secondary)]">
                  {item.leads_count}
                </td>

                <td className="px-5 py-3 font-semibold text-[var(--success)]">
                  {item.converted_count}
                </td>

                <td className="px-5 py-3">
                  <MetricBar value={item.win_rate} goodAt={40} />
                </td>

                <td className="px-5 py-3 font-semibold text-[var(--brand-gold)]">
                  {formatCurrency(item.average_value)}
                </td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  No source analytics yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AIPipelineInsights({ insights = [] }) {
  const toneClass = {
    risk: "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    warning:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    info: "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-primary)]",
  };

  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-[var(--border-color)] px-5 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-[var(--text-primary)]">
            AI Pipeline Intelligence
          </h3>

          <p className="text-xs text-[var(--text-muted)]">
            Requires sales review before action
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-xl border p-3 ${
              toneClass[insight.type] || toneClass.info
            }`}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <h4 className="font-semibold">{insight.title}</h4>

              <span className="text-xs text-[var(--text-muted)]">
                {insight.confidence}% confidence
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {insight.description}
            </p>
          </div>
        ))}

        {insights.length === 0 && (
          <p className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
            No pipeline insights available yet.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, noBorder = false }) {
  return (
    <div
      className={
        noBorder ? "" : "mb-4 border-b border-[var(--border-color)] pb-3"
      }
    >
      <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>

      {subtitle && (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      )}
    </div>
  );
}

function MetricBar({ value = 0, goodAt }) {
  const safeValue = Math.max(0, Math.min(Number(value || 0), 100));
  const isGood = safeValue >= goodAt;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--hover-bg)]">
        <div
          className={`h-full rounded-full ${
            isGood ? "bg-[var(--success)]" : "bg-[var(--brand-gold)]"
          }`}
          style={{ width: `${safeValue}%` }}
        />
      </div>

      <span
        className={`text-sm font-semibold ${
          isGood ? "text-[var(--success)]" : "text-[var(--brand-gold)]"
        }`}
      >
        {value}%
      </span>
    </div>
  );
}

export function PipelineAnalyticsLoadingState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading pipeline analytics...
      </p>
    </div>
  );
}

export function PipelineAnalyticsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load pipeline analytics
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
