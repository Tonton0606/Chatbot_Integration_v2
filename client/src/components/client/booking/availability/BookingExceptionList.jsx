import { formatExceptionDate } from "./availabilityPanelUtils";

export default function BookingExceptionList({
  loading,
  error,
  exceptions,
  onRefresh,
  onArchive,
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border-color)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-gold)]">
            Blocked Calendar
          </p>

          <h3 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            Unavailable Dates
          </h3>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Landing pages should hide these dates or prevent booking these
            times.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="h-10 rounded-xl border border-[var(--border-color)] px-4 text-sm font-bold text-[var(--text-primary)]"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="py-8 text-sm text-[var(--text-secondary)]">
          Loading availability...
        </p>
      )}

      {!loading && error && (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-[var(--danger-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--danger)]">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && exceptions.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border-color)] p-8 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            No blocked dates yet
          </p>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Add unavailable dates so the landing page booking form can respect
            your calendar.
          </p>
        </div>
      )}

      {!loading && !error && exceptions.length > 0 && (
        <div className="mt-5 grid gap-3">
          {exceptions.map((exception) => (
            <article
              key={exception.id}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-black text-[var(--text-primary)]">
                      {exception.title}
                    </h4>

                    <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 text-xs font-bold uppercase text-[var(--text-secondary)]">
                      {exception.exception_type}
                    </span>

                    {exception.recurrence_rule && (
                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-bold uppercase text-blue-400">
                        Repeats
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {formatExceptionDate(exception.starts_at)} →{" "}
                    {formatExceptionDate(exception.ends_at)}
                  </p>

                  {exception.reason && (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {exception.reason}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onArchive(exception)}
                  className="h-9 rounded-xl border border-red-500/20 px-3 text-xs font-bold text-[var(--danger)]"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
