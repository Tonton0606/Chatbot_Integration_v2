import { Sparkles } from "lucide-react";

import { SectionHeader } from "../../shared";
import { HERO_TEMPLATES, editorClass } from "./generalTabUtils";

export default function HeroLayoutSection({
  payload,
  activePreviewId,
  onEditorFocus,
  updatePayload,
}) {
  function selectEditor(previewId) {
    onEditorFocus?.(previewId);
  }

  return (
    <section
      data-editor-id="editor-hero-layout"
      className={editorClass(
        activePreviewId,
        "hero",
        "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
      )}
      onFocusCapture={() => selectEditor("hero")}
      onClick={() => selectEditor("hero")}
    >
      <SectionHeader
        icon={Sparkles}
        title="Hero Layout"
        description="Choose the top section style. Content stays editable by the client."
      />

      <div className="grid gap-3 md:grid-cols-3">
        {HERO_TEMPLATES.map((template) => {
          const selected =
            (payload.hero_template || "corporate_premium") === template.value;

          return (
            <button
              key={template.value}
              type="button"
              onClick={() => {
                selectEditor("hero");
                updatePayload("hero_template", template.value);
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)] shadow-sm"
                  : "border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--brand-gold)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              <p className="text-sm font-black text-[var(--text-primary)]">
                {template.label}
              </p>

              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
