import { Eye, EyeOff } from "lucide-react";

import { Field, inputClass } from "../../shared";
import { isFieldVisible } from "./bookingTabUtils";

export function FieldTextInput({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  );
}

export function ColorInput({ label, value, placeholder, disabled, onChange }) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
        <input
          type="color"
          value={value || placeholder || "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-11 cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <input
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </Field>
  );
}

export function BookingFieldCopyEditor({
  field,
  labels,
  placeholders,
  fieldVisibility,
  fieldDefaults,
  disabled,
  onUpdateLabel,
  onUpdatePlaceholder,
  onUpdateVisibility,
  onUpdateDefaultValue,
}) {
  const visible = isFieldVisible(fieldVisibility, field.key);

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-black text-[var(--text-primary)]">
            {field.label}
          </h4>

          <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">
            {visible
              ? "This field is visible to visitors."
              : "This field is hidden from visitors. Use auto-fill if you still want a submitted value."}
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onUpdateVisibility(field.key, !visible)}
          className={`inline-flex shrink-0 items-center rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
            visible
              ? "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]"
              : "border-amber-500/20 bg-amber-500/10 text-amber-700"
          }`}
        >
          {visible ? (
            <Eye className="mr-2 h-4 w-4" />
          ) : (
            <EyeOff className="mr-2 h-4 w-4" />
          )}
          {visible ? "Visible" : "Hidden"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Label">
          <input
            value={labels[field.key] || ""}
            onChange={(event) => onUpdateLabel(field.key, event.target.value)}
            className={inputClass}
            placeholder={field.defaultLabel}
            disabled={disabled}
          />
        </Field>

        <Field label="Placeholder">
          <input
            value={placeholders[field.key] || ""}
            onChange={(event) =>
              onUpdatePlaceholder(field.key, event.target.value)
            }
            className={inputClass}
            placeholder={field.defaultPlaceholder}
            disabled={disabled}
          />
        </Field>
      </div>

      {!visible && (
        <div className="mt-4">
          <Field label="Auto-fill Value">
            <input
              value={fieldDefaults[field.key] || ""}
              onChange={(event) =>
                onUpdateDefaultValue(field.key, event.target.value)
              }
              className={inputClass}
              placeholder={`Example value for ${field.defaultLabel}`}
              disabled={disabled}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
