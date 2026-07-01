import {
  AlertCircle,
  BarChart3,
  DollarSign,
  Eye,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function formatShortCurrency(amount) {
  if (amount >= 1000000) return `₱${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `₱${Math.round(amount / 1000)}K`;
  return formatCurrency(amount);
}

function formatDate(date) {
  if (!date) return "No date";

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status) {
  if (status === "won") {
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (status === "lost") {
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";
}

function stageColor(stageKey) {
  const map = {
    new: "bg-[var(--brand-cyan)]",
    discovery: "bg-[var(--brand-cyan)]",
    qualified: "bg-[var(--brand-gold)]",
    proposal: "bg-[var(--brand-cyan)]",
    negotiation: "bg-yellow-500",
    won: "bg-[var(--success)]",
    lost: "bg-[var(--danger)]",
  };

  return map[stageKey] || "bg-[var(--hover-bg)]0";
}

function colorClasses(color) {
  const map = {
    blue: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    amber:
      "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    emerald:
      "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    green:
      "text-green-600 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/30",
    red: "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    purple:
      "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
  };

  return map[color] || map.blue;
}

export function buildCRMKPIs(opportunities) {
  const open = opportunities.filter((opp) => opp.status === "open");
  const won = opportunities.filter((opp) => opp.status === "won");
  const lost = opportunities.filter((opp) => opp.status === "lost");

  const openPipelineValue = open.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const weightedPipeline = open.reduce(
    (sum, opp) =>
      sum + Number(opp.revenue || 0) * (Number(opp.probability || 0) / 100),
    0
  );

  const wonRevenue = won.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const conversionRate =
    opportunities.length > 0
      ? Math.round((won.length / opportunities.length) * 100)
      : 0;

  return [
    {
      id: "total",
      label: "Total Opportunities",
      value: opportunities.length,
      change: "All opportunities",
      icon: Users,
      color: "blue",
      progress: 80,
    },
    {
      id: "open",
      label: "Open Pipeline",
      value: open.length,
      change: "Active opportunities",
      icon: Target,
      color: "amber",
      progress: 70,
    },
    {
      id: "pipeline",
      label: "Pipeline Value",
      value: formatShortCurrency(openPipelineValue),
      change: "Open expected revenue",
      icon: TrendingUp,
      color: "emerald",
      progress: 65,
    },
    {
      id: "weighted",
      label: "Weighted Forecast",
      value: formatShortCurrency(weightedPipeline),
      change: "Probability-adjusted",
      icon: BarChart3,
      color: "purple",
      progress: 60,
    },
    {
      id: "won",
      label: "Won Revenue",
      value: formatShortCurrency(wonRevenue),
      change: "Closed won value",
      icon: Trophy,
      color: "green",
      progress: 75,
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      change: `${lost.length} lost opportunities`,
      icon: DollarSign,
      color: "red",
      progress: conversionRate,
    },
  ];
}

export function CRMHeader() {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">

        <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          CRM Overview
        </h1>

        <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
          Executive snapshot of pipeline health, top opportunities, activity,
          and sales reporting.
        </p>
      </div>
    </div>
  );
}

export function CRMLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading CRM overview...
      </p>
    </div>
  );
}

export function CRMErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger)]/10 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load CRM
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function CRMEmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        No CRM opportunities yet
      </h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Create and manage opportunities from the Deals module.
      </p>
    </div>
  );
}

export function CRMKPICards({ kpis }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;

        return (
          <div
            key={kpi.id}
            className="min-w-0 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {kpi.label}
                </p>

                <h3 className="mt-4 truncate text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                  {kpi.value}
                </h3>

                <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
                  {kpi.change}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border ${colorClasses(
                  kpi.color
                )}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-[var(--hover-bg)]">
              <div
                className="h-1.5 rounded-full bg-[var(--brand-cyan)]"
                style={{ width: `${Math.min(kpi.progress, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineSnapshot({ stages, opportunities, onOpportunityClick }) {
  const openOpportunities = opportunities.filter((opp) => opp.status === "open");

  return (
    <div className="min-w-0 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-bold text-[var(--text-primary)]">
            Pipeline Snapshot
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Summary by stage. Full pipeline management belongs in Deals.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map((stage) => {
          const stageItems = openOpportunities.filter(
            (opp) => opp.stage === stage.key
          );

          const total = stageItems.reduce(
            (sum, opp) => sum + Number(opp.revenue || 0),
            0
          );

          return (
            <div
              key={stage.id || stage.key}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${stageColor(
                      stage.key
                    )}`}
                  />

                  <p className="truncate font-semibold text-[var(--text-primary)]">
                    {stage.name || labelize(stage.key)}
                  </p>

                  <span className="flex-shrink-0 rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
                    {stageItems.length}
                  </span>
                </div>

                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {formatShortCurrency(total)}
                </p>
              </div>

              {stageItems.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {stageItems.slice(0, 2).map((opp) => (
                    <button
                      key={opp.id}
                      type="button"
                      onClick={() => onOpportunityClick(opp)}
                      className="flex min-w-0 flex-col gap-1 rounded-xl bg-[var(--bg-card)] px-3 py-2 text-left text-sm hover:bg-[var(--brand-cyan)]/10 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="truncate font-medium text-[var(--text-secondary)]">
                        {opp.name}
                      </span>

                      <span className="font-semibold text-[var(--text-primary)]">
                        {formatShortCurrency(opp.revenue)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TopOpportunities({ opportunities, onOpportunityClick }) {
  return (
    <div className="min-w-0 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
      <h3 className="font-bold text-[var(--text-primary)]">
        Top Opportunities
      </h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Highest-value open opportunities.
      </p>

      <div className="mt-5 space-y-3">
        {opportunities.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-muted)]">
            No open opportunities.
          </p>
        ) : (
          opportunities.map((opp) => (
            <button
              key={opp.id}
              type="button"
              onClick={() => onOpportunityClick(opp)}
              className="w-full min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 text-left hover:bg-[var(--brand-cyan)]/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--text-primary)]">
                    {opp.name}
                  </p>

                  <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                    {opp.company}
                  </p>
                </div>

                <Eye className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="truncate font-bold text-[var(--text-primary)]">
                  {formatCurrency(opp.revenue)}
                </span>

                <span className="flex-shrink-0 text-sm font-semibold text-[var(--success)]">
                  {opp.probability}%
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function RecentActivities({ activities }) {
  return (
    <div className="min-w-0 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
      <h3 className="font-bold text-[var(--text-primary)]">
        Recent Activities
      </h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Latest CRM movements based on opportunity updates.
      </p>

      <div className="mt-5 space-y-3">
        {activities.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-muted)]">
            No recent activity.
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 truncate font-semibold text-[var(--text-primary)]">
                  {activity.title}
                </p>

                <span
                  className={`w-fit rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    activity.status
                  )}`}
                >
                  {activity.status}
                </span>
              </div>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {activity.company} · {activity.stageName}
              </p>

              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Updated {formatDate(activity.date)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ReportingSummary({ opportunities }) {
  const open = opportunities.filter((opp) => opp.status === "open");
  const won = opportunities.filter((opp) => opp.status === "won");
  const lost = opportunities.filter((opp) => opp.status === "lost");

  const totalRevenue = opportunities.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const openRevenue = open.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const weightedRevenue = open.reduce(
    (sum, opp) =>
      sum + Number(opp.revenue || 0) * (Number(opp.probability || 0) / 100),
    0
  );

  const rows = [
    ["Total Revenue Tracked", formatCurrency(totalRevenue)],
    ["Open Pipeline Revenue", formatCurrency(openRevenue)],
    ["Weighted Forecast", formatCurrency(weightedRevenue)],
    ["Won Opportunities", won.length],
    ["Lost Opportunities", lost.length],
    ["Open Opportunities", open.length],
  ];

  return (
    <div className="min-w-0 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
      <h3 className="font-bold text-[var(--text-primary)]">
        Reporting Summary
      </h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        High-level sales reporting snapshot.
      </p>

      <div className="mt-5 divide-y divide-[var(--border-color)]">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 py-3"
          >
            <span className="min-w-0 text-sm text-[var(--text-secondary)]">
              {label}
            </span>

            <span className="flex-shrink-0 text-right font-bold text-[var(--text-primary)]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OpportunityPreviewDrawer({ opportunity, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-[var(--bg-card)] p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold text-[var(--text-primary)]">
              {opportunity.name}
            </h3>

            <p className="truncate text-sm text-[var(--text-secondary)]">
              {opportunity.company}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <Info label="Contact" value={opportunity.contact} />
          <Info label="Email" value={opportunity.email || "No email"} />
          <Info label="Phone" value={opportunity.phone || "No phone"} />
          <Info label="Stage" value={opportunity.stageName} />
          <Info label="Revenue" value={formatCurrency(opportunity.revenue)} />
          <Info label="Probability" value={`${opportunity.probability}%`} />
          <Info label="Source" value={labelize(opportunity.source)} />
          <Info label="Status" value={labelize(opportunity.status)} />
          <Info
            label="Expected Close Date"
            value={formatDate(opportunity.expectedCloseDate)}
          />
          <Info
            label="Description"
            value={opportunity.description || "No description"}
          />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-[var(--text-primary)]">
        {value || "—"}
      </p>
    </div>
  );
}
