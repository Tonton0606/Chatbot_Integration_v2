import { CheckCircle2, Copy, Rocket, ShieldCheck, XCircle } from "lucide-react";

import { inputClass } from "../../shared";

export function PublishStatusPanel({
  isPublished,
  saving,
  onPublish,
  onUnpublish,
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        isPublished
          ? "border-green-500/20 bg-[var(--success-soft)]"
          : "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {isPublished ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-[var(--brand-gold)]" />
            )}

            <h3 className="font-black text-[var(--text-primary)]">
              {isPublished ? "Landing Page Published" : "Landing Page Draft"}
            </h3>
          </div>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {isPublished
              ? "Visitors can now access your landing page."
              : "Publish when you are ready to accept visitors."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isPublished ? (
            <button
              type="button"
              disabled={saving}
              onClick={onUnpublish}
              className="inline-flex h-10 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)] disabled:opacity-60"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={onPublish}
              className="inline-flex h-10 items-center rounded-xl bg-[var(--success)] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Publish Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PublicUrlPanel({ publicUrl, onCopyUrl }) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Copy className="h-5 w-5 text-[var(--brand-gold)]" />

        <h3 className="font-black text-[var(--text-primary)]">Public URL</h3>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <input readOnly value={publicUrl || ""} className={`${inputClass} flex-1`} />

        <button
          type="button"
          onClick={onCopyUrl}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm font-bold text-[var(--text-primary)]"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </button>
      </div>
    </div>
  );
}
