import { Field, inputClass } from "../../shared";
import {
  getStyleValue,
  SHAPE_OPTIONS,
  SHAPE_RADIUS,
} from "./servicesTabUtils";

const SHADOW_OPTIONS = [
  { value: "", label: "Theme Default" },
  { value: "none", label: "None" },
  { value: "0 10px 30px rgba(15, 23, 42, 0.08)", label: "Soft" },
  { value: "0 18px 48px rgba(15, 23, 42, 0.14)", label: "Medium" },
  { value: "0 28px 70px rgba(15, 23, 42, 0.20)", label: "Strong" },
];

function ColorControl({ label, value, fallback, onChange }) {
  return (
    <Field label={label}>
      <div className="flex gap-3">
        <input
          type="color"
          value={value || fallback}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
        />

        <input
          className={inputClass}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback}
        />
      </div>
    </Field>
  );
}

function NumberControl({
  label,
  value,
  fallback = "",
  min = 0,
  max = 64,
  step = 1,
  suffix = "px",
  onChange,
}) {
  const normalizedValue = value === undefined || value === null ? "" : value;

  return (
    <Field label={label}>
      <div className="grid gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.parseFloat(normalizedValue || fallback || 0)}
          onChange={(event) => onChange(`${event.target.value}${suffix}`)}
          className="w-full"
        />

        <input
          className={inputClass}
          value={normalizedValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback ? `${fallback}` : `Example: 16${suffix}`}
        />
      </div>
    </Field>
  );
}

function SelectControl({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select
        className={inputClass}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default function ServiceCardStyleControls({
  payload,
  onUpdateStyleValue,
}) {
  function updateShape(target, shape) {
    onUpdateStyleValue(target, "shape", shape);
    onUpdateStyleValue(
      target,
      "borderRadius",
      SHAPE_RADIUS[shape] || SHAPE_RADIUS.rounded_rectangle
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
        <h4 className="mb-4 text-sm font-black text-[var(--text-primary)]">
          Card Visual Style
        </h4>

        <div className="grid gap-4 md:grid-cols-2">
          <ColorControl
            label="Card Background"
            value={getStyleValue(payload, "card", "backgroundColor", "")}
            fallback="#ffffff"
            onChange={(value) =>
              onUpdateStyleValue("card", "backgroundColor", value)
            }
          />

          <ColorControl
            label="Card Border"
            value={getStyleValue(payload, "card", "borderColor", "")}
            fallback="#cfe5f8"
            onChange={(value) =>
              onUpdateStyleValue("card", "borderColor", value)
            }
          />

          <NumberControl
            label="Card Border Width"
            value={getStyleValue(payload, "card", "borderWidth", "")}
            fallback="1px"
            min={0}
            max={8}
            onChange={(value) => onUpdateStyleValue("card", "borderWidth", value)}
          />

          <NumberControl
            label="Card Radius"
            value={getStyleValue(payload, "card", "borderRadius", "")}
            fallback="18px"
            min={0}
            max={48}
            onChange={(value) =>
              onUpdateStyleValue("card", "borderRadius", value)
            }
          />

          <SelectControl
            label="Card Shape"
            value={getStyleValue(payload, "card", "shape", "rounded_rectangle")}
            onChange={(value) => updateShape("card", value)}
            options={SHAPE_OPTIONS}
          />

          <SelectControl
            label="Card Shadow"
            value={getStyleValue(payload, "card", "boxShadow", "")}
            onChange={(value) => onUpdateStyleValue("card", "boxShadow", value)}
            options={SHADOW_OPTIONS}
          />

          <SelectControl
            label="Media Shape"
            value={getStyleValue(payload, "media", "shape", "rounded_rectangle")}
            onChange={(value) => updateShape("media", value)}
            options={SHAPE_OPTIONS}
          />

          <NumberControl
            label="Media Radius"
            value={getStyleValue(payload, "media", "borderRadius", "")}
            fallback="18px"
            min={0}
            max={48}
            onChange={(value) =>
              onUpdateStyleValue("media", "borderRadius", value)
            }
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
        <h4 className="mb-4 text-sm font-black text-[var(--text-primary)]">
          Button Visual Style
        </h4>

        <div className="grid gap-4 md:grid-cols-2">
          <ColorControl
            label="Button Background"
            value={getStyleValue(payload, "cta", "backgroundColor", "")}
            fallback="#2563eb"
            onChange={(value) =>
              onUpdateStyleValue("cta", "backgroundColor", value)
            }
          />

          <ColorControl
            label="Button Text Color"
            value={getStyleValue(payload, "cta", "color", "")}
            fallback="#ffffff"
            onChange={(value) => onUpdateStyleValue("cta", "color", value)}
          />

          <ColorControl
            label="Button Border"
            value={getStyleValue(payload, "cta", "borderColor", "")}
            fallback="#2563eb"
            onChange={(value) =>
              onUpdateStyleValue("cta", "borderColor", value)
            }
          />

          <NumberControl
            label="Button Border Width"
            value={getStyleValue(payload, "cta", "borderWidth", "")}
            fallback="1px"
            min={0}
            max={8}
            onChange={(value) => onUpdateStyleValue("cta", "borderWidth", value)}
          />

          <SelectControl
            label="Button Shape"
            value={getStyleValue(payload, "cta", "shape", "rounded_rectangle")}
            onChange={(value) => updateShape("cta", value)}
            options={SHAPE_OPTIONS}
          />

          <NumberControl
            label="Button Radius"
            value={getStyleValue(payload, "cta", "borderRadius", "")}
            fallback="12px"
            min={0}
            max={48}
            onChange={(value) =>
              onUpdateStyleValue("cta", "borderRadius", value)
            }
          />
        </div>
      </div>
    </div>
  );
}
