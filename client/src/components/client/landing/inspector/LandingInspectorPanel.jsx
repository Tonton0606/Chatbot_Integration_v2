export default function LandingInspectorPanel({
  title = "Inspector",
  eyebrow = "Selected Element",
  description = "",
  emptyTitle = "Select something in the preview",
  emptyDescription = "Click a section, card, title, button, or media block to edit only that element.",
  selectedElement,
  children,
}) {
  if (!selectedElement) {
    return (
      <aside className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
          {emptyTitle}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {emptyDescription}
        </p>
      </aside>
    );
  }

  return (
    <aside
      data-editor-id={`editor-${selectedElement.previewId}`}
      className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
    >
      <div className="mb-5 border-b border-[var(--border-color)] pb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>

      <div className="grid gap-4">{children}</div>
    </aside>
  );
}
