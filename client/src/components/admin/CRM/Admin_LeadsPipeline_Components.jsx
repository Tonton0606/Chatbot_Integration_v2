import { useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Brain,
  Eye,
  KanbanSquare,
  List,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Target,
  Upload,
  Users,
  X,
  Building2,
  Mail,
  UserRound,
  DollarSign,
  Calendar,
} from "lucide-react";

import {
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_OWNERS,
  STAGE_COLORS,
  formatCurrency,
} from "../../../services/CRM/leadsPipeline.service";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const subtlePanelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 shadow-sm";

const iconBoxClass =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

const primaryButtonClass =
  "inline-flex items-center rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-gold-hover)]";

const secondaryButtonClass =
  "inline-flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]";

const aiButtonClass =
  "inline-flex items-center rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand-gold)] transition hover:bg-[var(--hover-bg)]";

const VIEWS = [
  { id: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { id: "list", label: "List", icon: List },
];

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date) {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

/* =========================================================
   HEADER
   ========================================================= */
export function LeadsHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales &amp; CRM
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Leads Pipeline
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Lead acquisition, qualification, scoring, and conversion workflow.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass}>
          <Upload className="mr-2 h-4 w-4" />
          Import Leads
        </button>
        <button type="button" className={aiButtonClass}>
          <Brain className="mr-2 h-4 w-4" />
          AI Score Leads
        </button>
        <button type="button" className={primaryButtonClass}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   STATES
   ========================================================= */
export function LeadsLoadingState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <div className="crm-loading-spinner mx-auto" />
      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">Loading leads...</p>
    </div>
  );
}

export function LeadsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">Failed to load leads</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
          <button type="button" onClick={onRetry} className="mt-4 rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeadsEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No leads found</h3>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Add your first lead or adjust your filters.</p>
    </div>
  );
}

/* =========================================================
   KPI CARDS
   ========================================================= */
export function LeadsKPICards({ leads }) {
  const total = leads.length;
  const newLeads = leads.filter((lead) => lead.stage === "New").length;
  const contacted = leads.filter((lead) => lead.stage === "Contacted").length;
  const qualified = leads.filter((lead) => lead.stage === "Qualified").length;
  const converted = leads.filter((lead) => lead.stage === "Converted").length;

  const avgScore =
    total > 0
      ? Math.round(leads.reduce((sum, lead) => sum + Number(lead.score || 0), 0) / total)
      : 0;

  const cards = [
    { label: "Total Leads", value: total, helper: "All active lead records", icon: Users, tone: "text-[var(--brand-gold)]" },
    { label: "New Leads", value: newLeads, helper: "Fresh unqualified leads", icon: Plus, tone: "text-[var(--text-primary)]" },
    { label: "Contacted", value: contacted, helper: "Initial outreach done", icon: Phone, tone: "text-[var(--brand-gold)]" },
    { label: "Qualified", value: qualified, helper: "Ready for opportunity", icon: BadgeCheck, tone: "text-[var(--success)]" },
    { label: "Converted", value: converted, helper: "Converted to deal/contact", icon: Target, tone: "text-[var(--success)]" },
    { label: "Avg Score", value: avgScore, helper: "Qualification score", icon: Brain, tone: "text-[var(--brand-gold)]" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`${panelClass} p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>
                <h3 className={`mt-4 truncate text-2xl font-bold ${card.tone}`}>{card.value}</h3>
                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{card.helper}</p>
              </div>
              <div className={iconBoxClass}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 h-1 rounded-full bg-[var(--hover-bg)]">
              <div className="h-1 w-3/5 rounded-full bg-[var(--brand-gold)]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   VIEW TABS
   ========================================================= */
export function LeadsViewTabs({ view, setView }) {
  return (
    <div className={`${subtlePanelClass} p-2`}>
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                view === item.id
                  ? "bg-[var(--brand-gold)] text-white shadow-sm"
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

/* =========================================================
   FILTER TOOLBAR
   ========================================================= */
export function LeadsFilterToolbar({ filters, onChange, onClear }) {
  const inputBase =
    "h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

  return (
    <div className={`${subtlePanelClass} p-4`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_190px_110px]">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
          <input
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Search leads, contacts, company..."
            className={`${inputBase} pl-10`}
          />
        </div>

        <select
          value={filters.stage}
          onChange={(event) => onChange("stage", event.target.value)}
          className={inputBase}
        >
          <option value="all">All Stages</option>
          {LEAD_STAGES.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>

        <select
          value={filters.source}
          onChange={(event) => onChange("source", event.target.value)}
          className={inputBase}
        >
          <option value="all">All Sources</option>
          {LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>{labelize(source)}</option>
          ))}
        </select>

        <select
          value={filters.owner}
          onChange={(event) => onChange("owner", event.target.value)}
          className={inputBase}
        >
          <option value="all">All Owners</option>
          {LEAD_OWNERS.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <RefreshCw className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   KANBAN BOARD
   ========================================================= */
export function LeadsKanbanBoard({ leads, onSelect }) {
  const byStage = {};
  LEAD_STAGES.forEach((stage) => {
    byStage[stage] = leads.filter((lead) => lead.stage === stage);
  });

  return (
    <div className="leads-kanban">
      {LEAD_STAGES.map((stage) => (
        <div key={stage} className="leads-kanban-column">
          <div className="leads-kanban-column-header">
            <span className="leads-kanban-column-title">{stage}</span>
            <span className="leads-kanban-column-count">{byStage[stage].length}</span>
          </div>

          {byStage[stage].map((lead) => (
            <button
              key={lead.id}
              type="button"
              className="lead-card text-left"
              onClick={() => onSelect?.(lead)}
            >
              <div className="lead-card-header">
                <div className="min-w-0">
                  <p className="lead-card-name">{lead.name}</p>
                  <p className="lead-card-company">{lead.company || lead.contact_name}</p>
                </div>
                <span
                  className="lead-card-score"
                  style={{
                    background:
                      lead.score >= 70
                        ? "var(--success-soft)"
                        : lead.score >= 40
                        ? "var(--brand-gold-soft)"
                        : "var(--hover-bg)",
                    color:
                      lead.score >= 70
                        ? "var(--success)"
                        : lead.score >= 40
                        ? "var(--brand-gold)"
                        : "var(--text-muted)",
                    border: `1px solid ${
                      lead.score >= 70
                        ? "rgba(22,163,74,0.3)"
                        : lead.score >= 40
                        ? "var(--brand-gold-border)"
                        : "var(--border-color)"
                    }`,
                  }}
                >
                  {lead.score}
                </span>
              </div>

              <div className="lead-card-body">
                <div className="lead-card-meta">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{lead.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="lead-card-value">{formatCurrency(lead.estimated_value)}</span>
                  <span className="lead-source-badge">{labelize(lead.source)}</span>
                </div>
                <div className="lead-score-bar">
                  <div
                    className="lead-score-bar-fill"
                    style={{
                      width: `${lead.score}%`,
                      background:
                        lead.score >= 70
                          ? "var(--success)"
                          : lead.score >= 40
                          ? "var(--brand-gold)"
                          : "var(--text-muted)",
                    }}
                  />
                </div>
              </div>
            </button>
          ))}

          {byStage[stage].length === 0 && (
            <div className="crm-empty-mini">No leads in this stage.</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   TABLE
   ========================================================= */
export function LeadsTable({ leads, onSelect }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
        <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No leads found</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Adjust your filters or add a new lead.</p>
      </div>
    );
  }

  return (
    <div className="leads-table-wrap">
      <table className="leads-table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Company</th>
            <th>Contact</th>
            <th>Stage</th>
            <th>Source</th>
            <th>Owner</th>
            <th>Value</th>
            <th>Score</th>
            <th>Last Contact</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} onClick={() => onSelect?.(lead)} className="cursor-pointer">
              <td>
                <div className="flex items-center gap-3">
                  <Avatar name={lead.name} />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{lead.name}</p>
                    <p className="text-xs text-[var(--brand-cyan)]">{lead.email}</p>
                  </div>
                </div>
              </td>
              <td className="text-[var(--text-secondary)]">{lead.company || "—"}</td>
              <td className="text-[var(--text-secondary)]">{lead.contact_name || "—"}</td>
              <td>
                <span
                  className="lead-stage-badge"
                  style={{
                    borderColor:
                      lead.stage === "Converted"
                        ? "rgba(22,163,74,0.3)"
                        : lead.stage === "Lost"
                        ? "rgba(220,38,38,0.3)"
                        : "var(--border-color)",
                    background:
                      lead.stage === "Converted"
                        ? "var(--success-soft)"
                        : lead.stage === "Lost"
                        ? "var(--danger-soft)"
                        : "var(--hover-bg)",
                    color:
                      lead.stage === "Converted"
                        ? "var(--success)"
                        : lead.stage === "Lost"
                        ? "var(--danger)"
                        : "var(--text-secondary)",
                  }}
                >
                  {lead.stage}
                </span>
              </td>
              <td>
                <span className="lead-source-badge">{labelize(lead.source)}</span>
              </td>
              <td>
                <span className="lead-owner-badge">{lead.owner}</span>
              </td>
              <td className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(lead.estimated_value)}
              </td>
              <td>
                <span
                  className="rounded-full border px-2 py-1 text-xs font-bold"
                  style={{
                    borderColor:
                      lead.score >= 70
                        ? "rgba(22,163,74,0.3)"
                        : lead.score >= 40
                        ? "var(--brand-gold-border)"
                        : "var(--border-color)",
                    background:
                      lead.score >= 70
                        ? "var(--success-soft)"
                        : lead.score >= 40
                        ? "var(--brand-gold-soft)"
                        : "var(--hover-bg)",
                    color:
                      lead.score >= 70
                        ? "var(--success)"
                        : lead.score >= 40
                        ? "var(--brand-gold)"
                        : "var(--text-muted)",
                  }}
                >
                  {lead.score}
                </span>
              </td>
              <td className="text-[var(--text-muted)]">{formatDate(lead.last_contacted_at)}</td>
              <td>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(lead);
                    }}
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
   LEAD DETAIL DRAWER
   ========================================================= */
export function LeadDetailDrawer({
  lead,
  adminOptions,
  loading,
  onClose,
  onStageChange,
  onOwnerChange,
  onConvert,
}) {
  const [tab, setTab] = useState("profile");
  const [convertForm, setConvertForm] = useState({ expected_revenue: lead?.estimated_value || 0 });

  if (!lead) return null;

  return (
    <div className="crm-drawer-overlay" onClick={onClose}>
      <div className="crm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="crm-drawer-header">
          <div className="flex items-start gap-4">
            <Avatar name={lead.name} size="h-12 w-12" />
            <div>
              <h3 className="crm-drawer-title">{lead.name || "Untitled Lead"}</h3>
              <p className="crm-drawer-subtitle">{lead.company || lead.contact_name || "No company"}</p>
              <p className="mt-1 text-sm text-[var(--brand-cyan)]">{lead.email || "No email"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="crm-drawer-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pb-4">
          <span
            className="lead-stage-badge"
            style={{
              borderColor:
                lead.stage === "Converted"
                  ? "rgba(22,163,74,0.3)"
                  : lead.stage === "Lost"
                  ? "rgba(220,38,38,0.3)"
                  : "var(--border-color)",
              background:
                lead.stage === "Converted"
                  ? "var(--success-soft)"
                  : lead.stage === "Lost"
                  ? "var(--danger-soft)"
                  : "var(--hover-bg)",
              color:
                lead.stage === "Converted"
                  ? "var(--success)"
                  : lead.stage === "Lost"
                  ? "var(--danger)"
                  : "var(--text-secondary)",
            }}
          >
            {lead.stage}
          </span>
          <span className="lead-source-badge">{labelize(lead.source)}</span>
          <span className="lead-owner-badge">{lead.owner}</span>
        </div>

        <div className="flex border-b border-[var(--border-color)]">
          {["profile", "actions"].map((item) => (
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
          {tab === "profile" && (
            <div className="space-y-4 text-sm">
              <Info icon={UserRound} label="Contact Name" value={lead.contact_name} />
              <Info icon={Mail} label="Email" value={lead.email} />
              <Info icon={Phone} label="Phone" value={lead.phone} />
              <Info icon={Building2} label="Company" value={lead.company} />
              <Info icon={Target} label="Interest" value={lead.interest} />
              <Info icon={DollarSign} label="Estimated Value" value={formatCurrency(lead.estimated_value)} />
              <Info icon={Brain} label="Score" value={`${lead.score}/100`} />
              <Info icon={Calendar} label="Created" value={formatDate(lead.created_at)} />
              <Info icon={Calendar} label="Last Contacted" value={formatDate(lead.last_contacted_at)} />
              <Info label="Notes" value={lead.notes} />
            </div>
          )}

          {tab === "actions" && (
            <div className="space-y-6">
              <div>
                <p className="crm-drawer-field-label">Change Stage</p>
                <div className="leads-drawer-stages">
                  {LEAD_STAGES.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      disabled={loading}
                      onClick={() => onStageChange?.(lead, stage)}
                      className={`leads-drawer-stage-btn ${lead.stage === stage ? "active" : ""}`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="crm-drawer-field-label">Assign Owner</p>
                <select
                  disabled={loading}
                  value={lead.assigned_admin_id || ""}
                  onChange={(e) => onOwnerChange?.(lead, e.target.value || null)}
                  className="input-base"
                >
                  <option value="">Unassigned</option>
                  {(adminOptions || []).map((admin) => (
                    <option key={admin.id} value={admin.id}>{admin.full_name}</option>
                  ))}
                </select>
              </div>

              {lead.stage !== "Converted" && lead.stage !== "Lost" && (
                <div>
                  <p className="crm-drawer-field-label">Convert to Opportunity</p>
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={convertForm.expected_revenue}
                      onChange={(e) =>
                        setConvertForm({ expected_revenue: Number(e.target.value) })
                      }
                      placeholder="Expected revenue"
                      className="input-base"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onConvert?.(lead, convertForm)}
                      className={primaryButtonClass}
                    >
                      <Target className="mr-2 h-4 w-4" />
                      Convert Lead
                    </button>
                  </div>
                </div>
              )}
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
