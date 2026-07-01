import { useState } from "react";
import {
  AlertTriangle,
  Archive,
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
  Users,
  X,
} from "lucide-react";

import {
  CLIENT_LEAD_STAGES,
  CLIENT_LEAD_STAGE_LABELS,
  CLIENT_LEAD_SOURCES,
  formatCurrency,
  formatShortCurrency,
} from "../../../services/clientLeads";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const inputClass =
  "h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

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

export function ClientLeadsHeader({ onAddLead }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales &amp; CRM
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Leads Pipeline
        </h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Track and manage workspace sales leads.
        </p>
      </div>

      <button
        type="button"
        onClick={onAddLead}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#050816] shadow-sm hover:bg-[var(--brand-gold-hover)] sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Add Lead
      </button>
    </div>
  );
}

export function ClientLeadsKPICards({ leads }) {
  const activeLeads = leads.filter((lead) => !lead.archived_at);

  const total = activeLeads.length;
  const newLeads = activeLeads.filter((lead) => lead.status === "new").length;
  const contacted = activeLeads.filter((lead) => lead.status === "contacted").length;
  const qualified = activeLeads.filter((lead) => lead.status === "qualified").length;
  const converted = activeLeads.filter((lead) => lead.status === "converted").length;

  const avgScore =
    total > 0
      ? Math.round(
          activeLeads.reduce((sum, lead) => sum + Number(lead.score || 0), 0) /
            total
        )
      : 0;

  const colorClasses = (color) => {
    const map = {
      blue: { icon: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]", bar: "bg-[var(--brand-cyan)]" },
      amber: { icon: "text-amber-500 bg-amber-500/10 border-amber-500/30", bar: "bg-amber-500" },
      green: { icon: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20", bar: "bg-[var(--success)]" },
      gold: { icon: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]", bar: "bg-[var(--brand-gold)]" },
    };
    return map[color] || map.blue;
  };

  const cards = [
    { label: "Total Leads", value: total, icon: Users, color: "blue" },
    { label: "New Leads", value: newLeads, icon: Plus, color: "gold" },
    { label: "Contacted", value: contacted, icon: Phone, color: "blue" },
    { label: "Qualified", value: qualified, icon: BadgeCheck, color: "green" },
    { label: "Converted", value: converted, icon: Target, color: "green" },
    { label: "Avg Score", value: avgScore, icon: Brain, color: "gold" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorClasses(card.color);

        return (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm flex flex-col p-5"
          >
            <div className="flex flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="min-h-[32px] text-xs font-bold uppercase leading-snug tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-2 text-xl 2xl:text-2xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>

                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                  Active lead data
                </p>
              </div>

              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 h-1 w-full rounded-full bg-[var(--hover-bg)]">
              <div className={`h-1 w-3/5 rounded-full ${colors.bar}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientLeadsViewTabs({ view, setView }) {
  const tabs = [
    { key: "pipeline", label: "Pipeline", icon: KanbanSquare },
    { key: "list", label: "List", icon: List },
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
              onClick={() => setView(tab.key)}
              className={
                view === tab.key
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

export function ClientLeadsFilterToolbar({
  filters,
  onChange,
  onClear,
  owners = [],
}) {
  return (
    <div className="grid min-w-0 gap-3 border-b border-[var(--border-color)] py-4 xl:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(130px,170px))_110px]">
      <div className="relative min-w-0">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-muted)]" />

        <input
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Search leads, company, contact..."
          className={`${inputClass} pl-9`}
        />
      </div>

      <select
        value={filters.stage}
        onChange={(event) => onChange("stage", event.target.value)}
        className={inputClass}
      >
        <option value="all">All Stages</option>
        {CLIENT_LEAD_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {CLIENT_LEAD_STAGE_LABELS[stage]}
          </option>
        ))}
      </select>

      <select
        value={filters.source}
        onChange={(event) => onChange("source", event.target.value)}
        className={inputClass}
      >
        <option value="all">All Sources</option>
        {CLIENT_LEAD_SOURCES.map((source) => (
          <option key={source} value={source}>
            {labelize(source)}
          </option>
        ))}
      </select>

      <select
        value={filters.owner}
        onChange={(event) => onChange("owner", event.target.value)}
        className={inputClass}
      >
        <option value="all">All Owners</option>
        {owners.map((owner) => (
          <option key={owner} value={owner}>
            {owner}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onClear}
        className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
      >
        Clear
      </button>
    </div>
  );
}

export function ClientLeadsKanbanBoard({ leads, onSelect }) {
  const activeStages = CLIENT_LEAD_STAGES.filter((stage) => stage !== "lost");

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    
    const ratio = el.scrollLeft / maxScroll;
    
    // Yellow to Green to Blue interpolation
    let r, g, b;
    if (ratio < 0.5) {
      const localRatio = ratio * 2;
      r = Math.round(212 + (34 - 212) * localRatio); // Yellow -> Green
      g = Math.round(175 + (197 - 175) * localRatio);
      b = Math.round(55 + (94 - 55) * localRatio);
    } else {
      const localRatio = (ratio - 0.5) * 2;
      r = Math.round(34 + (8 - 34) * localRatio);   // Green -> Blue
      g = Math.round(197 + (145 - 197) * localRatio);
      b = Math.round(94 + (178 - 94) * localRatio);
    }
    
    el.style.setProperty('--scroll-thumb-color', `rgb(${r}, ${g}, ${b})`);
  };

  return (
    <div 
      className="custom-scrollbar min-w-0 overflow-x-auto pb-4 transition-colors"
      onScroll={handleScroll}
      style={{ '--scroll-thumb-color': 'rgb(212, 175, 55)' }}
    >
      <div className="flex w-max gap-4">
        {activeStages.map((stage) => {
          const stageLeads = leads.filter(
            (lead) => lead.status === stage && !lead.archived_at
          );

          const totalValue = stageLeads.reduce(
            (sum, lead) => sum + Number(lead.estimated_value || 0),
            0
          );

          return (
            <div
              key={stage}
              className="flex min-h-[420px] w-[300px] shrink-0 flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[var(--brand-gold)]" />

                  <h3 className="truncate text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
                    {CLIENT_LEAD_STAGE_LABELS[stage]}
                  </h3>

                  <span className="flex-shrink-0 rounded-full bg-[var(--hover-bg)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
                    {stageLeads.length}
                  </span>
                </div>

                <span className="flex-shrink-0 text-xs font-semibold text-[var(--text-secondary)]">
                  {formatShortCurrency(totalValue)}
                </span>
              </div>

              <div className="space-y-3">
                {stageLeads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-4 text-center text-sm text-[var(--text-muted)]">
                    No leads
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => onSelect(lead)}
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

function LeadCard({ lead, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">
            {lead.title || "Untitled Lead"}
          </h4>

          <p className="mt-1 truncate text-sm font-medium text-[var(--brand-gold)]">
            {lead.company || "No company"}
          </p>

          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {lead.contact_name || "No contact"} · {labelize(lead.source)}
          </p>
        </div>

        <ScoreBadge score={lead.score} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="truncate text-lg font-bold text-[var(--text-primary)]">
          {formatCurrency(lead.estimated_value)}
        </span>

        <span className="flex-shrink-0 font-bold text-[var(--success)]">
          {lead.probability || 0}%
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
        <span className="truncate">{lead.owner || "Unassigned"}</span>
        <span className="flex-shrink-0">{formatDate(lead.updated_at)}</span>
      </div>
    </button>
  );
}

export function ClientLeadsTable({ leads, onSelect }) {
  const activeLeads = leads.filter((lead) => !lead.archived_at);

  if (activeLeads.length === 0) {
    return <ClientLeadsEmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="min-w-[960px] w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-secondary)]">
          <tr>
            <th className="px-4 py-3">Lead</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Probability</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {activeLeads.map((lead) => (
            <tr key={lead.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                {lead.title || "Untitled Lead"}
              </td>

              <td className="px-4 py-3 text-[var(--brand-gold)]">
                {lead.company || "—"}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {lead.contact_name || "—"}
              </td>

              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                {formatCurrency(lead.estimated_value)}
              </td>

              <td className="px-4 py-3">
                <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  {lead.stage}
                </span>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {lead.probability || 0}%
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {lead.owner || "—"}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {labelize(lead.source)}
              </td>

              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSelect(lead)}
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
  );
}

export function ClientLeadDetailDrawer({
  lead,
  onClose,
  onEdit,
  onArchive,
  onStageChange,
  onConvert,
}) {
  const [tab, setTab] = useState("overview");

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
              <span className="mt-2 h-3 w-3 flex-shrink-0 rounded-full bg-[var(--brand-gold)]" />

              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-[var(--text-primary)]">
                  {lead.title || "Untitled Lead"}
                </h3>

                <p className="mt-1 truncate text-sm text-[var(--brand-gold)]">
                  {lead.company || "No company"}
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
            {CLIENT_LEAD_STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => onStageChange?.(lead, stage)}
                className="rounded-lg border px-3 py-1 text-xs font-semibold transition hover:bg-[var(--bg-card)]"
                style={{
                  borderColor:
                    stage === lead.status
                      ? "var(--brand-gold)"
                      : "var(--border-color)",
                  color:
                    stage === lead.status
                      ? "var(--brand-gold)"
                      : "var(--text-secondary)",
                  background:
                    stage === lead.status
                      ? "var(--brand-gold-soft)"
                      : "transparent",
                }}
              >
                {CLIENT_LEAD_STAGE_LABELS[stage]}
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
              <Info label="Company" value={lead.company} />
              <Info label="Contact" value={lead.contact_name} />
              <Info label="Email" value={lead.email} />
              <Info label="Phone" value={lead.phone} />
              <Info label="Stage" value={lead.stage} />
              <Info label="Value" value={formatCurrency(lead.estimated_value)} />
              <Info label="Probability" value={`${lead.probability || 0}%`} />
              <Info label="Owner" value={lead.owner} />
              <Info label="Source" value={labelize(lead.source)} />
              <Info
                label="Assignment Type"
                value={labelize(lead.assignment_type)}
              />
              <Info label="Last Updated" value={formatDate(lead.updated_at)} />
            </div>
          )}

          {tab === "activity" && (
            <p className="text-center text-sm text-[var(--text-muted)]">
              No activity recorded yet.
            </p>
          )}

          {tab === "notes" && (
            <textarea
              readOnly
              value={lead.notes || ""}
              className="min-h-32 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm text-[var(--text-primary)] outline-none"
              placeholder="No notes yet."
            />
          )}
        </div>

        <div className="grid gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4 sm:flex sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => onEdit?.(lead)}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            Edit
          </button>

          {lead.status !== "converted" && lead.status !== "lost" && (
            <button
              type="button"
              onClick={() => onConvert?.(lead)}
              className="rounded-2xl border border-green-500/20 bg-[var(--success-soft)] px-4 py-2 text-sm font-semibold text-[var(--success)]"
            >
              Convert to Deal
            </button>
          )}

          {lead.status !== "lost" && (
            <button
              type="button"
              onClick={() => onStageChange?.(lead, "lost")}
              className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)]"
            >
              Mark Lost
            </button>
          )}

          <button
            type="button"
            onClick={() => onArchive?.(lead)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientLeadsLoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        Loading leads pipeline...
      </p>
    </div>
  );
}

export function ClientLeadsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load leads
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

export function ClientLeadsEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        No leads found
      </h3>

      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Add your first lead or adjust the current filters.
      </p>
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

function ScoreBadge({ score }) {
  const scoreClass =
    score >= 80
      ? "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]"
      : score >= 60
        ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"
        : "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreClass}`}
    >
      {score}
    </span>
  );
}
