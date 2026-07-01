import { useState } from "react";
import {
  AlertTriangle,
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
} from "lucide-react";

import {
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_OWNERS,
  LEAD_AI_INSIGHTS,
  formatCurrency,
} from "../../../services/sales_crm/leads";

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

export function LeadsHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales & CRM
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

export function LeadsKPICards({ leads }) {
  const total = leads.length;
  const newLeads = leads.filter((lead) => lead.stage === "New").length;
  const contacted = leads.filter((lead) => lead.stage === "Contacted").length;
  const qualified = leads.filter((lead) => lead.stage === "Qualified").length;
  const converted = leads.filter((lead) => lead.stage === "Converted").length;

  const avgScore =
    total > 0
      ? Math.round(
          leads.reduce((sum, lead) => sum + Number(lead.score || 0), 0) / total
        )
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

                <h3 className={`mt-4 truncate text-2xl font-bold ${card.tone}`}>
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

            <div className="mt-5 h-1 rounded-full bg-[var(--hover-bg)]">
              <div className="h-1 w-3/5 rounded-full bg-[var(--brand-gold)]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

export function LeadsFilterToolbar({ filters, onChange, onClear }) {
  return (
    <div className={`${subtlePanelClass} p-4`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_190px_110px]">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-muted)]" />

          <input
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Search leads, contacts, company..."
            className="input-base pl-10"
          />
        </div>

        <select value={filters.stage} onChange={(event) => onChange("stage", event.target.value)} className="input-base">
          <option value="all">All Stages</option>
          {LEAD_STAGES.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>

        <select value={filters.source} onChange={(event) => onChange("source", event.target.value)} className="input-base">
          <option value="all">All Sources</option>
          {LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>

        <select value={filters.owner} onChange={(event) => onChange("owner", event.target.value)} className="input-base">
          <option value="all">All Owners</option>
          {LEAD_OWNERS.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function LeadsKanbanBoard({ leads, onSelect }) {
  const activeStages = LEAD_STAGES.filter((stage) => stage !== "Lost");

  return (
    <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-5">
      {activeStages.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage);
        const totalValue = stageLeads.reduce(
          (sum, lead) => sum + Number(lead.estimated_value || 0),
          0
        );

        return (
          <div key={stage} className={`${panelClass} overflow-hidden`}>
            <div className="border-b border-[var(--border-color)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {stage}
                  </h3>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {stageLeads.length} leads · {formatCurrency(totalValue)}
                  </p>
                </div>

                <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
                  {stageLeads.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 p-3">
              {stageLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] p-6 text-center text-sm text-[var(--text-muted)]">
                  No leads
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <LeadKanbanCard key={lead.id} lead={lead} onSelect={onSelect} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadKanbanCard({ lead, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 text-left transition hover:border-[var(--brand-gold-border)] hover:bg-[var(--hover-bg)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">
            {lead.name}
          </h4>

          <p className="mt-1 truncate text-sm font-semibold text-[var(--brand-gold)]">
            {lead.company || "No company"}
          </p>

          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {lead.contact_name} · {lead.source}
          </p>
        </div>

        <ScoreBadge score={lead.score} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="font-bold text-[var(--brand-gold)]">
          {formatCurrency(lead.estimated_value)}
        </p>

        <p className="truncate text-xs font-medium text-[var(--text-muted)]">
          {lead.owner}
        </p>
      </div>
    </button>
  );
}

export function LeadsTable({ leads, onSelect }) {
  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-[var(--border-color)] px-5 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-[var(--text-primary)]">Lead Records</h3>
          <p className="text-sm text-[var(--text-muted)]">{leads.length} records</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              {["Lead", "Company", "Source", "Interest", "Score", "Value", "Stage", "Owner", ""].map((header) => (
                <th key={header} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--hover-bg)]">
                <td className="px-5 py-4">
                  <p className="font-semibold text-[var(--text-primary)]">{lead.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{lead.id}</p>
                </td>

                <td className="px-5 py-4">
                  <p className="font-medium text-[var(--brand-gold)]">{lead.company || "—"}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{lead.contact_name}</p>
                </td>

                <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{lead.source}</td>
                <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{lead.interest}</td>
                <td className="px-5 py-4"><ScoreBadge score={lead.score} /></td>
                <td className="px-5 py-4 font-bold text-[var(--brand-gold)]">{formatCurrency(lead.estimated_value)}</td>

                <td className="px-5 py-4">
                  <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                    {lead.stage}
                  </span>
                </td>

                <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{lead.owner}</td>

                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(lead)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
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

export function LeadDetailDrawer({
  lead,
  adminOptions = [],
  loading = false,
  onClose,
  onStageChange,
  onOwnerChange,
  onConvert,
}) {
  const [tab, setTab] = useState("profile");
  const [opportunityValue, setOpportunityValue] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState(
    lead.assigned_admin_id || ""
  );

  const ai = LEAD_AI_INSIGHTS[lead.id];

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "actions", label: "Actions" },
    { id: "activity", label: "Activity" },
    { id: "ai", label: "AI Insights" },
    { id: "notes", label: "Notes" },
  ];

  const isConverted = lead.stage === "Converted";
  const isLost = lead.stage === "Lost";

  function handleAdminSelect(value) {
    setSelectedAdminId(value);
    onOwnerChange?.(lead, value || null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {lead.name}
              </h2>

              <p className="mt-1 text-sm text-[var(--brand-gold)]">
                {lead.contact_name} · {lead.company || "No company"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  {lead.stage}
                </span>

                <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                  Score {lead.score}
                </span>

                <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                  {formatCurrency(lead.estimated_value)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-[var(--border-color)]">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 px-3 py-3 text-sm font-semibold ${
                tab === item.id
                  ? "border-b-2 border-[var(--brand-gold)] text-[var(--brand-gold)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "profile" && (
            <div className="space-y-4">
              <DetailItem label="Email" value={lead.email} />
              <DetailItem label="Phone" value={lead.phone} />
              <DetailItem label="Company" value={lead.company} />
              <DetailItem label="Source" value={lead.source} />
              <DetailItem label="Interest" value={lead.interest} />
              <DetailItem label="Owner" value={lead.owner} />
              <DetailItem label="Last Contacted" value={lead.last_contacted_at} />
              <DetailItem
                label="Next Follow-up"
                value={lead.next_follow_up_at || "—"}
              />

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Assigned Admin Optional
                </label>

                <select
                  value={selectedAdminId}
                  disabled={loading}
                  onChange={(event) => handleAdminSelect(event.target.value)}
                  className="input-base"
                >
                  <option value="">Unassigned</option>

                  {adminOptions.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name || admin.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === "actions" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
                <h3 className="font-bold text-[var(--text-primary)]">
                  Lead Progression
                </h3>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Move this lead through the CRM workflow. Assignment is optional.
                </p>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    disabled={loading || isConverted || isLost}
                    onClick={() => onStageChange?.(lead, "Contacted")}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Contacted
                  </button>

                  <button
                    type="button"
                    disabled={loading || isConverted || isLost}
                    onClick={() => onStageChange?.(lead, "Qualified")}
                    className="rounded-xl border border-green-500/20 bg-[var(--success-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--success)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Qualified
                  </button>

                  <button
                    type="button"
                    disabled={loading || isConverted || isLost}
                    onClick={() => onStageChange?.(lead, "Proposal")}
                    className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move to Proposal
                  </button>

                  <button
                    type="button"
                    disabled={loading || isConverted}
                    onClick={() => onStageChange?.(lead, "Lost")}
                    className="rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Lost
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] p-4">
                <h3 className="font-bold text-[var(--text-primary)]">
                  Create Opportunity
                </h3>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Convert this lead into a deal pipeline opportunity.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Assigned Admin Optional
                    </label>

                    <select
                      value={selectedAdminId}
                      disabled={loading}
                      onChange={(event) => handleAdminSelect(event.target.value)}
                      className="input-base"
                    >
                      <option value="">Unassigned</option>

                      {adminOptions.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.full_name || admin.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Expected Revenue
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={opportunityValue}
                      onChange={(event) => setOpportunityValue(event.target.value)}
                      placeholder="Example: 50000"
                      className="input-base"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Expected Close Date
                    </label>

                    <input
                      type="date"
                      value={expectedCloseDate}
                      onChange={(event) => setExpectedCloseDate(event.target.value)}
                      className="input-base"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={loading || isConverted || isLost}
                    onClick={() =>
                      onConvert?.(lead, {
                        expected_revenue: Number(opportunityValue || 0),
                        expected_close_date: expectedCloseDate || null,
                        assigned_admin_id: selectedAdminId || null,
                        description: lead.notes || null,
                      })
                    }
                    className="w-full rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Convert to Opportunity"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "activity" && (
            <p className="text-sm text-[var(--text-muted)]">No activity yet.</p>
          )}

          {tab === "ai" && (
            <div className="rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-[var(--brand-gold)]" />

                <p className="text-sm font-bold text-[var(--brand-gold)]">
                  AI Qualification Summary
                </p>
              </div>

              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {ai?.qualificationSummary || "No AI insight yet."}
              </p>
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-4">
              {lead.notes && (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {lead.notes}
                  </p>
                </div>
              )}

              <textarea
                rows={5}
                placeholder="Add a note..."
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 text-sm text-[var(--text-primary)] outline-none"
              />

              <button
                type="button"
                className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)]"
              >
                Save Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-[var(--text-primary)]">
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
    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreClass}`}>
      {score}
    </span>
  );
}

export function LeadsLoadingState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading leads pipeline...
      </p>
    </div>
  );
}

export function LeadsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--danger)]">Failed to load leads</h3>
          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>
          <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeadsEmptyState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        No leads found
      </h3>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Try adjusting your search or filters.
      </p>
    </div>
  );
}
