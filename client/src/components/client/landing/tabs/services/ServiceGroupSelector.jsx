import { ChevronRight, Layers3 } from "lucide-react";

export default function ServiceGroupSelector({
  cards = [],
  serviceGroups = [],
  selectedGroup,
  onSelectGroup,
}) {
  return (
    <aside className="min-w-0 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="mb-4 min-w-0">
        <p className="truncate text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Service Groups
        </p>
        <h3 className="mt-1 truncate text-lg font-black text-[var(--text-primary)]">
          Sections
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Select a services section to manage its cards.
        </p>
      </div>

      <div className="grid min-w-0 gap-2">
        {serviceGroups.map((group) => {
          const groupCards = (cards || []).filter((card) =>
            group.sectionId === null
              ? !card.section_id
              : String(card.section_id) === String(group.sectionId)
          );

          const isActive = selectedGroup?.id === group.id;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className={`flex min-w-0 w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition ${
                isActive
                  ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]"
                  : "border-[var(--border-color)] bg-[var(--hover-bg)] hover:border-[var(--brand-gold)]"
              }`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    isActive
                      ? "bg-[var(--brand-gold)] text-black"
                      : "bg-[var(--bg-card)] text-[var(--text-primary)]"
                  }`}
                >
                  <Layers3 className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block max-w-full truncate text-sm font-black text-[var(--text-primary)]">
                    {group.title || "Untitled Services"}
                  </span>
                  <span className="block truncate text-xs font-bold text-[var(--text-muted)]">
                    {groupCards.length} card
                    {groupCards.length === 1 ? "" : "s"}
                  </span>
                </span>
              </span>

              <ChevronRight
                className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition ${
                  isActive ? "rotate-90" : ""
                }`}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
