import {
  AlertCircle,
  BarChart3,
  Brain,
  Eye,
  Mail,
  Sparkles,
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

function stageDotClass(stageKey) {
  const map = {
    new: "bg-[var(--brand-cyan)]",
    qualified: "bg-[var(--brand-gold)]",
    proposal: "bg-[var(--brand-cyan)]",
    negotiation: "bg-orange-500",
    won: "bg-[var(--success)]",
    lost: "bg-[var(--danger)]",
  };

  return map[stageKey] || "bg-[var(--hover-bg)]";
}

function colorClasses(color) {
  const map = {
    blue: {
      icon: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
      bar: "bg-[var(--brand-cyan)]",
    },
    amber: {
      icon: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      bar: "bg-amber-500",
    },
    green: {
      icon: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
      bar: "bg-[var(--success)]",
    },
    gold: {
      icon: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
      bar: "bg-[var(--brand-gold)]",
    },
  };

  return map[color] || map.blue;
}

export function buildClientCRMKPIs(opportunities, context = {}) {
  const activeOpportunities = opportunities.filter((opp) => !opp.archived_at);
  const contacts = (context.contacts || []).filter((item) => !item.archived_at);
  const leads = (context.leads || []).filter((item) => !item.archived_at);

  const open = activeOpportunities.filter((opp) => opp.status === "open");
  const won = activeOpportunities.filter((opp) => opp.status === "won");

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
    activeOpportunities.length > 0
      ? Math.round((won.length / activeOpportunities.length) * 100)
      : 0;

  return [
    {
      id: "contacts",
      label: "Contacts",
      value: contacts.length,
      change: "Active workspace contacts",
      icon: Users,
      color: "blue",
      progress: Math.min(contacts.length * 10, 100),
    },
    {
      id: "leads",
      label: "Leads",
      value: leads.length,
      change: "Active workspace leads",
      icon: Target,
      color: "gold",
      progress: Math.min(leads.length * 10, 100),
    },
    {
      id: "pipeline",
      label: "Pipeline Value",
      value: formatShortCurrency(openPipelineValue),
      change: "Open expected revenue",
      icon: TrendingUp,
      color: "gold",
      progress: 65,
    },
    {
      id: "weighted",
      label: "Weighted Forecast",
      value: formatShortCurrency(weightedPipeline),
      change: "Probability-adjusted",
      icon: BarChart3,
      color: "blue",
      progress: 60,
    },
    {
      id: "won",
      label: "Won Revenue",
      value: formatShortCurrency(wonRevenue),
      change: `${won.length} deals won`,
      icon: Trophy,
      color: "gold",
      progress: conversionRate,
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      change: "Closed won ratio",
      icon: Target,
      color: "green",
      progress: conversionRate,
    },
  ];
}

export function ClientCRMHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales &amp; CRM
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          CRM Overview
        </h1>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Workspace snapshot of pipeline health, top deals, activity, and sales
          reporting.
        </p>
      </div>
    </div>
  );
}

export function ClientCRMAIPanel() {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] shadow-lg">
      <div
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--brand-cyan)] via-[var(--brand-gold)] to-[var(--brand-cyan)] bg-[length:200%_100%]"
        style={{ animation: "gradientShift 3s linear infinite" }}
      />

      <div
        className="relative overflow-hidden px-5 py-4"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))",
        }}
      >
        <div
          className="ai-blob-1 absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, var(--brand-gold), transparent)",
          }}
        />
        <div
          className="ai-blob-2 absolute -bottom-4 left-1/3 h-16 w-16 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, var(--brand-cyan), transparent)",
          }}
        />
        <div
          className="ai-blob-3 absolute -bottom-5 left-0 h-20 w-20 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, var(--brand-gold), transparent)",
          }}
        />
        <div
          className="ai-blob-4 absolute -top-4 left-1/4 h-14 w-14 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, var(--brand-cyan), transparent)",
          }}
        />
        <div
          className="ai-blob-5 absolute top-1/2 right-1/4 h-10 w-10 -translate-y-1/2 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, var(--brand-gold), var(--brand-cyan), transparent)",
          }}
        />
        <div
          className="ai-blob-6 absolute -top-2 right-1/3 h-12 w-12 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, var(--brand-cyan), transparent)",
          }}
        />
        <div
          className="ai-blob-7 absolute top-1/2 left-8 h-8 w-8 -translate-y-1/2 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, var(--brand-gold), transparent)",
          }}
        />
        <div
          className="ai-blob-8 absolute -bottom-3 right-8 h-14 w-14 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, var(--brand-cyan), var(--brand-gold), transparent)",
          }}
        />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-cyan), var(--brand-gold))",
              }}
            >
              <Brain
                className="h-5 w-5 animate-pulse text-white"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))",
                }}
              />
            </div>

            <div>
              <h2
                className="text-base font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                AI Sales Intelligence
              </h2>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: "var(--brand-cyan)" }}
                  />
                  <span
                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--brand-cyan)" }}
                  />
                </span>

                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Powered by advanced machine learning
                </p>
              </div>
            </div>
          </div>

          <div
            className="hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold sm:flex"
            style={{
              borderColor: "var(--brand-gold-border)",
              background: "var(--brand-gold-soft)",
              color: "var(--brand-gold)",
            }}
          >
            <Sparkles className="h-3 w-3" />
            AI Ready
          </div>
        </div>
      </div>

      <div
        className="border-b px-5 py-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: "var(--brand-cyan-border)",
              background: "var(--brand-cyan-soft)",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "rgba(8,145,178,0.18)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "var(--brand-cyan-soft)";
            }}
          >
            <Sparkles
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110"
              style={{ color: "var(--brand-cyan)" }}
            />
            <span
              className="font-semibold"
              style={{ color: "var(--brand-cyan)" }}
            >
              Generate Insights
            </span>
          </button>

          <button
            type="button"
            className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: "var(--brand-gold-border)",
              background: "var(--brand-gold-soft)",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "rgba(201,168,76,0.2)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "var(--brand-gold-soft)";
            }}
          >
            <Target
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110"
              style={{ color: "var(--brand-gold)" }}
            />
            <span
              className="font-semibold"
              style={{ color: "var(--brand-gold)" }}
            >
              Predict &amp; Score
            </span>
          </button>

          <button
            type="button"
            className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: "var(--border-color)",
              background: "var(--hover-bg)",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor =
                "var(--brand-gold-border)";
              event.currentTarget.style.background = "var(--brand-gold-soft)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "var(--border-color)";
              event.currentTarget.style.background = "var(--hover-bg)";
            }}
          >
            <Mail
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110"
              style={{ color: "var(--text-secondary)" }}
            />
            <span
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Draft AI Email
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))",
            border: "1px solid var(--brand-gold-border)",
          }}
        >
          <Brain
            className="h-5 w-5 animate-pulse"
            style={{ color: "var(--brand-gold)" }}
          />
        </div>

        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Ready to Analyze
          </p>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Use the actions above to generate insights, score leads, or draft
            outreach emails.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ClientCRMLoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        Loading CRM overview...
      </p>
    </div>
  );
}

export function ClientCRMErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load CRM
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

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

export function ClientCRMEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        No CRM data yet
      </h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Add contacts, leads, or deals to start building your workspace CRM.
      </p>
    </div>
  );
}

export function ClientCRMKPICards({ kpis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const colors = colorClasses(kpi.color);

        return (
          <div
            key={kpi.id}
            className="flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="min-h-[32px] text-xs font-bold uppercase leading-snug tracking-wider text-[var(--text-muted)]">
                  {kpi.label}
                </p>

                <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)] 2xl:text-2xl">
                  {kpi.value}
                </h3>

                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                  {kpi.change}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors.icon}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 h-1 w-full rounded-full bg-[var(--hover-bg)]">
              <div
                className={`h-1 rounded-full ${colors.bar}`}
                style={{
                  width: `${Math.min(kpi.progress, 100)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientPipelineSnapshot({
  stages,
  opportunities,
  onOpportunityClick,
}) {
  const openOpportunities = opportunities.filter(
    (opp) => opp.status === "open" && !opp.archived_at
  );

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
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
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${stageDotClass(
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
                  {stageItems.slice(0, 3).map((opp) => (
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

export function ClientTopOpportunities({ opportunities, onOpportunityClick }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
      <h3 className="font-bold text-[var(--text-primary)]">Top Deals</h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Highest-value open workspace deals.
      </p>

      <div className="mt-5 space-y-3">
        {opportunities.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-muted)]">
            No open deals.
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

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    opp.status
                  )}`}
                >
                  {opp.status}
                </span>

                <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                  {opp.stageName}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function ClientRecentActivities({ activities }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
      <h3 className="font-bold text-[var(--text-primary)]">
        Recent Activities
      </h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Latest CRM movements based on workspace deal updates.
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

export function ClientReportingSummary({ opportunities }) {
  const activeOpportunities = opportunities.filter((opp) => !opp.archived_at);

  const open = activeOpportunities.filter((opp) => opp.status === "open");
  const won = activeOpportunities.filter((opp) => opp.status === "won");
  const lost = activeOpportunities.filter((opp) => opp.status === "lost");

  const totalRevenue = activeOpportunities.reduce(
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
    ["Won Deals", won.length],
    ["Lost Deals", lost.length],
    ["Open Deals", open.length],
  ];

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
      <h3 className="font-bold text-[var(--text-primary)]">
        Reporting Summary
      </h3>

      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        High-level workspace sales reporting snapshot.
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

export function ClientOpportunityPreviewDrawer({ opportunity, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span
                className={`mt-2 h-3 w-3 flex-shrink-0 rounded-full ${stageDotClass(
                  opportunity.stage
                )}`}
              />

              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-[var(--text-primary)]">
                  {opportunity.name}
                </h3>

                <p className="mt-1 truncate text-sm text-[var(--brand-gold)]">
                  {opportunity.company}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                opportunity.status
              )}`}
            >
              {opportunity.status}
            </span>

            <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              {opportunity.stageName}
            </span>

            <span className="rounded-full border border-green-500/20 bg-[var(--success-soft)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
              {opportunity.probability}% probability
            </span>
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-[var(--border-color)]">
          {["overview", "activity", "notes"].map((item) => (
            <button
              key={item}
              type="button"
              className={
                item === "overview"
                  ? "border-b-2 border-[var(--brand-gold)] px-5 py-3 text-sm font-semibold capitalize text-[var(--brand-gold)]"
                  : "px-5 py-3 text-sm font-medium capitalize text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="space-y-4 text-sm">
            <Info label="Contact" value={opportunity.contact} />
            <Info label="Email" value={opportunity.email || "No email"} />
            <Info label="Phone" value={opportunity.phone || "No phone"} />
            <Info label="Stage" value={opportunity.stageName} />
            <Info label="Revenue" value={formatCurrency(opportunity.revenue)} />
            <Info label="Probability" value={`${opportunity.probability}%`} />
            <Info label="Owner" value={opportunity.owner || "Unassigned"} />
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
