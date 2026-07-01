import { inputClass } from "../../shared";

export const LAYOUT_OPTIONS = [
  { value: "grid", label: "Grid Cards" },
  { value: "list", label: "List View" },
  { value: "feature", label: "Feature Showcase" },
  { value: "pricing", label: "Pricing Cards" },
];

export const MEDIA_OPTIONS = [
  { value: "image", label: "Image / Video" },
  { value: "text_only", label: "Text Only" },
  { value: "image_left", label: "Image Left" },
  { value: "background_media", label: "Background Media" },
];

export const INTERACTION_OPTIONS = [
  { value: "direct", label: "Direct CTA" },
  { value: "collapse", label: "Expandable / Collapse" },
  { value: "modal", label: "Popup Modal" },
  { value: "drawer", label: "Side Drawer" },
];

export const CARD_SIZE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "large", label: "Large" },
];

export const COLUMN_OPTIONS = [
  { value: "1", label: "1 card" },
  { value: "2", label: "2 cards" },
  { value: "3", label: "3 cards" },
  { value: "4", label: "4 cards" },
];

export const BACKGROUND_PRESETS = [
  { value: "", label: "Theme Default" },
  { value: "#ffffff", label: "White" },
  { value: "#f8fafc", label: "Soft White" },
  { value: "#eff6ff", label: "Light Blue" },
  { value: "#e0f2fe", label: "Sky Blue" },
  { value: "#0f172a", label: "Dark Navy" },
  { value: "#1e3a8a", label: "Royal Blue" },
  { value: "#fef3c7", label: "Soft Gold" },
];

export const SECTION_DESCRIPTION_MODE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "bullets", label: "Bulleted List" },
  { value: "numbered", label: "Numbered List" },
  { value: "checklist", label: "Checklist" },
  { value: "quote", label: "Quote" },
];

export function SelectRow({ label, value, disabled, options, onChange }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-bold text-[var(--text-secondary)]">
        {label}
      </span>

      <select
        className={`${inputClass} h-9 text-xs`}
        disabled={disabled}
        value={value}
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

export function ColorControl({
  label,
  value,
  disabled,
  placeholder = "Theme default",
  onChange,
}) {
  const safeValue = value || "";

  return (
    <div className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>

      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
        <input
          type="color"
          value={safeValue || "#ffffff"}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-11 cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={label}
        />

        <input
          className={inputClass}
          value={safeValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export function CheckboxRow({ checked, disabled, label, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
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
