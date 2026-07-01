import TextStyleControls from "../../TextStyleControls";

import { inputClass } from "../../shared";

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

function ColorRow({ label, value, fallback, onChange }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-bold text-[var(--text-secondary)]">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          value={value || fallback}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border-color)] bg-transparent p-1"
        />

        <input
          className={`${inputClass} h-9 min-w-0 text-xs`}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback}
        />
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-bold text-[var(--text-secondary)]">
        {label}
      </span>

      <select
        className={`${inputClass} h-9 text-xs`}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberRow({
  label,
  value,
  fallback = "",
  min = 0,
  max = 64,
  step = 1,
  suffix = "px",
  onChange,
}) {
  const normalizedValue = value == null ? "" : value;
  const rangeValue = Number.parseFloat(normalizedValue || fallback || 0);

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
        <span className="text-xs font-bold text-[var(--text-secondary)]">
          {label}
        </span>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(rangeValue) ? rangeValue : 0}
          onChange={(event) => onChange(`${event.target.value}${suffix}`)}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
        <span />

        <input
          className={`${inputClass} h-9 text-xs`}
          value={normalizedValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback || `Example: 16${suffix}`}
        />
      </div>
    </div>
  );
}

function updateShapeValue({ updateStyleValue, target, shape }) {
  updateStyleValue(target, "shape", shape);
  updateStyleValue(
    target,
    "borderRadius",
    SHAPE_RADIUS[shape] || SHAPE_RADIUS.rounded_rectangle
  );
}

export default function ServiceCardDesignControls({
  payload,
  saving,
  onUpdateStyleValue,
  onUpdateTextStyle,
  onResetTextStyle,
}) {
  return (
    <>
      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Card Size
        </p>

        <NumberRow
          label="Width"
          value={getStyleValue(payload, "card", "width", "")}
          fallback=""
          min={160}
          max={900}
          onChange={(value) => onUpdateStyleValue("card", "width", value)}
        />

        <NumberRow
          label="Max Width"
          value={getStyleValue(payload, "card", "maxWidth", "")}
          fallback=""
          min={160}
          max={1200}
          onChange={(value) => onUpdateStyleValue("card", "maxWidth", value)}
        />

        <NumberRow
          label="Min Height"
          value={getStyleValue(payload, "card", "minHeight", "")}
          fallback=""
          min={120}
          max={900}
          onChange={(value) => onUpdateStyleValue("card", "minHeight", value)}
        />

        <NumberRow
          label="Height"
          value={getStyleValue(payload, "card", "height", "")}
          fallback=""
          min={120}
          max={900}
          onChange={(value) => onUpdateStyleValue("card", "height", value)}
        />

        <NumberRow
          label="Padding"
          value={getStyleValue(payload, "card", "padding", "")}
          fallback=""
          min={0}
          max={80}
          onChange={(value) => onUpdateStyleValue("card", "padding", value)}
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Button Style
        </p>

        <ColorRow
          label="Background"
          value={getStyleValue(payload, "cta", "backgroundColor", "")}
          fallback="#2563eb"
          onChange={(value) =>
            onUpdateStyleValue("cta", "backgroundColor", value)
          }
        />

        <ColorRow
          label="Text"
          value={getStyleValue(payload, "cta", "color", "")}
          fallback="#ffffff"
          onChange={(value) => onUpdateStyleValue("cta", "color", value)}
        />

        <ColorRow
          label="Border"
          value={getStyleValue(payload, "cta", "borderColor", "")}
          fallback="#2563eb"
          onChange={(value) => onUpdateStyleValue("cta", "borderColor", value)}
        />

        <NumberRow
          label="Border Width"
          value={getStyleValue(payload, "cta", "borderWidth", "")}
          fallback="1px"
          min={0}
          max={8}
          onChange={(value) => onUpdateStyleValue("cta", "borderWidth", value)}
        />

        <SelectRow
          label="Shape"
          value={getStyleValue(payload, "cta", "shape", "rounded_rectangle")}
          options={SHAPE_OPTIONS}
          onChange={(value) =>
            updateShapeValue({
              updateStyleValue: onUpdateStyleValue,
              target: "cta",
              shape: value,
            })
          }
        />

        <NumberRow
          label="Radius"
          value={getStyleValue(payload, "cta", "borderRadius", "")}
          fallback="12px"
          min={0}
          max={48}
          onChange={(value) => onUpdateStyleValue("cta", "borderRadius", value)}
        />

        <TextStyleControls
          label="Button Text Style"
          styles={payload?.styles?.cta || {}}
          onChange={(styles) => onUpdateTextStyle("cta", styles)}
          onReset={() => onResetTextStyle("cta")}
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Media Style
        </p>

        <SelectRow
          label="Shape"
          value={getStyleValue(payload, "media", "shape", "rounded_rectangle")}
          options={SHAPE_OPTIONS}
          onChange={(value) =>
            updateShapeValue({
              updateStyleValue: onUpdateStyleValue,
              target: "media",
              shape: value,
            })
          }
        />

        <NumberRow
          label="Radius"
          value={getStyleValue(payload, "media", "borderRadius", "")}
          fallback="18px"
          min={0}
          max={48}
          onChange={(value) =>
            onUpdateStyleValue("media", "borderRadius", value)
          }
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Card Style
        </p>

        <ColorRow
          label="Background"
          value={getStyleValue(payload, "card", "backgroundColor", "")}
          fallback="#ffffff"
          onChange={(value) =>
            onUpdateStyleValue("card", "backgroundColor", value)
          }
        />

        <ColorRow
          label="Border"
          value={getStyleValue(payload, "card", "borderColor", "")}
          fallback="#cfe5f8"
          onChange={(value) => onUpdateStyleValue("card", "borderColor", value)}
        />

        <NumberRow
          label="Border Width"
          value={getStyleValue(payload, "card", "borderWidth", "")}
          fallback="1px"
          min={0}
          max={8}
          onChange={(value) => onUpdateStyleValue("card", "borderWidth", value)}
        />

        <NumberRow
          label="Radius"
          value={getStyleValue(payload, "card", "borderRadius", "")}
          fallback="18px"
          min={0}
          max={48}
          onChange={(value) =>
            onUpdateStyleValue("card", "borderRadius", value)
          }
        />

        <SelectRow
          label="Shape"
          value={getStyleValue(payload, "card", "shape", "rounded_rectangle")}
          options={SHAPE_OPTIONS}
          onChange={(value) =>
            updateShapeValue({
              updateStyleValue: onUpdateStyleValue,
              target: "card",
              shape: value,
            })
          }
        />

        <SelectRow
          label="Shadow"
          value={getStyleValue(payload, "card", "boxShadow", "")}
          options={SHADOW_OPTIONS}
          onChange={(value) => onUpdateStyleValue("card", "boxShadow", value)}
        />
      </div>
    </>
  );
}
