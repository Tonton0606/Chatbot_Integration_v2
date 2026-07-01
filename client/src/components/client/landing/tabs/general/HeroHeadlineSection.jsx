import TextStyleControls from "../../TextStyleControls";

import { Field, inputClass, textareaClass } from "../../shared";
import { editorClass, getScopedValue } from "./generalTabUtils";

export default function HeroHeadlineSection({
  form,
  payload,
  activePreviewId,
  onEditorFocus,
  onChange,
  updatePayload,
  updateTextStyle,
  resetTextStyle,
  updateScopedStyle,
}) {
  function selectEditor(previewId) {
    onEditorFocus?.(previewId);
  }

  return (
    <section
      data-editor-id="editor-hero-headline"
      className={editorClass(activePreviewId, "hero-headline", "grid gap-4")}
      onFocusCapture={() => selectEditor("hero-headline")}
      onClick={() => selectEditor("hero-headline")}
    >
      <Field label="Headline">
        <textarea
          value={form.headline}
          onFocus={() => selectEditor("hero-headline")}
          onChange={(event) => onChange("headline", event.target.value)}
          className={editorClass(
            activePreviewId,
            "hero-headline",
            textareaClass
          )}
          placeholder="Protect what matters most."
        />
      </Field>

      <div
        data-editor-id="editor-hero-highlight"
        className={editorClass(
          activePreviewId,
          "hero-headline",
          "grid gap-4 md:grid-cols-2"
        )}
      >
        <Field label="Highlighted Text">
          <input
            value={payload.hero_highlight_text || ""}
            onFocus={() => selectEditor("hero-headline")}
            onChange={(event) =>
              updatePayload("hero_highlight_text", event.target.value)
            }
            className={inputClass}
            placeholder="Example: matters most"
          />
        </Field>

        <Field label="Highlight Color">
          <input
            type="color"
            value={getScopedValue(
              payload,
              "text",
              "hero_highlight",
              "color",
              form.primary_color || "#ff8a1d"
            )}
            onFocus={() => selectEditor("hero-headline")}
            onChange={(event) =>
              updateScopedStyle(
                "text",
                "hero_highlight",
                "color",
                event.target.value
              )
            }
            className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
          />
        </Field>
      </div>

      <div
        data-editor-id="editor-hero-headline-style"
        onFocusCapture={() => selectEditor("hero-headline")}
        onClick={() => selectEditor("hero-headline")}
      >
        <TextStyleControls
          label="Headline Style"
          styles={payload.styles?.text?.hero_headline || {}}
          onChange={(styles) => updateTextStyle("hero_headline", styles)}
          onReset={() => resetTextStyle("hero_headline")}
        />
      </div>
    </section>
  );
}
