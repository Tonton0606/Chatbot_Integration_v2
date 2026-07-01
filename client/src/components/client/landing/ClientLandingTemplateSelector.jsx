import { useMemo } from "react";
import { Plus, Sparkles } from "lucide-react";

import {
  cardClass,
  SectionHeader,
} from "./shared";

export function ClientLandingTemplateSelector({
  templates,
  saving,
  onAddTemplate,
}) {
  const groupedTemplates = useMemo(() => {
    return (templates || []).reduce((groups, template) => {
      const key = template.industry_category || "Other";

      groups[key] = groups[key] || [];
      groups[key].push(template);

      return groups;
    }, {});
  }, [templates]);

  return (
    <section className={`${cardClass} p-5`}>
      <SectionHeader
        icon={Sparkles}
        title="Add Business Format"
        description="Choose an industry format to add a ready-made section for businesses like insurance, real estate, restaurants, clinics, ecommerce, and more."
      />

      {Object.keys(groupedTemplates).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-8 text-center text-sm text-[var(--text-secondary)]">
          No active landing templates are available yet.
        </div>
      ) : (
        <div className="grid gap-5">
          {Object.entries(groupedTemplates).map(([category, items]) => (
            <div key={category}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {category}
              </h4>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((template) => (
                  <button
                    key={template.template_key || template.id}
                    type="button"
                    disabled={saving}
                    onClick={() => onAddTemplate(template)}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 text-left hover:border-[var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)]">
                          {template.name || "Untitled Template"}
                        </h4>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {template.description ||
                            "Add this format to your landing page."}
                        </p>
                      </div>

                      <Plus className="h-5 w-5 shrink-0 text-[var(--brand-gold)]" />
                    </div>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {template.layout_template || "standard"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
