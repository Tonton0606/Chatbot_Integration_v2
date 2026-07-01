import {
  Archive,
  ChevronDown,
  Copy,
  FileText,
  Plus,
} from "lucide-react";

function getStatusLabel(page = {}) {
  if (page.status === "archived") return "Archived";
  if (page.published) return "Published";
  if (page.status === "disabled") return "Disabled";
  return "Draft";
}

function getStatusClass(page = {}) {
  if (page.status === "archived") {
    return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  }

  if (page.published) {
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (page.status === "disabled") {
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
}

export default function LandingPageSelector({
  pages = [],
  selectedPageId,
  disabled = false,
  onSelectPage,
  onCreatePage,
  onDuplicatePage,
  onArchivePage,
}) {
  const selectedPage =
    pages.find((page) => page.id === selectedPageId) || pages[0] || null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="landing-page-selector">
        Select landing page
      </label>

      <div className="relative">
        <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />

        <select
          id="landing-page-selector"
          value={selectedPage?.id || ""}
          disabled={disabled || pages.length === 0}
          onChange={(event) => onSelectPage?.(event.target.value)}
          className="h-10 min-w-[240px] appearance-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-0 pl-10 pr-10 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-main)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pages.length === 0 && <option value="">No landing pages</option>}

          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title || "Untitled Landing Page"} /{page.slug || "slug"}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      </div>

      {selectedPage && (
        <span
          className={`inline-flex h-10 items-center rounded-xl border px-3 text-xs font-black uppercase tracking-wide ${getStatusClass(
            selectedPage
          )}`}
        >
          {getStatusLabel(selectedPage)}
        </span>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={onCreatePage}
        className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black transition hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="mr-2 h-4 w-4" />
        New
      </button>

      <button
        type="button"
        disabled={disabled || !selectedPage}
        onClick={onDuplicatePage}
        className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-main)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Copy className="mr-2 h-4 w-4" />
        Duplicate
      </button>

      <button
        type="button"
        disabled={disabled || !selectedPage}
        onClick={onArchivePage}
        className="inline-flex h-10 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Archive className="mr-2 h-4 w-4" />
        Archive
      </button>
    </div>
  );
}
