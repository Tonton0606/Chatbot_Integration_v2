import { Plus } from "lucide-react";

export default function SalesCRMHeader({ onAddOpportunity }) {
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

      {onAddOpportunity && (
        <button
          type="button"
          onClick={onAddOpportunity}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#050816] shadow-sm transition hover:bg-[var(--brand-gold-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add Opportunity
        </button>
      )}
    </div>
  );
}
