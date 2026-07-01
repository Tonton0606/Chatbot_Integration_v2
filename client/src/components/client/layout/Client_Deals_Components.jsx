import { useState } from "react";
import {
  AlertCircle,
  Archive,
  BarChart3,
  BriefcaseBusiness,
  DollarSign,
  Eye,
  List,
  Search,
  Target,
  TrendingUp,
  Trophy,
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

function statusBadgeClass(status) {
  if (status === "won") {
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (status === "lost") {
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  if (status === "archived") {
    return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]";
  }

  return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";
}

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const fieldClass =
  "h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

export function ClientDealsHeader({ onAddDeal }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales &amp; CRM
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Deals Pipeline
        </h1>

        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Track and manage sales opportunities
        </p>
      </div>

      <button
        type="button"
        onClick={onAddDeal}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#050816] shadow-sm hover:bg-[var(--brand-gold-hover)] sm:w-auto"
      >
        <BriefcaseBusiness className="h-4 w-4" />
        Add Deal
      </button>
    </div>
  );
}

export function ClientDealsLoadingState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        Loading deals...
      </p>
    </div>
  );
}

export function ClientDealsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load deals
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

function dealsColorClasses(color) {
  const map = {
    gold: {
      icon: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
      bar: "bg-[var(--brand-gold)]",
    },
    cyan: {
      icon: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
      bar: "bg-[var(--brand-cyan)]",
    },
    green: {
      icon: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
      bar: "bg-[var(--success)]",
    },
    red: {
      icon: "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
      bar: "bg-[var(--danger)]",
    },
    amber: {
      icon: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      bar: "bg-amber-500",
    },
  };

  return map[color] || map.gold;
}

export function ClientDealsKPICards({ deals }) {
  const total = deals.length;
  const open = deals.filter((deal) => deal.status === "open").length;

  const pipelineValue = deals
    .filter((deal) => deal.status === "open")
    .reduce((sum, deal) => sum + Number(deal.value || 0), 0);

  const avgDealSize =
    total > 0
      ? Math.round(
          deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0) /
            total
        )
      : 0;

  const won = deals.filter((deal) => deal.status === "won").length;
  const lost = deals.filter((deal) => deal.status === "lost").length;

  const cards = [
    {
      label: "Total Deals",
      value: total,
      helper: "All deal records",
      icon: BriefcaseBusiness,
      color: "gold",
      progress: Math.min(total * 5, 100),
    },
    {
      label: "Open Deals",
      value: open,
      helper: "Active pipeline",
      icon: Target,
      color: "cyan",
      progress: total > 0 ? Math.round((open / total) * 100) : 0,
    },
    {
      label: "Pipeline Value",
      value: formatShortCurrency(pipelineValue),
      helper: "Total open value",
      icon: TrendingUp,
      color: "amber",
      progress: 60,
    },
    {
      label: "Avg Deal Size",
      value: formatShortCurrency(avgDealSize),
      helper: "Average across all",
      icon: DollarSign,
      color: "gold",
      progress: 50,
    },
    {
      label: "Closed Won",
      value: won,
      helper: "Successfully closed",
      icon: Trophy,
      color: "green",
      progress: total > 0 ? Math.round((won / total) * 100) : 0,
    },
    {
      label: "Lost Deals",
      value: lost,
      helper: "Unsuccessful deals",
      icon: X,
      color: "red",
      progress: total > 0 ? Math.round((lost / total) * 100) : 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = dealsColorClasses(card.color);

        return (
          <div key={card.label} className={`${panelClass} flex flex-col p-5`}>
            <div className="flex flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="min-h-[32px] text-xs font-bold uppercase leading-snug tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)] 2xl:text-2xl">
                  {card.value}
                </h3>

                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                  {card.helper}
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
                style={{ width: `${Math.min(card.progress, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientDealsViewTabs({ activeView, onViewChange }) {
  const tabs = [
    { key: "pipeline", label: "Pipeline", icon: Target },
    { key: "list", label: "List", icon: List },
    { key: "forecast", label: "Forecast", icon: BarChart3 },
    { key: "lost", label: "Lost Deals", icon: X },
  ];

  return (
    <div className="w-full overflow-x-auto border-b border-[var(--border-color)]">
      <div className="flex min-w-max gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onViewChange(tab.key)}
              className={
                activeView === tab.key
                  ? "flex items-center gap-2 border-b-2 border-[var(--brand-gold)] pb-3 text-sm font-semibold text-[var(--brand-gold)]"
                  : "flex items-center gap-2 pb-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClientDealsFilterToolbar({
  filters,
  onFilterChange,
  stages,
  stageLabels,
  salespersons,
  sources,
}) {
  function update(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid min-w-0 gap-3 border-b border-[var(--border-color)] py-4 xl:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(130px,160px))]">
      <div className="relative min-w-0">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
        <input
          className={`${fieldClass} pl-9`}
          placeholder="Search deals, company, contact..."
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
        />
      </div>

      <select
        className={fieldClass}
        value={filters.stage}
        onChange={(event) => update("stage", event.target.value)}
      >
        <option value="all">All Stages</option>
        {stages.map((stage) => (
          <option key={stage} value={stage}>
            {stageLabels[stage] || labelize(stage)}
          </option>
        ))}
      </select>

      <select
        className={fieldClass}
        value={filters.owner}
        onChange={(event) => update("owner", event.target.value)}
      >
        <option value="all">All Owners</option>
        {salespersons.map((person) => (
          <option key={person} value={person}>
            {person}
          </option>
        ))}
      </select>

      <select
        className={fieldClass}
        value={filters.source}
        onChange={(event) => update("source", event.target.value)}
      >
        <option value="all">All Sources</option>
        {sources.map((source) => (
          <option key={source} value={source}>
            {labelize(source)}
          </option>
        ))}
      </select>

      <select
        className={fieldClass}
        value={filters.status}
        onChange={(event) => update("status", event.target.value)}
      >
        <option value="all">All Status</option>
        <option value="open">Open</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>

      <select
        className={fieldClass}
        value={filters.sort}
        onChange={(event) => update("sort", event.target.value)}
      >
        <option value="updated_desc">Recently Updated</option>
        <option value="value_desc">Highest Value</option>
        <option value="value_asc">Lowest Value</option>
        <option value="close_date">Close Date</option>
      </select>
    </div>
  );
}

function DealStatusBadge({ status }) {
  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusBadgeClass(
        status
      )}`}
    >
      {status || "open"}
    </span>
  );
}

function DealCard({ deal, stageLabels, stageColors, onClick }) {
  const color = stageColors[deal.stage] || "var(--brand-gold)";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ background: color }}
          />

          <div className="min-w-0">
            <h4 className="line-clamp-2 text-sm font-bold leading-tight text-[var(--text-primary)]">
              {deal.title || "Untitled Deal"}
            </h4>

            <p className="mt-1 truncate text-xs font-medium text-[var(--brand-gold)]">
              {deal.company || "No company"}
            </p>

            <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
              {deal.contact_name || "No contact"}
            </p>
          </div>
        </div>

        <DealStatusBadge status={deal.status} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="whitespace-nowrap text-lg font-bold text-[var(--text-primary)]">
          {formatCurrency(deal.value)}
        </span>

        <span className="flex-shrink-0 font-bold text-[var(--success)]">
          {deal.probability || 0}%
        </span>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-[var(--hover-bg)]">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${deal.probability || 0}%`, background: color }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
        <span className="truncate">
          {stageLabels[deal.stage] || labelize(deal.stage)}
        </span>

        <span className="flex-shrink-0">
          {formatDate(deal.expected_close_date)}
        </span>
      </div>
    </button>
  );
}

export function ClientDealsPipelineBoard({
  deals,
  stages,
  stageLabels,
  stageColors,
  onCardClick,
}) {
  const handleScroll = (event) => {
    const element = event.currentTarget;
    const maxScroll = element.scrollWidth - element.clientWidth;
    if (maxScroll <= 0) return;

    const ratio = element.scrollLeft / maxScroll;

    let r;
    let g;
    let b;

    if (ratio < 0.5) {
      const localRatio = ratio * 2;
      r = Math.round(212 + (34 - 212) * localRatio);
      g = Math.round(175 + (197 - 175) * localRatio);
      b = Math.round(55 + (94 - 55) * localRatio);
    } else {
      const localRatio = (ratio - 0.5) * 2;
      r = Math.round(34 + (8 - 34) * localRatio);
      g = Math.round(197 + (145 - 197) * localRatio);
      b = Math.round(94 + (178 - 94) * localRatio);
    }

    element.style.setProperty("--scroll-thumb-color", `rgb(${r}, ${g}, ${b})`);
  };

  return (
    <div
      className="custom-scrollbar min-w-0 overflow-x-auto pb-4 transition-colors"
      onScroll={handleScroll}
      style={{ "--scroll-thumb-color": "rgb(212, 175, 55)" }}
    >
      <div className="flex w-max gap-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage === stage);
          const total = stageDeals.reduce(
            (sum, deal) => sum + Number(deal.value || 0),
            0
          );
          const color = stageColors[stage] || "var(--brand-gold)";

          return (
            <div
              key={stage}
              className="flex min-h-[420px] w-[300px] flex-shrink-0 flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: color }}
                  />

                  <h3 className="line-clamp-2 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
                    {stageLabels[stage] || labelize(stage)}
                  </h3>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-[var(--hover-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
                    {stageDeals.length}
                  </span>

                  <span className="text-[11px] font-semibold text-[var(--brand-gold)]">
                    {formatShortCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {stageDeals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-4 text-center text-sm text-[var(--text-muted)]">
                    No deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      stageLabels={stageLabels}
                      stageColors={stageColors}
                      onClick={() => onCardClick(deal)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ClientDealsListView({
  deals,
  stageLabels,
  stageColors,
  onRowClick,
}) {
  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center text-[var(--text-secondary)]">
        No deals found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Probability</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-color)]">
            {deals.map((deal) => (
              <tr key={deal.id} className="hover:bg-[var(--hover-bg)]">
                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                  {deal.title || "Untitled Deal"}
                </td>

                <td className="px-4 py-3 text-[var(--brand-gold)]">
                  {deal.company || "—"}
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {deal.contact_name || "—"}
                </td>

                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                  {formatCurrency(deal.value)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className="rounded-full border px-2 py-1 text-xs font-bold"
                    style={{
                      color: stageColors[deal.stage],
                      borderColor: stageColors[deal.stage],
                    }}
                  >
                    {stageLabels[deal.stage] || labelize(deal.stage)}
                  </span>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {deal.probability || 0}%
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {deal.owner || "—"}
                </td>

                <td className="px-4 py-3">
                  <DealStatusBadge status={deal.status} />
                </td>

                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onRowClick(deal)}
                    className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClientDealsForecastView({
  deals,
  stages,
  stageLabels,
  stageColors,
}) {
  const byStage = stages.map((stage) => {
    const stageDeals = deals.filter(
      (deal) => deal.stage === stage && deal.status === "open"
    );

    const total = stageDeals.reduce(
      (sum, deal) => sum + Number(deal.value || 0),
      0
    );

    const weighted = stageDeals.reduce(
      (sum, deal) =>
        sum + Number(deal.value || 0) * (Number(deal.probability || 0) / 100),
      0
    );

    return { stage, total, weighted, count: stageDeals.length };
  });

  const maxValue = Math.max(...byStage.map((row) => row.total), 1);

  return (
    <div className={`${panelClass} p-4 sm:p-6`}>
      <h3 className="font-bold text-[var(--text-primary)]">
        Revenue Forecast by Stage
      </h3>

      <div className="mt-5 space-y-4">
        {byStage.map((row) => {
          const color = stageColors[row.stage] || "var(--brand-gold)";

          return (
            <div
              key={row.stage}
              className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_100px_120px_70px] md:items-center"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {stageLabels[row.stage] || labelize(row.stage)}
              </span>

              <div className="h-3 rounded-full bg-[var(--hover-bg)]">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${(row.total / maxValue) * 100}%`,
                    background: color,
                  }}
                />
              </div>

              <span className="text-sm font-bold text-[var(--text-primary)]">
                {formatShortCurrency(row.total)}
              </span>

              <span className="text-xs text-[var(--text-secondary)]">
                Weighted: {formatShortCurrency(row.weighted)}
              </span>

              <span className="text-xs text-[var(--text-secondary)]">
                {row.count} deals
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ClientDealsLostView({
  deals,
  stageLabels,
  stageColors,
  onRowClick,
}) {
  const lostDeals = deals.filter((deal) => deal.status === "lost");

  return (
    <ClientDealsListView
      deals={lostDeals}
      stageLabels={stageLabels}
      stageColors={stageColors}
      onRowClick={onRowClick}
    />
  );
}

function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--text-muted)]">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold capitalize text-[var(--brand-gold)]">
              {activity.type}
            </span>

            <span className="text-xs text-[var(--text-muted)]">
              {formatDate(activity.date)}
            </span>
          </div>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {activity.note}
          </p>

          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {activity.user}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ClientDealDetailDrawer({
  deal,
  stageLabels,
  stageColors,
  rawStages = [],
  onClose,
  onEdit,
  onArchive,
  onStageChange,
  onMarkWon,
  onMarkLost,
}) {
  const [tab, setTab] = useState("overview");
  const color = stageColors[deal.stage] || "var(--brand-gold)";

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
                className="mt-2 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ background: color }}
              />

              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-[var(--text-primary)]">
                  {deal.title || "Untitled Deal"}
                </h3>

                <p className="mt-1 truncate text-sm text-[var(--brand-gold)]">
                  {deal.company || "No company"}
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
            {rawStages.length > 0
              ? rawStages.map((stage) => (
                  <button
                    key={stage.id || stage.key}
                    type="button"
                    onClick={() => onStageChange?.(deal, stage.key)}
                    className="rounded-lg border px-3 py-1 text-xs font-semibold transition hover:bg-[var(--bg-card)]"
                    style={{
                      borderColor:
                        stage.key === deal.stage
                          ? stageColors[stage.key]
                          : "var(--border-color)",
                      color:
                        stage.key === deal.stage
                          ? stageColors[stage.key]
                          : "var(--text-secondary)",
                      background:
                        stage.key === deal.stage
                          ? `${stageColors[stage.key]}15`
                          : "transparent",
                    }}
                  >
                    {stage.name}
                  </button>
                ))
              : Object.entries(stageLabels).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onStageChange?.(deal, key)}
                    className="rounded-lg border px-3 py-1 text-xs font-semibold transition hover:bg-[var(--bg-card)]"
                    style={{
                      borderColor:
                        key === deal.stage
                          ? stageColors[key]
                          : "var(--border-color)",
                      color:
                        key === deal.stage
                          ? stageColors[key]
                          : "var(--text-secondary)",
                      background:
                        key === deal.stage
                          ? `${stageColors[key]}15`
                          : "transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-[var(--border-color)]">
          {["overview", "activity", "notes"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={
                tab === item
                  ? "border-b-2 border-[var(--brand-gold)] px-5 py-3 text-sm font-semibold capitalize text-[var(--brand-gold)]"
                  : "px-5 py-3 text-sm font-medium capitalize text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === "overview" && (
            <div className="space-y-4 text-sm">
              <Info label="Company" value={deal.company} />
              <Info label="Contact" value={deal.contact_name} />
              <Info label="Email" value={deal.email} />
              <Info label="Phone" value={deal.phone} />
              <Info label="Stage" value={stageLabels[deal.stage] || deal.stage} />
              <Info label="Value" value={formatCurrency(deal.value)} />
              <Info label="Probability" value={`${deal.probability || 0}%`} />
              <Info label="Owner" value={deal.owner} />
              <Info
                label="Assignment Type"
                value={labelize(deal.assignment_type)}
              />
              <Info label="Source" value={labelize(deal.source)} />
              <Info
                label="Expected Close"
                value={formatDate(deal.expected_close_date)}
              />
              <Info label="Description" value={deal.description || "—"} />
            </div>
          )}

          {tab === "activity" && <ActivityTimeline activities={deal.activities} />}

          {tab === "notes" && (
            <textarea
              readOnly
              value={deal.description || ""}
              className="min-h-32 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm text-[var(--text-primary)] outline-none"
              placeholder="No notes yet."
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={() => onEdit?.(deal)}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--hover-bg)]"
          >
            Edit
          </button>

          {deal.status !== "won" && (
            <button
              type="button"
              onClick={() => onMarkWon?.(deal)}
              className="rounded-2xl border border-green-500/20 bg-[var(--success-soft)] px-4 py-2 text-sm font-semibold text-[var(--success)] transition hover:opacity-80"
            >
              Mark Won
            </button>
          )}

          {deal.status !== "lost" && (
            <button
              type="button"
              onClick={() => onMarkLost?.(deal)}
              className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:opacity-80"
            >
              Mark Lost
            </button>
          )}

          <button
            type="button"
            onClick={() => onArchive?.(deal)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
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
