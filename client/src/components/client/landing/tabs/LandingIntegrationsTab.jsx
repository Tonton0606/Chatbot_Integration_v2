import {
  Bot,
  ExternalLink,
  Globe2,
  Link2,
  Megaphone,
  PlugZap,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import {
  Field,
  inputClass,
  SaveButton,
  SectionHeader,
} from "../shared";

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  disabled = false,
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />

      <span>
        <span className="block text-sm font-black text-[var(--text-primary)]">
          {title}
        </span>

        <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
    </label>
  );
}

export default function LandingIntegrationsTab({
  mapping,
  saving,
  onChange,
  onSave,
}) {
  const integration = mapping || {};

  function submit(event) {
    event.preventDefault();
    onSave();
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <SectionHeader
        icon={PlugZap}
        title="Landing Integrations"
        description="Control how external landing pages create contacts, leads, bookings, and redirects inside this workspace."
      />

      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-3xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-gold)]" />

          <div>
            <h3 className="font-black text-[var(--text-primary)]">
              External website engine is active
            </h3>

            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Claude pages, WordPress, Shopify, Wix, Squarespace, React, and
              custom HTML pages can submit to Exponify using the public capture
              and booking endpoints.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ToggleRow
            checked={integration.create_contact !== false}
            onChange={(value) => onChange("create_contact", value)}
            title="Create Contact"
            description="Create or update a client contact from external form submissions."
          />

          <ToggleRow
            checked={integration.create_lead !== false}
            onChange={(value) => onChange("create_lead", value)}
            title="Create Lead"
            description="Create a lead in the client workspace pipeline after contact capture."
          />

          <ToggleRow
            checked={integration.create_booking !== false}
            onChange={(value) => onChange("create_booking", value)}
            title="Create Booking"
            description="Create a pending booking request when visitors use the booking endpoint."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
}
