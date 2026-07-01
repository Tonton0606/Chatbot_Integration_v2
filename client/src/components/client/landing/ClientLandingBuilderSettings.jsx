import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

import {
  cardClass,
  Field,
  ImageUrlUploadField,
  inputClass,
  SaveButton,
  SectionHeader,
  textareaClass,
} from "./shared";

export function ClientLandingBuilderSettings({
  landingPage,
  saving,
  onSave,
  onUploadAsset,
}) {
  const [form, setForm] = useState(() => buildInitialForm(landingPage));

  useEffect(() => {
    setForm(buildInitialForm(landingPage));
  }, [landingPage]);

  function update(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <section className={`${cardClass} p-5`}>
      <SectionHeader
        icon={Palette}
        title="Website Settings"
        description="Control theme, brand, hero content, image uploads, booking behavior, and custom domain."
      />

      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Page Title">
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Public Slug">
            <input
              value={form.slug}
              onChange={(event) => update("slug", event.target.value)}
              className={inputClass}
              placeholder="my-business"
            />
          </Field>

          <Field label="Theme Mode">
            <select
              value={form.theme_mode}
              onChange={(event) => update("theme_mode", event.target.value)}
              className={inputClass}
            >
              <option value="dark">Dark Premium</option>
              <option value="light">Light Clean</option>
            </select>
          </Field>

          <Field label="Layout Template">
            <select
              value={form.layout_template}
              onChange={(event) => update("layout_template", event.target.value)}
              className={inputClass}
            >
              <option value="exponify_premium">Exponify Premium</option>
              <option value="personal_brand">Personal Brand</option>
              <option value="portfolio_showcase">Portfolio Showcase</option>
              <option value="clinic_modern">Clinic Modern</option>
              <option value="storefront">Storefront</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ImageUrlUploadField
            label="Logo"
            value={form.logo_url}
            assetType="logo"
            onChange={(value) => update("logo_url", value)}
            onUploadAsset={onUploadAsset}
          />

          <ImageUrlUploadField
            label="Hero Image"
            value={form.hero_image_url}
            assetType="hero"
            onChange={(value) => update("hero_image_url", value)}
            onUploadAsset={onUploadAsset}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hero Badge">
            <input
              value={form.hero_badge}
              onChange={(event) => update("hero_badge", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="CTA Label">
            <input
              value={form.primary_cta_label}
              onChange={(event) =>
                update("primary_cta_label", event.target.value)
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Headline">
          <input
            value={form.headline}
            onChange={(event) => update("headline", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Subheadline">
          <textarea
            value={form.subheadline}
            onChange={(event) => update("subheadline", event.target.value)}
            className={textareaClass}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Primary Color">
            <input
              type="color"
              value={form.primary_color}
              onChange={(event) => update("primary_color", event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1"
            />
          </Field>

          <Field label="Secondary Color">
            <input
              type="color"
              value={form.secondary_color}
              onChange={(event) => update("secondary_color", event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Booking Title">
            <input
              value={form.booking_title}
              onChange={(event) => update("booking_title", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Booking Platform">
            <select
              value={form.booking_platform}
              onChange={(event) =>
                update("booking_platform", event.target.value)
              }
              className={inputClass}
            >
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="teams">Microsoft Teams</option>
              <option value="phone">Phone Call</option>
              <option value="in_person">In Person</option>
            </select>
          </Field>
        </div>

        <Field label="Booking Description">
          <textarea
            value={form.booking_description}
            onChange={(event) =>
              update("booking_description", event.target.value)
            }
            className={textareaClass}
          />
        </Field>

        <Field label="Custom Domain">
          <input
            value={form.custom_domain}
            onChange={(event) => update("custom_domain", event.target.value)}
            className={inputClass}
            placeholder="booking.yourdomain.com"
          />
        </Field>

        <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <input
            type="checkbox"
            checked={form.show_booking}
            onChange={(event) => update("show_booking", event.target.checked)}
          />

          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Show booking form on landing page
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <input
            type="checkbox"
            checked={form.maintenance_mode}
            onChange={(event) =>
              update("maintenance_mode", event.target.checked)
            }
          />

          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Maintenance mode
          </span>
        </label>

        <div className="flex justify-end">
          <SaveButton saving={saving} />
        </div>
      </form>
    </section>
  );
}

function buildInitialForm(landingPage = {}) {
  return {
    title: landingPage?.title || "",
    slug: landingPage?.slug || "",
    theme_mode: landingPage?.theme_mode || "dark",
    layout_template: landingPage?.layout_template || "exponify_premium",
    logo_url: landingPage?.logo_url || "",
    hero_image_url: landingPage?.hero_image_url || "",
    headline: landingPage?.headline || "",
    subheadline: landingPage?.subheadline || "",
    hero_badge: landingPage?.hero_badge || "",
    primary_cta_label:
      landingPage?.primary_cta_label ||
      "Book Appointment",
    primary_color:
      landingPage?.primary_color ||
      "#c9930c",
    secondary_color:
      landingPage?.secondary_color ||
      "#0f172a",
    show_booking:
      landingPage?.show_booking === undefined
        ? true
        : Boolean(landingPage.show_booking),
    booking_title: landingPage?.booking_title || "",
    booking_description: landingPage?.booking_description || "",
    booking_platform: landingPage?.booking_platform || "google_meet",
    custom_domain: landingPage?.custom_domain || "",
    maintenance_mode: Boolean(landingPage?.maintenance_mode),
  };
}
