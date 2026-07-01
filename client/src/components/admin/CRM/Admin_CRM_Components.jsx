import { useState } from "react";
import {
  AlertCircle,
  Brain,
  Building2,
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
  Target,
  TrendingUp,
  UserRound,
  X,
  Briefcase,
  DollarSign,
  Activity,
  BarChart3,
  Sparkles,
} from "lucide-react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount || 0);
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

function opportunityStatusClass(status) {
  if (status === "won") return "bg-[var(--success-soft)] text-[var(--success)] border-green-500/20";
  if (status === "lost") return "bg-[var(--danger-soft)] text-[var(--danger)] border-red-500/20";
  if (status === "open") return "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]";
  return "bg-[var(--hover-bg)] text-[var(--text-secondary)] border-[var(--border-color)]";
}

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const iconBoxClass =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

const primaryButtonClass =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#050816] shadow-sm transition hover:bg-[var(--brand-gold-hover)]";

const secondaryButtonClass =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]";

function Avatar({ name, size = "h-9 w-9" }) {
  const initials = String(name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-gold)] text-xs font-bold text-white`}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${opportunityStatusClass(status)}`}>
      {labelize(status)}
    </span>
  );
}

/* =========================================================
   HEADER
   ========================================================= */
export function CRMHeader({ onAddOpportunity }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales &amp; CRM
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">CRM Overview</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Executive snapshot of pipeline health, top opportunities, activity, and sales reporting.
        </p>
      </div>

      <button type="button" onClick={onAddOpportunity} className={primaryButtonClass}>
        <Plus className="h-4 w-4" />
        Add Opportunity
      </button>
    </div>
  );
}

/* =========================================================
   STATES
   ========================================================= */
export function CRMLoadingState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <div className="crm-loading-spinner mx-auto" />
      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">Loading CRM data...</p>
    </div>
  );
}

export function CRMErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">Failed to load CRM data</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
          <button type="button" onClick={onRetry} className="mt-4 rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function CRMEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <Briefcase className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No opportunities yet</h3>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Add your first opportunity to start tracking deals.</p>
    </div>
  );
}

/* =========================================================
   KPI CARDS
   ========================================================= */
export function CRMKPICards({ opportunities }) {
  const total = opportunities.length;
  const open = opportunities.filter((o) => o.status === "open").length;
  const won = opportunities.filter((o) => o.status === "won").length;
  const lost = opportunities.filter((o) => o.status === "lost").length;
  const totalRevenue = opportunities.reduce((sum, o) => sum + (o.revenue || 0), 0);
  const weightedForecast = opportunities
    .filter((o) => o.status === "open")
    .reduce((sum, o) => sum + (o.revenue || 0) * ((o.probability || 0) / 100), 0);

  const cards = [
    { label: "Total Opportunities", value: total, helper: "All deal records", icon: Briefcase, tone: "text-[var(--brand-gold)]" },
    { label: "Open Deals", value: open, helper: "Active in pipeline", icon: Target, tone: "text-[var(--brand-cyan)]" },
    { label: "Closed Won", value: won, helper: "Successfully closed", icon: TrendingUp, tone: "text-[var(--success)]" },
    { label: "Closed Lost", value: lost, helper: "Lost deals", icon: AlertCircle, tone: "text-[var(--danger)]" },
    { label: "Total Revenue", value: formatCurrency(totalRevenue), helper: "Combined deal value", icon: DollarSign, tone: "text-[var(--brand-gold)]" },
    { label: "Weighted Forecast", value: formatCurrency(weightedForecast), helper: "Probability-adjusted", icon: BarChart3, tone: "text-[var(--success)]" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`${panelClass} flex flex-col p-5`}>
            <div className="flex flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="min-h-[32px] text-xs font-bold uppercase leading-snug tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>
                <h3 className={`mt-2 truncate text-2xl font-bold ${card.tone}`}>{card.value}</h3>
                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{card.helper}</p>
              </div>
              <div className={iconBoxClass}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 h-1 w-full rounded-full bg-[var(--hover-bg)]">
              <div className="h-1 w-3/5 rounded-full bg-[var(--brand-gold)]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   FILTER TOOLBAR
   ========================================================= */
export function CRMFilterToolbar({ filters, onFilterChange, stages, sources }) {
  function update(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  const selectClass =
    "h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 xl:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
        <input
          className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          placeholder="Search opportunities, company, contact..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>

      <select className={selectClass} value={filters.stage} onChange={(e) => update("stage", e.target.value)}>
        <option value="all">All Stages</option>
        {stages.map((stage) => (
          <option key={stage.key} value={stage.key}>{stage.name}</option>
        ))}
      </select>

      <select className={selectClass} value={filters.status} onChange={(e) => update("status", e.target.value)}>
        <option value="all">All Status</option>
        <option value="open">Open</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>

      <select className={selectClass} value={filters.source} onChange={(e) => update("source", e.target.value)}>
        <option value="all">All Sources</option>
        {sources.map((source) => (
          <option key={source} value={source}>{labelize(source)}</option>
        ))}
      </select>

      <select className={selectClass} value={filters.sort} onChange={(e) => update("sort", e.target.value)}>
        <option value="revenue_desc">Revenue High-Low</option>
        <option value="revenue_asc">Revenue Low-High</option>
        <option value="probability_desc">Probability High-Low</option>
        <option value="recent">Recently Updated</option>
        <option value="close_date">Close Date</option>
      </select>
    </div>
  );
}

/* =========================================================
   OPPORTUNITIES TABLE
   ========================================================= */
export function CRMOpportunitiesTable({ opportunities, onRowClick }) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
        <Briefcase className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No opportunities found</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Adjust your filters or add a new opportunity.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Opportunity</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">Probability</th>
            <th className="px-4 py-3">Close Date</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {opportunities.map((opp) => (
            <tr key={opp.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3">
                <button type="button" onClick={() => onRowClick(opp)} className="flex items-center gap-3 text-left">
                  <Avatar name={opp.name} />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{opp.name || "Untitled"}</p>
                    <p className="text-xs text-[var(--brand-cyan)]">{opp.email || "No email"}</p>
                  </div>
                </button>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{opp.company || "—"}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{opp.contact || "—"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-cyan)]">
                  {opp.stageName}
                </span>
              </td>
              <td className="px-4 py-3"><StatusBadge status={opp.status} /></td>
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{formatCurrency(opp.revenue)}</td>
              <td className="px-4 py-3">
                <span className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  {opp.probability}%
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(opp.expectedCloseDate)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onRowClick(opp)}
                    className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   PIPELINE SNAPSHOT
   ========================================================= */
export function CRMPipelineSnapshot({ stages, opportunities, onOpportunityClick }) {
  const stageMap = {};
  stages.forEach((s) => {
    stageMap[s.key] = { ...s, items: [], total: 0 };
  });

  opportunities.forEach((opp) => {
    const stage = stageMap[opp.stage];
    if (stage) {
      stage.items.push(opp);
      stage.total += opp.revenue || 0;
    }
  });

  const orderedStages = stages.map((s) => stageMap[s.key]).filter(Boolean);

  return (
    <div className={`${panelClass} p-5`}>
      <div className="crm-card-header">
        <h3 className="crm-card-title">Pipeline Snapshot</h3>
        <p className="crm-card-subtitle">Deals by stage</p>
      </div>

      <div className="crm-pipeline-list">
        {orderedStages.map((stage) => (
          <div key={stage.key} className="crm-pipeline-stage">
            <div className="crm-pipeline-stage-header">
              <div className="crm-pipeline-stage-meta">
                <div
                  className="crm-pipeline-dot"
                  style={{ background: stage.probability >= 80 ? "var(--success)" : stage.probability >= 40 ? "var(--brand-gold)" : "var(--text-muted)" }}
                />
                <span className="crm-pipeline-stage-name">{stage.name}</span>
                <span className="crm-pipeline-stage-count">{stage.items.length}</span>
              </div>
              <span className="crm-pipeline-stage-total">{formatCurrency(stage.total)}</span>
            </div>

            {stage.items.length > 0 && (
              <div className="crm-pipeline-items">
                {stage.items.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="crm-pipeline-item"
                    onClick={() => onOpportunityClick?.(item)}
                  >
                    <span className="crm-pipeline-item-name">{item.name}</span>
                    <span className="crm-pipeline-item-value">{formatCurrency(item.revenue)}</span>
                  </button>
                ))}
                {stage.items.length > 3 && (
                  <p className="crm-empty-mini">+{stage.items.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   TOP OPPORTUNITIES
   ========================================================= */
export function CRMTopOpportunities({ opportunities, onOpportunityClick }) {
  const top = opportunities
    .filter((o) => o.status === "open")
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
    .slice(0, 5);

  return (
    <div className={`${panelClass} p-5`}>
      <div className="crm-card-header">
        <h3 className="crm-card-title">Top Opportunities</h3>
        <p className="crm-card-subtitle">Highest value open deals</p>
      </div>

      <div className="crm-opportunity-list">
        {top.map((opp) => (
          <button
            key={opp.id}
            type="button"
            className="crm-opportunity-card"
            onClick={() => onOpportunityClick?.(opp)}
          >
            <div className="crm-opportunity-card-top">
              <div className="crm-opportunity-card-info">
                <p className="crm-opportunity-card-name">{opp.name}</p>
                <p className="crm-opportunity-card-company">{opp.company}</p>
              </div>
              <Eye className="crm-opportunity-card-eye h-4 w-4" />
            </div>
            <div className="crm-opportunity-card-bottom">
              <span className="crm-opportunity-card-revenue">{formatCurrency(opp.revenue)}</span>
              <span className="crm-opportunity-card-probability">{opp.probability}%</span>
            </div>
          </button>
        ))}

        {top.length === 0 && <p className="crm-empty-mini">No open opportunities.</p>}
      </div>
    </div>
  );
}

/* =========================================================
   RECENT ACTIVITIES
   ========================================================= */
export function CRMRecentActivities({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className={`${panelClass} p-5`}>
        <div className="crm-card-header">
          <h3 className="crm-card-title">Recent Activity</h3>
          <p className="crm-card-subtitle">Latest deal movements</p>
        </div>
        <p className="text-center text-sm text-[var(--text-muted)]">No recent activity.</p>
      </div>
    );
  }

  const typeIcon = {
    won: TrendingUp,
    lost: AlertCircle,
    updated: Activity,
  };

  const typeColor = {
    won: "var(--success)",
    lost: "var(--danger)",
    updated: "var(--brand-cyan)",
  };

  return (
    <div className={`${panelClass} p-5`}>
      <div className="crm-card-header">
        <h3 className="crm-card-title">Recent Activity</h3>
        <p className="crm-card-subtitle">Latest deal movements</p>
      </div>

      <div className="crm-activity-list">
        {activities.map((activity) => {
          const Icon = typeIcon[activity.type] || Activity;
          const color = typeColor[activity.type] || "var(--text-muted)";
          return (
            <div key={activity.id} className="crm-activity-item">
              <div className="crm-activity-top">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color }} />
                  <span className="text-sm font-bold capitalize" style={{ color }}>{activity.type}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{formatDate(activity.date)}</span>
              </div>
              <p className="crm-activity-title">{activity.title}</p>
              <p className="crm-activity-meta">{activity.company} &middot; {activity.stageName}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   REPORTING SUMMARY
   ========================================================= */
export function CRMReportingSummary({ opportunities }) {
  const totalRevenue = opportunities.reduce((sum, o) => sum + (o.revenue || 0), 0);
  const avgDealSize = opportunities.length > 0 ? totalRevenue / opportunities.length : 0;
  const winRate = opportunities.length > 0
    ? Math.round((opportunities.filter((o) => o.status === "won").length / opportunities.length) * 100)
    : 0;
  const avgProbability = opportunities.length > 0
    ? Math.round(opportunities.reduce((sum, o) => sum + (o.probability || 0), 0) / opportunities.length)
    : 0;

  const rows = [
    { label: "Total Pipeline Value", value: formatCurrency(totalRevenue) },
    { label: "Average Deal Size", value: formatCurrency(avgDealSize) },
    { label: "Win Rate", value: `${winRate}%` },
    { label: "Average Probability", value: `${avgProbability}%` },
    { label: "Open Deals", value: opportunities.filter((o) => o.status === "open").length },
    { label: "Closed Deals", value: opportunities.filter((o) => o.status === "won" || o.status === "lost").length },
  ];

  return (
    <div className={`${panelClass} p-5`}>
      <div className="crm-card-header">
        <h3 className="crm-card-title">Reporting Summary</h3>
        <p className="crm-card-subtitle">Key sales metrics</p>
      </div>

      <div className="crm-report-list">
        {rows.map((row) => (
          <div key={row.label} className="crm-report-row">
            <span className="crm-report-label">{row.label}</span>
            <span className="crm-report-value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   OPPORTUNITY DRAWER
   ========================================================= */
export function CRMOpportunityDrawer({ opportunity, onClose }) {
  const [tab, setTab] = useState("overview");

  if (!opportunity) return null;

  return (
    <div className="crm-drawer-overlay" onClick={onClose}>
      <div className="crm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="crm-drawer-header">
          <div>
            <h3 className="crm-drawer-title">{opportunity.name || "Untitled Opportunity"}</h3>
            <p className="crm-drawer-subtitle">{opportunity.company || "No company"}</p>
          </div>
          <button type="button" onClick={onClose} className="crm-drawer-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-[var(--border-color)]">
          {["overview", "details"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={
                tab === item
                  ? "border-b-2 border-[var(--brand-gold)] px-5 py-3 text-sm font-semibold capitalize text-[var(--brand-gold)]"
                  : "px-5 py-3 text-sm font-medium capitalize text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="crm-drawer-body mt-4">
          {tab === "overview" && (
            <div className="space-y-4 text-sm">
              <Info icon={Briefcase} label="Opportunity" value={opportunity.name} />
              <Info icon={Building2} label="Company" value={opportunity.company} />
              <Info icon={UserRound} label="Contact" value={opportunity.contact} />
              <Info icon={Mail} label="Email" value={opportunity.email} />
              <Info icon={Phone} label="Phone" value={opportunity.phone} />
              <Info icon={DollarSign} label="Revenue" value={formatCurrency(opportunity.revenue)} />
              <Info icon={Target} label="Probability" value={`${opportunity.probability}%`} />
              <Info icon={Sparkles} label="Stage" value={opportunity.stageName} />
              <Info label="Status" value={labelize(opportunity.status)} />
              <Info label="Source" value={labelize(opportunity.source)} />
              <Info label="Expected Close" value={formatDate(opportunity.expectedCloseDate)} />
              <Info label="Created" value={formatDate(opportunity.createdAt)} />
              <Info label="Updated" value={formatDate(opportunity.updatedAt)} />
            </div>
          )}

          {tab === "details" && (
            <div className="space-y-4">
              <div>
                <p className="crm-drawer-field-label">Description</p>
                <p className="crm-drawer-field-value">{opportunity.description || "No description provided."}</p>
              </div>
              <div>
                <p className="crm-drawer-field-label">Internal Notes</p>
                <textarea
                  className="min-h-32 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
                  placeholder="Write a note about this opportunity..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <div className="mt-1 flex items-center gap-2 font-medium text-[var(--text-primary)]">
        {Icon && <Icon className="h-4 w-4 text-[var(--text-muted)]" />}
        <span>{value || "—"}</span>
      </div>
    </div>
  );
}
