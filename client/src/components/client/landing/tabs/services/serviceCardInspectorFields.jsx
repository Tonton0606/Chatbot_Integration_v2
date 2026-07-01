import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { inputClass } from "../../shared";

export const DESCRIPTION_MODE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "bullets", label: "Bulleted List" },
  { value: "numbered", label: "Numbered List" },
  { value: "checklist", label: "Checklist" },
  { value: "quote", label: "Quote" },
];

export const CONTENT_DISPLAY_MODE_OPTIONS = [
  { value: "upfront", label: "Upfront" },
  { value: "collapse", label: "Collapsible" },
  { value: "modal", label: "Popup Modal" },
];

export const TARGET_LABELS = {
  card: "Card Properties",
  title: "Title Properties",
  description: "Description Properties",
  button: "Button Properties",
  media: "Media Properties",
};

export function cleanValue(value) {
  return String(value || "").trim();
}

export function shouldShowGroup(selectedTarget, group) {
  if (!selectedTarget || selectedTarget === "card") return true;

  return selectedTarget === group;
}

export function shouldOpenGroup(selectedTarget, group, defaultOpen) {
  if (!selectedTarget || selectedTarget === "card") return defaultOpen;

  return selectedTarget === group;
}

export function InspectorGroup({
  title,
  selectedTarget,
  groupKey,
  defaultOpen = false,
  children,
}) {
  const [manualOpen, setManualOpen] = useState(defaultOpen);
  const isTargeted = selectedTarget && selectedTarget !== "card";
  const open = isTargeted
    ? shouldOpenGroup(selectedTarget, groupKey, defaultOpen)
    : manualOpen;

  useEffect(() => {
    if (!isTargeted) {
      setManualOpen(defaultOpen);
    }
  }, [defaultOpen, isTargeted]);

  if (!shouldShowGroup(selectedTarget, groupKey)) {
    return null;
  }

  return (
    <section className="border-b border-[var(--border-color)]">
      <button
        type="button"
        onClick={() => {
          if (!isTargeted) {
            setManualOpen((value) => !value);
          }
        }}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {title}
        </span>

        {open ? (
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
        )}
      </button>

      {open && <div className="grid gap-3 pb-4">{children}</div>}
    </section>
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
