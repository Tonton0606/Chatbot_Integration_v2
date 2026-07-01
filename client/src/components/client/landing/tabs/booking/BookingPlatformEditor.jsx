import { Eye, EyeOff } from "lucide-react";

import { Field, inputClass } from "../../shared";
import { ColorInput } from "./BookingFieldControls";
import {
  BOOKING_PLATFORM_OPTIONS,
  PLATFORM_DISPLAY_OPTIONS,
  isPlatformVisible,
} from "./bookingTabUtils";

export default function BookingPlatformEditor({
  form,
  platformLabels,
  platformVisibility,
  platformStyles,
  displayMode,
  disabled,
  saving,
  onChange,
  onUpdateDisplayMode,
  onUpdatePlatformLabel,
  onUpdatePlatformVisibility,
  onUpdatePlatformStyle,
}) {
  return (
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Booking Platform
        </p>

        <h3 className="mt-1 font-black text-[var(--text-primary)]">
          Meeting Setup
        </h3>

        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Choose whether visitors select the meeting platform through a dropdown,
          button cards, or a hidden auto-selected value.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Platform Display">
          <select
            value={displayMode}
            onChange={(event) => onUpdateDisplayMode(event.target.value)}
            className={inputClass}
            disabled={disabled}
          >
            {PLATFORM_DISPLAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={
            displayMode === "hidden"
              ? "Auto-selected Platform"
              : "Default Platform"
          }
        >
          <select
            value={form.booking_platform}
            onChange={(event) =>
              onChange("booking_platform", event.target.value)
            }
            className={inputClass}
            disabled={saving}
          >
            {BOOKING_PLATFORM_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {platformLabels[option.key] || option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {displayMode === "cards" && (
        <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Platform Card Colors
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ColorInput
              label="Card Background"
              value={platformStyles.backgroundColor || ""}
              placeholder="#ffffff"
              disabled={disabled}
              onChange={(value) =>
                onUpdatePlatformStyle("backgroundColor", value)
              }
            />

            <ColorInput
              label="Card Text"
              value={platformStyles.color || ""}
              placeholder="#0f172a"
              disabled={disabled}
              onChange={(value) => onUpdatePlatformStyle("color", value)}
            />

            <ColorInput
              label="Card Border"
              value={platformStyles.borderColor || ""}
              placeholder="#e2e8f0"
              disabled={disabled}
              onChange={(value) => onUpdatePlatformStyle("borderColor", value)}
            />

            <ColorInput
              label="Active Background"
              value={platformStyles.activeBackgroundColor || ""}
              placeholder="#f97316"
              disabled={disabled}
              onChange={(value) =>
                onUpdatePlatformStyle("activeBackgroundColor", value)
              }
            />

            <ColorInput
              label="Active Text"
              value={platformStyles.activeTextColor || ""}
              placeholder="#000000"
              disabled={disabled}
              onChange={(value) =>
                onUpdatePlatformStyle("activeTextColor", value)
              }
            />

            <ColorInput
              label="Active Border"
              value={platformStyles.activeBorderColor || ""}
              placeholder="#f97316"
              disabled={disabled}
              onChange={(value) =>
                onUpdatePlatformStyle("activeBorderColor", value)
              }
            />
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Platform Choices
        </p>

        {BOOKING_PLATFORM_OPTIONS.map((platform) => {
          const visible = isPlatformVisible(platformVisibility, platform.key);

          return (
            <div
              key={platform.key}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-black text-[var(--text-primary)]">
                    {platform.label}
                  </h4>

                  <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {visible
                      ? "This platform is available to visitors."
                      : "This platform is hidden from visitor choices."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={disabled || displayMode === "hidden"}
                  onClick={() =>
                    onUpdatePlatformVisibility(platform.key, !visible)
                  }
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

              <div className="mt-4">
                <Field label="Display Label">
                  <input
                    value={platformLabels[platform.key] || ""}
                    onChange={(event) =>
                      onUpdatePlatformLabel(platform.key, event.target.value)
                    }
                    className={inputClass}
                    placeholder={platform.label}
                    disabled={disabled}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
