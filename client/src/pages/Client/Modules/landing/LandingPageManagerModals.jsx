import { AlertTriangle, Copy, FileText, Plus, X } from "lucide-react";

function ModalFrame({ title, description, icon: Icon, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]/40 p-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-gold-soft)]">
              {Icon && <Icon className="h-5 w-5 text-[var(--brand-gold)]" />}
            </div>

            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {title}
              </h3>

              {description && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export function CreateLandingPageModal({
  value,
  saving = false,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <ModalFrame
      title="Create Landing Page"
      description="Add another landing page under this workspace."
      icon={Plus}
      onClose={onClose}
    >
      <form
        className="p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
      >
        <label className="block text-xs font-black uppercase tracking-wide text-[var(--text-secondary)]">
          Landing page name
        </label>

        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder="Example: InLife Product Landing"
          autoFocus
          className="mt-2 h-12 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold)]"
        />

        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The public slug will be generated from this name. You can edit it in
          General Settings after creation.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-main)] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !String(value || "").trim()}
            className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black transition hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Page"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function DuplicateLandingPageModal({
  page,
  saving = false,
  onClose,
  onConfirm,
}) {
  return (
    <ModalFrame
      title="Duplicate Landing Page"
      description="Create a draft copy of this landing page."
      icon={Copy}
      onClose={onClose}
    >
      <div className="p-5">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-[var(--brand-gold)]" />

            <div>
              <p className="font-black text-[var(--text-primary)]">
                {page?.title || "Untitled Landing Page"}
              </p>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                /{page?.slug || "landing-page"}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          The duplicate will be created as a draft. Custom domains are not copied.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-main)] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black transition hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy className="mr-2 h-4 w-4" />
            {saving ? "Duplicating..." : "Duplicate"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

export function ArchiveLandingPageModal({
  page,
  saving = false,
  onClose,
  onConfirm,
}) {
  return (
    <ModalFrame
      title="Archive Landing Page"
      description="Hide this landing page without deleting its data."
      icon={AlertTriangle}
      onClose={onClose}
    >
      <div className="p-5">
        <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-4">
          <p className="font-black text-[var(--danger)]">
            Archive {page?.title || "this landing page"}?
          </p>

          <p className="mt-2 text-sm text-[var(--danger)]">
            Visitors will no longer access this landing page. Existing records
            remain preserved.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-main)] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {saving ? "Archiving..." : "Archive Page"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
