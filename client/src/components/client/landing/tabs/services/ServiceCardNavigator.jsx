import { Eye, EyeOff, Layers3, Trash2 } from "lucide-react";

import { isCardSelectionActive } from "./landingServicesSelectionUtils";

export default function ServiceCardNavigator({
  cards,
  activePreviewId,
  saving,
  onSelectCard,
  onToggleCard,
  onDeleteCard,
}) {
  if (!cards.length) {
    return (
      <div className="min-w-0 rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-8 text-center">
        <h3 className="font-bold text-[var(--text-primary)]">
          No service cards in this section
        </h3>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Add services, packages, products, or offers for this section.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-2">
      {cards.map((card) => {
        const previewId = `card-${card.id}`;
        const isActive = isCardSelectionActive(activePreviewId, previewId);

        return (
          <div
            key={card.id}
            className={`flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border p-3 transition ${
              isActive
                ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]"
                : "border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--brand-gold)]"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectCard?.(previewId)}
              className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  isActive
                    ? "bg-[var(--brand-gold)] text-black"
                    : "bg-[var(--hover-bg)] text-[var(--text-primary)]"
                }`}
              >
                <Layers3 className="h-4 w-4" />
              </span>

              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block max-w-full truncate text-sm font-black text-[var(--text-primary)]">
                  {card.title || "Untitled Service"}
                </span>

                <span className="block max-w-full truncate text-xs font-bold text-[var(--text-muted)]">
                  {card.template_service_id ? "Template Card" : "Custom Card"}
                </span>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => onToggleCard?.(card)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-primary)] disabled:opacity-60"
                title={card.enabled === false ? "Show" : "Hide"}
              >
                {card.enabled === false ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => onDeleteCard?.(card)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)] disabled:opacity-60"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
