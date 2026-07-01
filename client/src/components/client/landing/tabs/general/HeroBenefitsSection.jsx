import { Plus, Trash2 } from "lucide-react";

import TextStyleControls from "../../TextStyleControls";
import { Field, inputClass, textareaClass } from "../../shared";
import {
  SHAPE_OPTIONS,
  editorClass,
  getScopedValue,
} from "./generalTabUtils";

function getBenefitStyleKeys(index) {
  return {
    card: `hero_benefit_card_${index}`,
    badge: `hero_benefit_badge_${index}`,
    title: `hero_benefit_title_${index}`,
    description: `hero_benefit_description_${index}`,
  };
}

export default function HeroBenefitsSection({
  payload = {},
  heroBenefits = [],
  activePreviewId,
  onEditorFocus,
  updateBenefit,
  addBenefit,
  removeBenefit,
  updateTextStyle,
  resetTextStyle,
  updateScopedStyle,
  updateShape,
}) {
  function selectEditor(previewId) {
    onEditorFocus?.(previewId);
  }

  return (
    <div
      data-editor-id="editor-hero-benefits"
      className={editorClass(activePreviewId, "hero-benefits", "grid gap-3")}
      onFocusCapture={() => selectEditor("hero-benefits")}
      onClick={() => selectEditor("hero-benefits")}
    >
      {heroBenefits.map((benefit, index) => {
        const previewId = `hero-benefit-${index}`;
        const styleKeys = getBenefitStyleKeys(index);

        return (
          <div
            key={`benefit-${index}`}
            data-editor-id={`editor-${previewId}`}
            className={editorClass(
              activePreviewId,
              previewId,
              "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
            )}
            onFocusCapture={() => selectEditor(previewId)}
            onClick={() => selectEditor(previewId)}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[var(--text-primary)]">
                Benefit {index + 1}
              </p>

              <button
                type="button"
                onClick={() => removeBenefit(index)}
                className="inline-flex h-8 items-center rounded-xl border border-[var(--border-color)] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)]"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title">
                <input
                  value={benefit.title || ""}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateBenefit(index, "title", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Life Protection"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={benefit.description || ""}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateBenefit(index, "description", event.target.value)
                  }
                  className={textareaClass}
                  placeholder="Secure your family's future."
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 md:grid-cols-2">
              <Field label="Card Background">
                <input
                  type="color"
                  value={getScopedValue(
                    payload,
                    "cards",
                    styleKeys.card,
                    "backgroundColor",
                    "#ffffff"
                  )}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateScopedStyle(
                      "cards",
                      styleKeys.card,
                      "backgroundColor",
                      event.target.value
                    )
                  }
                  className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
                />
              </Field>

              <Field label="Card Border Color">
                <input
                  type="color"
                  value={getScopedValue(
                    payload,
                    "cards",
                    styleKeys.card,
                    "borderColor",
                    "#cfe5f8"
                  )}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateScopedStyle(
                      "cards",
                      styleKeys.card,
                      "borderColor",
                      event.target.value
                    )
                  }
                  className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
                />
              </Field>

              <Field label="Card Shape">
                <select
                  className={inputClass}
                  value={getScopedValue(
                    payload,
                    "cards",
                    styleKeys.card,
                    "shape",
                    "rounded_rectangle"
                  )}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateShape("cards", styleKeys.card, event.target.value)
                  }
                >
                  {SHAPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Card Shadow">
                <select
                  className={inputClass}
                  value={getScopedValue(
                    payload,
                    "cards",
                    styleKeys.card,
                    "boxShadow",
                    ""
                  )}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateScopedStyle(
                      "cards",
                      styleKeys.card,
                      "boxShadow",
                      event.target.value
                    )
                  }
                >
                  <option value="">Default</option>
                  <option value="none">None</option>
                  <option value="0 10px 30px rgba(15, 23, 42, 0.08)">
                    Soft
                  </option>
                  <option value="0 20px 50px rgba(15, 23, 42, 0.16)">
                    Strong
                  </option>
                </select>
              </Field>

              <Field label="Number Badge Background">
                <input
                  type="color"
                  value={getScopedValue(
                    payload,
                    "badges",
                    styleKeys.badge,
                    "backgroundColor",
                    "#ff8a1d"
                  )}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateScopedStyle(
                      "badges",
                      styleKeys.badge,
                      "backgroundColor",
                      event.target.value
                    )
                  }
                  className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
                />
              </Field>

              <Field label="Number Badge Text Color">
                <input
                  type="color"
                  value={getScopedValue(
                    payload,
                    "badges",
                    styleKeys.badge,
                    "color",
                    "#ffffff"
                  )}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateScopedStyle(
                      "badges",
                      styleKeys.badge,
                      "color",
                      event.target.value
                    )
                  }
                  className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4">
              <TextStyleControls
                label={`Benefit ${index + 1} Title Style`}
                styles={payload.styles?.text?.[styleKeys.title] || {}}
                onChange={(styles) => updateTextStyle(styleKeys.title, styles)}
                onReset={() => resetTextStyle(styleKeys.title)}
              />

              <TextStyleControls
                label={`Benefit ${index + 1} Description Style`}
                styles={payload.styles?.text?.[styleKeys.description] || {}}
                onChange={(styles) =>
                  updateTextStyle(styleKeys.description, styles)
                }
                onReset={() => resetTextStyle(styleKeys.description)}
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addBenefit}
        className="inline-flex h-10 w-fit items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-gold)]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Benefit
      </button>
    </div>
  );
}
