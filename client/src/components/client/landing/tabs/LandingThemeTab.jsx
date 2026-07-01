import { Palette } from "lucide-react";

import {
  DEFAULT_THEME_COLORS,
  LANDING_THEME_PRESETS as PRESETS,
} from "../../../../constants/landing/landingThemePresets";
import { Field, inputClass, SaveButton, SectionHeader } from "../shared";
import { ColorField, ThemePresetGrid } from "./theme/ThemeFields";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getPayload(form = {}) {
  return asObject(form.payload);
}

function getStyles(form = {}) {
  return asObject(getPayload(form).styles);
}

function getThemeColors(form = {}) {
  const theme = asObject(getStyles(form).theme);

  return {
    preset_id: theme.preset_id,
    preset_name: theme.preset_name,
    page_background_color:
      theme.page_background_color ||
      DEFAULT_THEME_COLORS.page_background_color,
    section_background_color:
      theme.section_background_color ||
      DEFAULT_THEME_COLORS.section_background_color,
    hero_background_color:
      theme.hero_background_color || DEFAULT_THEME_COLORS.hero_background_color,
    hero_text_color: theme.hero_text_color || DEFAULT_THEME_COLORS.hero_text_color,
    heading_color: theme.heading_color || DEFAULT_THEME_COLORS.heading_color,
    body_text_color: theme.body_text_color || DEFAULT_THEME_COLORS.body_text_color,
    card_background_color:
      theme.card_background_color ||
      DEFAULT_THEME_COLORS.card_background_color,
    card_border_color:
      theme.card_border_color || DEFAULT_THEME_COLORS.card_border_color,
  };
}

function getScopedValue(form, scope, key, property, fallback = "") {
  const styles = getStyles(form);
  return styles?.[scope]?.[key]?.[property] || fallback;
}

export default function LandingThemeTab({ form, saving, onChange, onSave }) {
  const themeColors = getThemeColors(form);

  function submit(event) {
    event.preventDefault();
    onSave();
  }

  function updateThemeColor(key, value) {
    const currentPayload = getPayload(form);
    const currentStyles = asObject(currentPayload.styles);
    const currentTheme = asObject(currentStyles.theme);

    onChange("payload", {
      ...currentPayload,
      styles: {
        ...currentStyles,
        theme: {
          ...currentTheme,
          [key]: value,
        },
      },
    });
  }

  function updateScopedStyle(scope, key, property, value) {
    const currentPayload = getPayload(form);
    const currentStyles = asObject(currentPayload.styles);
    const currentScope = asObject(currentStyles[scope]);
    const currentTarget = asObject(currentScope[key]);

    onChange("payload", {
      ...currentPayload,
      styles: {
        ...currentStyles,
        [scope]: {
          ...currentScope,
          [key]: {
            ...currentTarget,
            [property]: value,
          },
        },
      },
    });
  }

  function applyPreset(preset) {
    const currentPayload = getPayload(form);

    onChange("layout_template", preset.id);
    onChange("theme_mode", preset.theme_mode);
    onChange("primary_color", preset.primary_color);
    onChange("secondary_color", preset.secondary_color);

    onChange("payload", {
      ...currentPayload,
      styles: {
        ...(preset.advancedStyles || {}),
        theme: {
          ...(preset.theme || {}),
        },
      },
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <SectionHeader
        icon={Palette}
        title="Theme"
        description="Choose a preset, then fine-tune page, section, card, text, button, badge, and icon colors."
      />

      <ThemePresetGrid
        presets={PRESETS}
        form={form}
        themeColors={themeColors}
        onApplyPreset={applyPreset}
      />

      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
        <div className="mb-5">
          <h3 className="font-black text-[var(--text-primary)]">
            Custom Colors
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Start with global theme colors. Advanced controls below override
            specific page areas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ColorField
            label="Primary Accent Color"
            value={form.primary_color || "#d4af37"}
            placeholder="#d4af37"
            onChange={(value) => onChange("primary_color", value)}
          />

          <ColorField
            label="Secondary / Background Color"
            value={form.secondary_color || "#0f172a"}
            placeholder="#0f172a"
            onChange={(value) => onChange("secondary_color", value)}
          />

          <ColorField
            label="Page Background Color"
            value={themeColors.page_background_color}
            placeholder="#020617"
            onChange={(value) =>
              updateThemeColor("page_background_color", value)
            }
          />

          <ColorField
            label="Default Section Background"
            value={themeColors.section_background_color}
            placeholder="#0f172a"
            onChange={(value) =>
              updateThemeColor("section_background_color", value)
            }
          />

          <ColorField
            label="Hero Background Color"
            value={themeColors.hero_background_color}
            placeholder="#020617"
            onChange={(value) => updateThemeColor("hero_background_color", value)}
          />

          <ColorField
            label="Hero Text Color"
            value={themeColors.hero_text_color}
            placeholder="#ffffff"
            onChange={(value) => updateThemeColor("hero_text_color", value)}
          />

          <ColorField
            label="Default Heading Color"
            value={themeColors.heading_color}
            placeholder="#ffffff"
            onChange={(value) => updateThemeColor("heading_color", value)}
          />

          <ColorField
            label="Default Body Text Color"
            value={themeColors.body_text_color}
            placeholder="#cbd5e1"
            onChange={(value) => updateThemeColor("body_text_color", value)}
          />

          <ColorField
            label="Default Card Background"
            value={themeColors.card_background_color}
            placeholder="#ffffff"
            onChange={(value) =>
              updateThemeColor("card_background_color", value)
            }
          />

          <ColorField
            label="Default Card Border"
            value={themeColors.card_border_color}
            placeholder="#cfe5f8"
            onChange={(value) => updateThemeColor("card_border_color", value)}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
        <div className="mb-5">
          <h3 className="font-black text-[var(--text-primary)]">
            Advanced Visual Controls V1
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            These controls write to payload.styles and are consumed by the new
            renderer style resolver.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ColorField
            label="Services Section Background"
            value={getScopedValue(
              form,
              "sections",
              "services",
              "backgroundColor",
              "#eaf6ff"
            )}
            placeholder="#eaf6ff"
            onChange={(value) =>
              updateScopedStyle("sections", "services", "backgroundColor", value)
            }
          />

          <ColorField
            label="Booking Section Background"
            value={getScopedValue(
              form,
              "sections",
              "booking",
              "backgroundColor",
              "#ffffff"
            )}
            placeholder="#ffffff"
            onChange={(value) =>
              updateScopedStyle("sections", "booking", "backgroundColor", value)
            }
          />

          <ColorField
            label="Service Card Background"
            value={getScopedValue(
              form,
              "cards",
              "default",
              "backgroundColor",
              "#ffffff"
            )}
            placeholder="#ffffff"
            onChange={(value) =>
              updateScopedStyle("cards", "default", "backgroundColor", value)
            }
          />

          <ColorField
            label="Service Card Border"
            value={getScopedValue(
              form,
              "cards",
              "default",
              "borderColor",
              "#cfe5f8"
            )}
            placeholder="#cfe5f8"
            onChange={(value) =>
              updateScopedStyle("cards", "default", "borderColor", value)
            }
          />

          <ColorField
            label="Hero Headline Color"
            value={getScopedValue(
              form,
              "text",
              "hero_headline",
              "color",
              "#ffffff"
            )}
            placeholder="#ffffff"
            onChange={(value) =>
              updateScopedStyle("text", "hero_headline", "color", value)
            }
          />

          <ColorField
            label="Hero Subheadline Color"
            value={getScopedValue(
              form,
              "text",
              "hero_subheadline",
              "color",
              "#eaf6ff"
            )}
            placeholder="#eaf6ff"
            onChange={(value) =>
              updateScopedStyle("text", "hero_subheadline", "color", value)
            }
          />

          <ColorField
            label="Service Heading Color"
            value={getScopedValue(
              form,
              "text",
              "services_heading",
              "color",
              "#2f3f9f"
            )}
            placeholder="#2f3f9f"
            onChange={(value) =>
              updateScopedStyle("text", "services_heading", "color", value)
            }
          />

          <ColorField
            label="Service Body Text Color"
            value={getScopedValue(
              form,
              "text",
              "services_description",
              "color",
              "#334155"
            )}
            placeholder="#334155"
            onChange={(value) =>
              updateScopedStyle("text", "services_description", "color", value)
            }
          />

          <ColorField
            label="Primary Button Background"
            value={getScopedValue(
              form,
              "buttons",
              "primary",
              "backgroundColor",
              form.primary_color || "#ff8a1d"
            )}
            placeholder="#ff8a1d"
            onChange={(value) =>
              updateScopedStyle("buttons", "primary", "backgroundColor", value)
            }
          />

          <ColorField
            label="Primary Button Text"
            value={getScopedValue(form, "buttons", "primary", "color", "#ffffff")}
            placeholder="#ffffff"
            onChange={(value) =>
              updateScopedStyle("buttons", "primary", "color", value)
            }
          />

          <ColorField
            label="Hero Logo/Icon Background"
            value={getScopedValue(
              form,
              "icons",
              "hero_logo",
              "backgroundColor",
              form.primary_color || "#ff8a1d"
            )}
            placeholder="#ff8a1d"
            onChange={(value) =>
              updateScopedStyle("icons", "hero_logo", "backgroundColor", value)
            }
          />

          <ColorField
            label="Hero Logo/Icon Text"
            value={getScopedValue(form, "icons", "hero_logo", "color", "#ffffff")}
            placeholder="#ffffff"
            onChange={(value) =>
              updateScopedStyle("icons", "hero_logo", "color", value)
            }
          />
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Visual Preset">
            <input
              className={inputClass}
              value={form.layout_template || "exponify_premium"}
              readOnly
            />
          </Field>

          <Field label="Theme Mode">
            <select
              className={inputClass}
              value={form.theme_mode || "dark"}
              onChange={(event) => onChange("theme_mode", event.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Field>
        </div>
      </div>

      <SaveButton saving={saving} label="Save Theme" />
    </form>
  );
}
