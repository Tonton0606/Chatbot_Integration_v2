import {
  Globe2,
  Link2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { cardClass } from "./shared";

export function ClientLandingPublishCard({
  landingPage,
  publicUrl,
  saving,
  onEnable,
  onDisable,
}) {
  const enabled =
    landingPage?.published &&
    landingPage?.status === "published" &&
    landingPage?.enable_landing !== false;

  return (
    <section className={`${cardClass} p-5`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--brand-gold)]">
            <Globe2 className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-[var(--text-primary)]">
                Public Landing Page
              </h3>

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${
                  enabled
                    ? "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]"
                    : "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"
                }`}
              >
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <p className="mt-1 break-all text-sm leading-6 text-[var(--text-secondary)]">
              Public URL:
              <span className="ml-2 font-mono text-[var(--text-primary)]">
                {publicUrl || "Unavailable"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <button
              type="button"
              onClick={onDisable}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-60"
            >
              <ToggleLeft className="mr-2 h-4 w-4" />
              Disable Landing Page
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnable}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
            >
              <ToggleRight className="mr-2 h-4 w-4" />
              Enable Landing Page
            </button>
          )}

          {publicUrl && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Copy Link
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
