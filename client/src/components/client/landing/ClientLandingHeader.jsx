import { ExternalLink } from "lucide-react";

export function ClientLandingHeader({
  workspace,
  landingPage,
  publicUrl,
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Marketing / Landing Pages
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Landing Pages
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Manage the public landing page for{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {workspace?.name || workspace?.title || "this workspace"}
          </span>
          . Visitors can book appointments that flow into Client Booking.
        </p>
      </div>

      {landingPage?.published && publicUrl && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Public Page
        </a>
      )}
    </div>
  );
}
