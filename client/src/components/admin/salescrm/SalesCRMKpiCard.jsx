export default function SalesCRMKpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "text-[var(--brand-cyan)]",
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm p-5">
      <div className="flex flex-1 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="min-h-[32px] text-xs font-bold uppercase leading-snug tracking-wider text-[var(--text-muted)]">
            {label}
          </p>
          <h3 className={`mt-2 truncate text-2xl font-bold ${tone}`}>
            {value}
          </h3>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
            {helper}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
      </div>
      <div className="mt-5 h-1 w-full rounded-full bg-[var(--hover-bg)]">
        <div className="h-1 w-3/5 rounded-full bg-[var(--brand-gold)]" />
      </div>
    </div>
  );
}
