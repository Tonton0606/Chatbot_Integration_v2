import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Eye,
  EyeOff,
  Mail,
  Map,
  MapPin,
  Navigation,
  Palette,
  Phone,
  Save,
} from "lucide-react";

import { MapCanvas } from "../../../public_landing/RendererMap";
import { DEFAULT_LANDING_MAP } from "../../../../services/landing/landingMap";
import { Field, inputClass, textareaClass } from "../shared";

const MAP_THEMES = [
  { value: "standard", label: "Standard" },
  { value: "warm", label: "Warm" },
  { value: "mono", label: "Mono" },
  { value: "midnight", label: "Midnight" },
  { value: "dark_blue", label: "Dark Blue" },
  { value: "custom", label: "Custom Hex Color" },
];

const responsiveFieldGrid =
  "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]";

const compactFieldGrid =
  "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]";

function buildInitialMapForm(mapConfig = {}) {
  return {
    ...DEFAULT_LANDING_MAP,
    ...(mapConfig || {}),
  };
}

function normalizeHexColor(value, fallback = "#c9930c") {
  const rawValue = String(value || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(rawValue)) return rawValue;
  if (/^[0-9a-f]{6}$/i.test(rawValue)) return `#${rawValue}`;

  return fallback;
}

function SettingsGroup({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-black text-[var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function LandingMapTab({
  mapConfig,
  saving,
  onChange,
  onSave,
}) {
  const [form, setForm] = useState(() => buildInitialMapForm(mapConfig));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(buildInitialMapForm(mapConfig));
    setDirty(false);
    setSaved(false);
  }, [mapConfig?.id, mapConfig?.landing_page_id]);

  const liveMapConfig = useMemo(() => buildInitialMapForm(form), [form]);

  function updateField(key, value) {
    setForm((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      onChange?.(next);
      setDirty(true);
      setSaved(false);
      return next;
    });
  }

  async function handleSave() {
    const savedMap = await onSave?.(form);

    if (savedMap) {
      setDirty(false);
      setSaved(true);
    }
  }

  return (
    <div className="grid gap-6" data-editor-id="editor-map-location">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-black text-[var(--text-primary)]">
              Map / Location
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Add a public location block with contact details, marker text,
              and a live map preview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex w-fit items-center rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--brand-gold)]">
              {saving
                ? "Saving"
                : dirty
                  ? "Unsaved changes"
                  : saved
                    ? "Saved"
                    : "Manual save"}
            </span>

            <button
              type="button"
              disabled={saving || !dirty}
              onClick={handleSave}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-5">
          <SettingsGroup icon={Map} title="Section Information">
            <div className={responsiveFieldGrid}>
              <Field label="Section Title">
                <input
                  value={form.section_title}
                  onChange={(event) =>
                    updateField("section_title", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Find Us"
                />
              </Field>

              <Field label="Section Subtitle">
                <input
                  value={form.section_subtitle}
                  onChange={(event) =>
                    updateField("section_subtitle", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Visit our office"
                />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={MapPin} title="Location Information">
            <div className={responsiveFieldGrid}>
              <Field label="Location Name">
                <input
                  value={form.location_name}
                  onChange={(event) =>
                    updateField("location_name", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Main Office"
                />
              </Field>

              <Field label="Full Address">
                <input
                  value={form.full_address}
                  onChange={(event) =>
                    updateField("full_address", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Street, city, province"
                />
              </Field>

              <Field label="Latitude">
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(event) =>
                    updateField("latitude", event.target.value)
                  }
                  className={inputClass}
                  placeholder="14.5995"
                />
              </Field>

              <Field label="Longitude">
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(event) =>
                    updateField("longitude", event.target.value)
                  }
                  className={inputClass}
                  placeholder="120.9842"
                />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={Phone} title="Contact Information">
            <div className={responsiveFieldGrid}>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className={inputClass}
                  placeholder="+63 900 000 0000"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className={inputClass}
                  placeholder="hello@example.com"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Business Hours">
                <textarea
                  value={form.business_hours}
                  onChange={(event) =>
                    updateField("business_hours", event.target.value)
                  }
                  className={textareaClass}
                  placeholder={"Monday to Friday\n9:00 AM - 6:00 PM"}
                />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={Navigation} title="Call To Action">
            <div className={responsiveFieldGrid}>
              <Field label="CTA Text">
                <input
                  value={form.cta_text}
                  onChange={(event) =>
                    updateField("cta_text", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Get Directions"
                />
              </Field>

              <Field label="CTA Link">
                <input
                  value={form.cta_link}
                  onChange={(event) =>
                    updateField("cta_link", event.target.value)
                  }
                  className={inputClass}
                  placeholder="https://maps.google.com/..."
                />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={MapPin} title="Marker Settings">
            <div className={responsiveFieldGrid}>
              <Field label="Marker Label">
                <input
                  value={form.marker_label}
                  onChange={(event) =>
                    updateField("marker_label", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Our location"
                />
              </Field>

              <Field label="Marker Popup">
                <input
                  value={form.marker_popup}
                  onChange={(event) =>
                    updateField("marker_popup", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Parking available nearby."
                />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={Palette} title="Map Settings">
            <div className={compactFieldGrid}>
              <Field label="Map Zoom">
                <input
                  type="number"
                  min="1"
                  max="19"
                  value={form.map_zoom}
                  onChange={(event) =>
                    updateField("map_zoom", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Map Theme">
                <select
                  value={form.map_theme}
                  onChange={(event) =>
                    updateField("map_theme", event.target.value)
                  }
                  className={inputClass}
                >
                  {MAP_THEMES.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Custom Color">
                <div className="grid gap-2">
                  <input
                    type="color"
                    value={normalizeHexColor(form.custom_color)}
                    onChange={(event) =>
                      updateField("custom_color", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1"
                  />
                  <input
                    value={form.custom_color || ""}
                    onChange={(event) =>
                      updateField("custom_color", event.target.value)
                    }
                    className={inputClass}
                    placeholder="#0f2a44"
                  />
                </div>
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup
            icon={form.is_visible ? Eye : EyeOff}
            title="Visibility Settings"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Map Section
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {form.is_visible !== false
                    ? "Enabled on the public landing page."
                    : "Disabled and hidden from the public landing page."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateField("is_visible", form.is_visible === false)
                }
                className={`inline-flex h-11 min-w-[132px] items-center justify-center rounded-xl px-4 text-sm font-black transition ${
                  form.is_visible !== false
                    ? "bg-[var(--brand-gold)] text-black"
                    : "border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]"
                }`}
              >
                {form.is_visible !== false ? (
                  <Eye className="mr-2 h-4 w-4" />
                ) : (
                  <EyeOff className="mr-2 h-4 w-4" />
                )}
                {form.is_visible !== false ? "Enabled" : "Disabled"}
              </button>
            </div>
          </SettingsGroup>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={handleSave}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-5 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-[var(--text-primary)]">
                Live Map Preview
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Marker follows latitude and longitude.
              </p>
            </div>
          </div>

          <MapCanvas mapConfig={liveMapConfig} compact />

          <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--brand-gold)]" />
              <span>{form.location_name || "Location name not set"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[var(--brand-gold)]" />
              <span>{form.phone || "Phone not set"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--brand-gold)]" />
              <span>{form.email || "Email not set"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[var(--brand-gold)]" />
              <span>{form.business_hours || "Business hours not set"}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
