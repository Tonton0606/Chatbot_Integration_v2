import { Check } from "lucide-react";

import { Field, inputClass } from "../../shared";

export function ColorField({ label, value, placeholder, onChange }) {
  return (
    <Field label={label}>
      <div className="flex gap-3">
        <input
          type="color"
          value={String(value || placeholder || "#000000")}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
        />

        <input
          className={inputClass}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </Field>
  );
}

export function ThemePreview({ preset }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${preset.preview.bg} ${
        preset.theme_mode === "light"
          ? "border border-slate-200"
          : "border border-white/10"
      }`}
    >
      <div className="p-4">
        <div className={`h-3 w-24 rounded-full ${preset.preview.accent}`} />
        <div className="mt-4 space-y-2">
          <div className={`h-2 w-32 rounded-full ${preset.preview.line1}`} />
          <div className={`h-2 w-20 rounded-full ${preset.preview.line2}`} />
        </div>
        <div className={`mt-5 h-10 w-28 rounded-2xl ${preset.preview.button}`} />
      </div>

      <div className={`${preset.preview.sectionA} p-3`}>
        <div className={`h-8 rounded-xl ${preset.preview.card}`} />
      </div>

      <div className={`${preset.preview.sectionB} p-3`}>
        <div className="grid grid-cols-3 gap-2">
          <div className={`h-7 rounded-lg ${preset.preview.card}`} />
          <div className={`h-7 rounded-lg ${preset.preview.card}`} />
          <div className={`h-7 rounded-lg ${preset.preview.card}`} />
        </div>
      </div>
    </div>
  );
}

export function ThemePresetGrid({ presets, form, themeColors, onApplyPreset }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {presets.map((preset) => {
        const selected =
          form.layout_template === preset.id ||
          themeColors.preset_id === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyPreset(preset)}
            className={`relative rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${
              selected
                ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)] shadow-lg"
                : "border-[var(--border-color)] bg-[var(--hover-bg)] hover:border-[var(--brand-gold)]/50"
            }`}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-gold)] text-black">
                <Check className="h-3 w-3" />
              </span>
            )}

            <ThemePreview preset={preset} />

            <h3 className="mt-4 text-sm font-black">{preset.name}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {preset.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
