export default function RebookBookingModal({
  booking,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl"
      >
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-gold)]">
            Rebook Meeting
          </p>

          <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            {booking?.title || "Booking"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Change the date or time without deleting the original booking
            history. Existing meeting and calendar links will be cleared and can
            be regenerated when approved again.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              New Date
            </span>

            <input
              type="date"
              required
              value={form.preferred_date}
              onChange={(event) =>
                onChange("preferred_date", event.target.value)
              }
              className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              New Time
            </span>

            <input
              type="time"
              required
              value={form.preferred_time}
              onChange={(event) =>
                onChange("preferred_time", event.target.value)
              }
              className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              Reason
            </span>

            <textarea
              value={form.reschedule_reason}
              onChange={(event) =>
                onChange("reschedule_reason", event.target.value)
              }
              className="min-h-[110px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
              placeholder="Example: Client is unavailable at the original schedule."
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-[var(--border-color)] px-5 text-sm font-bold text-[var(--text-primary)] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-xl bg-[var(--brand-gold)] px-5 text-sm font-bold text-black disabled:opacity-60"
          >
            {saving ? "Rebooking..." : "Save Rebooking"}
          </button>
        </div>
      </form>
    </div>
  );
}
