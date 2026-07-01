import { inputClass } from "../../shared";

export const MODAL_SHADOW_OPTIONS = [
  { value: "", label: "Theme Default" },
  { value: "none", label: "None" },
  { value: "0 18px 48px rgba(15, 23, 42, 0.18)", label: "Soft" },
  { value: "0 28px 70px rgba(15, 23, 42, 0.26)", label: "Medium" },
  { value: "0 38px 90px rgba(15, 23, 42, 0.34)", label: "Strong" },
];

export function ColorRow({ label, value, fallback, onChange }) {
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

export function SelectRow({ label, value, options, onChange }) {
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

export function NumberRow({
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

export function CheckboxRow({ checked, disabled, label, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}
