import { Sparkles } from "lucide-react";

import { Field, inputClass, SectionHeader } from "../../shared";
import {
  SHAPE_OPTIONS,
  editorClass,
  getScopedValue,
} from "./generalTabUtils";

export default function HeroLogoSection({
  form,
  payload,
  activePreviewId,
  onEditorFocus,
  updateScopedStyle,
  updateShape,
}) {
  function selectEditor(previewId) {
    onEditorFocus?.(previewId);
  }

  return (
    <section
      data-editor-id="editor-hero-logo"
      className={editorClass(
        activePreviewId,
        "hero-logo",
        "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
      )}
      onFocusCapture={() => selectEditor("hero-logo")}
      onClick={() => selectEditor("hero-logo")}
    >
      <SectionHeader
        icon={Sparkles}
        title="Hero Icon / Logo Shape"
        description="Controls the fallback icon style when no logo is uploaded, and supports logo border radius."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Icon Background">
          <input
            type="color"
            value={getScopedValue(
              payload,
              "icons",
              "hero_logo",
              "backgroundColor",
              form.primary_color || "#ff8a1d"
            )}
            onFocus={() => selectEditor("hero-logo")}
            onChange={(event) =>
              updateScopedStyle(
                "icons",
                "hero_logo",
                "backgroundColor",
                event.target.value
              )
            }
            className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
          />
        </Field>

        <Field label="Icon Text Color">
          <input
            type="color"
            value={getScopedValue(
              payload,
              "icons",
              "hero_logo",
              "color",
              "#ffffff"
            )}
            onFocus={() => selectEditor("hero-logo")}
            onChange={(event) =>
              updateScopedStyle(
                "icons",
                "hero_logo",
                "color",
                event.target.value
              )
            }
            className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
          />
        </Field>

        <Field label="Icon Shape">
          <select
            className={inputClass}
            value={getScopedValue(
              payload,
              "icons",
              "hero_logo",
              "shape",
              "rounded_rectangle"
            )}
            onFocus={() => selectEditor("hero-logo")}
            onChange={(event) =>
              updateShape("icons", "hero_logo", event.target.value)
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
    </section>
  );
}
