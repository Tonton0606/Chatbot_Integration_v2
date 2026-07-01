import TextStyleControls from "../../TextStyleControls";

import { Field, inputClass } from "../../shared";
import {
  SHAPE_OPTIONS,
  editorClass,
  getScopedValue,
} from "./generalTabUtils";

const PREVIEW_ID = "hero-badge";

export default function HeroBadgeSection({
  form,
  payload,
  activePreviewId,
  onEditorFocus,
  onChange,
  updateTextStyle,
  resetTextStyle,
  updateScopedStyle,
  updateShape,
}) {
  function selectEditor() {
    onEditorFocus?.(PREVIEW_ID);
  }

  return (
    <section
      data-editor-id="editor-hero-badge"
      className={editorClass(activePreviewId, PREVIEW_ID, "grid gap-4")}
      onFocusCapture={selectEditor}
      onClick={selectEditor}
    >
      <Field label="Hero Badge / Eyebrow Text">
        <input
          value={form.hero_badge || ""}
          onFocus={selectEditor}
          onChange={(event) => onChange("hero_badge", event.target.value)}
          className={editorClass(activePreviewId, PREVIEW_ID, inputClass)}
          placeholder="Trusted by Filipino families"
        />
      </Field>

      <div
        data-editor-id="editor-hero-badge-text-style"
        onFocusCapture={selectEditor}
        onClick={selectEditor}
      >
        <TextStyleControls
          label="Hero Badge Text Style"
          styles={payload.styles?.text?.hero_badge || {}}
          onChange={(styles) => updateTextStyle("hero_badge", styles)}
          onReset={() => resetTextStyle("hero_badge")}
        />
      </div>

      <div
        data-editor-id="editor-hero-badge-visual-style"
        className={editorClass(
          activePreviewId,
          PREVIEW_ID,
          "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
        )}
        onFocusCapture={selectEditor}
        onClick={selectEditor}
      >
        <h3 className="mb-4 text-sm font-black text-[var(--text-primary)]">
          Hero Badge Visual Style
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Badge Background">
            <input
              type="color"
              value={getScopedValue(
                payload,
                "badges",
                "hero_badge",
                "backgroundColor",
                "#ffffff"
              )}
              onFocus={selectEditor}
              onChange={(event) =>
                updateScopedStyle(
                  "badges",
                  "hero_badge",
                  "backgroundColor",
                  event.target.value
                )
              }
              className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
            />
          </Field>

          <Field label="Badge Text Color">
            <input
              type="color"
              value={getScopedValue(
                payload,
                "badges",
                "hero_badge",
                "color",
                "#2f3f9f"
              )}
              onFocus={selectEditor}
              onChange={(event) =>
                updateScopedStyle(
                  "badges",
                  "hero_badge",
                  "color",
                  event.target.value
                )
              }
              className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
            />
          </Field>

          <Field label="Badge Border Color">
            <input
              type="color"
              value={getScopedValue(
                payload,
                "badges",
                "hero_badge",
                "borderColor",
                "#cfe5f8"
              )}
              onFocus={selectEditor}
              onChange={(event) =>
                updateScopedStyle(
                  "badges",
                  "hero_badge",
                  "borderColor",
                  event.target.value
                )
              }
              className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
            />
          </Field>

          <Field label="Badge Shape">
            <select
              className={inputClass}
              value={getScopedValue(
                payload,
                "badges",
                "hero_badge",
                "shape",
                "pill"
              )}
              onFocus={selectEditor}
              onChange={(event) =>
                updateShape("badges", "hero_badge", event.target.value)
              }
            >
              {SHAPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </section>
  );
}
