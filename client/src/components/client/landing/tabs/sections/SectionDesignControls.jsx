import { inputClass } from "../../shared";
import {
  getStyleValue,
  SHAPE_OPTIONS,
  SHAPE_RADIUS,
} from "../services/servicesTabUtils";

const SHADOW_OPTIONS = [
  { value: "", label: "Theme Default" },
  { value: "none", label: "None" },
  { value: "0 10px 30px rgba(15, 23, 42, 0.08)", label: "Soft" },
  { value: "0 18px 48px rgba(15, 23, 42, 0.14)", label: "Medium" },
  { value: "0 28px 70px rgba(15, 23, 42, 0.20)", label: "Strong" },
];

function ColorRow({ label, value, placeholder = "Theme Default", onChange }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-bold text-[var(--text-secondary)]">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border-color)] bg-transparent p-1"
        />

        <input
          className={`${inputClass} h-9 min-w-0 text-xs`}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3">
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
  placeholder = "Theme Default",
  min = 0,
  max = 160,
  step = 1,
  suffix = "px",
  onChange,
}) {
  const normalizedValue = value == null ? "" : value;
  const rangeValue = Number.parseFloat(normalizedValue || 0);

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3">
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

      <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3">
        <span />

        <input
          className={`${inputClass} h-9 text-xs`}
          value={normalizedValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function updateShapeValue({ onUpdateStyleValue, target, shape }) {
  onUpdateStyleValue(target, "shape", shape);
  onUpdateStyleValue(
    target,
    "borderRadius",
    SHAPE_RADIUS[shape] || SHAPE_RADIUS.rounded_rectangle
  );
}

export default function SectionDesignControls({
  payload,
  saving,
  onUpdateStyleValue,
}) {
  return (
    <div className="grid gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      <div>
        <h4 className="font-black text-[var(--text-primary)]">
          Section Design
        </h4>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Blank fields keep the current theme default. Set values only when this
          section needs its own design.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Section Background
        </p>

        <ColorRow
          label="Background"
          value={getStyleValue(payload, "section", "backgroundColor", "")}
          onChange={(value) =>
            onUpdateStyleValue("section", "backgroundColor", value)
          }
        />

        <ColorRow
          label="Text Color"
          value={getStyleValue(payload, "section", "color", "")}
          onChange={(value) => onUpdateStyleValue("section", "color", value)}
        />

        <NumberRow
          label="Padding Top"
          value={getStyleValue(payload, "section", "paddingTop", "")}
          placeholder="Theme Default"
          min={0}
          max={240}
          onChange={(value) => onUpdateStyleValue("section", "paddingTop", value)}
        />

        <NumberRow
          label="Padding Bottom"
          value={getStyleValue(payload, "section", "paddingBottom", "")}
          placeholder="Theme Default"
          min={0}
          max={240}
          onChange={(value) =>
            onUpdateStyleValue("section", "paddingBottom", value)
          }
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Section Container
        </p>

        <ColorRow
          label="Background"
          value={getStyleValue(payload, "container", "backgroundColor", "")}
          onChange={(value) =>
            onUpdateStyleValue("container", "backgroundColor", value)
          }
        />

        <ColorRow
          label="Border"
          value={getStyleValue(payload, "container", "borderColor", "")}
          onChange={(value) =>
            onUpdateStyleValue("container", "borderColor", value)
          }
        />

        <NumberRow
          label="Border Width"
          value={getStyleValue(payload, "container", "borderWidth", "")}
          placeholder="Theme Default"
          min={0}
          max={8}
          onChange={(value) =>
            onUpdateStyleValue("container", "borderWidth", value)
          }
        />

        <NumberRow
          label="Padding"
          value={getStyleValue(payload, "container", "padding", "")}
          placeholder="Theme Default"
          min={0}
          max={120}
          onChange={(value) => onUpdateStyleValue("container", "padding", value)}
        />

        <SelectRow
          label="Shape"
          value={getStyleValue(payload, "container", "shape", "")}
          options={[{ value: "", label: "Theme Default" }, ...SHAPE_OPTIONS]}
          onChange={(value) =>
            updateShapeValue({
              onUpdateStyleValue,
              target: "container",
              shape: value,
            })
          }
        />

        <NumberRow
          label="Radius"
          value={getStyleValue(payload, "container", "borderRadius", "")}
          placeholder="Theme Default"
          min={0}
          max={80}
          onChange={(value) =>
            onUpdateStyleValue("container", "borderRadius", value)
          }
        />

        <SelectRow
          label="Shadow"
          value={getStyleValue(payload, "container", "boxShadow", "")}
          options={SHADOW_OPTIONS}
          onChange={(value) =>
            onUpdateStyleValue("container", "boxShadow", value)
          }
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Item Grid
        </p>

        <SelectRow
          label="Desktop Columns"
          value={getStyleValue(payload, "grid", "desktopColumns", "")}
          options={[
            { value: "", label: "Theme Default" },
            { value: "1", label: "1 column" },
            { value: "2", label: "2 columns" },
            { value: "3", label: "3 columns" },
            { value: "4", label: "4 columns" },
          ]}
          onChange={(value) =>
            onUpdateStyleValue("grid", "desktopColumns", value)
          }
        />

        <SelectRow
          label="Tablet Columns"
          value={getStyleValue(payload, "grid", "tabletColumns", "")}
          options={[
            { value: "", label: "Theme Default" },
            { value: "1", label: "1 column" },
            { value: "2", label: "2 columns" },
            { value: "3", label: "3 columns" },
          ]}
          onChange={(value) =>
            onUpdateStyleValue("grid", "tabletColumns", value)
          }
        />

        <SelectRow
          label="Mobile Columns"
          value={getStyleValue(payload, "grid", "mobileColumns", "")}
          options={[
            { value: "", label: "Theme Default" },
            { value: "1", label: "1 column" },
            { value: "2", label: "2 columns" },
          ]}
          onChange={(value) =>
            onUpdateStyleValue("grid", "mobileColumns", value)
          }
        />

        <NumberRow
          label="Gap"
          value={getStyleValue(payload, "grid", "gap", "")}
          placeholder="Theme Default"
          min={0}
          max={80}
          onChange={(value) => onUpdateStyleValue("grid", "gap", value)}
        />
      </div>
    </div>
  );
}
