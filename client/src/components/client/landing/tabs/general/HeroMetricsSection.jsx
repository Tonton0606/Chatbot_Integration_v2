import { Plus, Trash2 } from "lucide-react";

import TextStyleControls from "../../TextStyleControls";
import { Field, inputClass, textareaClass } from "../../shared";
import {
  SHAPE_OPTIONS,
  editorClass,
  getScopedValue,
} from "./generalTabUtils";

function getMetricStyleKeys(index) {
  return {
    card: `hero_metric_card_${index}`,
    value: `hero_metric_value_${index}`,
    label: `hero_metric_label_${index}`,
  };
}

export default function HeroMetricsSection({
  payload = {},
  heroMetrics = [],
  activePreviewId,
  onEditorFocus,
  updateMetric,
  addMetric,
  removeMetric,
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
      data-editor-id="editor-hero-metrics"
      className={editorClass(activePreviewId, "hero-metrics", "grid gap-3")}
      onFocusCapture={() => selectEditor("hero-metrics")}
      onClick={() => selectEditor("hero-metrics")}
    >
      {heroMetrics.map((metric, index) => {
        const previewId = `hero-metric-${index}`;
        const styleKeys = getMetricStyleKeys(index);

        return (
          <div
            key={`metric-${index}`}
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
                Metric {index + 1}
              </p>

              <button
                type="button"
                onClick={() => removeMetric(index)}
                className="inline-flex h-8 items-center rounded-xl border border-[var(--border-color)] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)]"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Value">
                <input
                  value={metric.value || ""}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateMetric(index, "value", event.target.value)
                  }
                  className={inputClass}
                  placeholder="113+"
                />
              </Field>

              <Field label="Label">
                <textarea
                  value={metric.label || ""}
                  onFocus={() => selectEditor(previewId)}
                  onChange={(event) =>
                    updateMetric(index, "label", event.target.value)
                  }
                  className={textareaClass}
                  placeholder="Years of Service"
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
            </div>

            <div className="mt-4 grid gap-4">
              <TextStyleControls
                label={`Metric ${index + 1} Value Style`}
                styles={payload.styles?.text?.[styleKeys.value] || {}}
                onChange={(styles) => updateTextStyle(styleKeys.value, styles)}
                onReset={() => resetTextStyle(styleKeys.value)}
              />

              <TextStyleControls
                label={`Metric ${index + 1} Label Style`}
                styles={payload.styles?.text?.[styleKeys.label] || {}}
                onChange={(styles) => updateTextStyle(styleKeys.label, styles)}
                onReset={() => resetTextStyle(styleKeys.label)}
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addMetric}
        className="inline-flex h-10 w-fit items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-gold)]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Metric
      </button>
    </div>
  );
}
