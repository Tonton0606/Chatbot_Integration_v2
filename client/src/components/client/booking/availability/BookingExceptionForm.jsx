import {
  BOOKING_EXCEPTION_TYPE_OPTIONS,
  BOOKING_RECURRENCE_PRESETS,
} from "../../../../services/clientBookings/availability";

function getDateValue(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

export default function BookingExceptionForm({
  form,
  saving,
  onChange,
  onSubmit,
}) {
  const isFullDay = Boolean(form.is_full_day);

  function handleFullDayChange(checked) {
    onChange("is_full_day", checked);

    if (checked) {
      onChange("ends_at", "");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-gold)]">
          Block Time
        </p>

        <h3 className="mt-2 text-xl font-black text-[var(--text-primary)]">
          Add Unavailable Date
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Use a full-day block for dates you are unavailable. Use repeat rules
          for recurring unavailable days such as every Wednesday.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Title
          </span>

          <input
            value={form.title}
            onChange={(event) => onChange("title", event.target.value)}
            required
            placeholder="Example: Personal Matters"
            className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Type
          </span>

          <select
            value={form.exception_type}
            onChange={(event) =>
              onChange("exception_type", event.target.value)
            }
            className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          >
            {BOOKING_EXCEPTION_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-3">
          <input
            type="checkbox"
            checked={isFullDay}
            onChange={(event) => handleFullDayChange(event.target.checked)}
          />

          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Full-day block
          </span>
        </label>

        {isFullDay ? (
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              Unavailable Date
            </span>

            <input
              type="date"
              required
              value={getDateValue(form.starts_at)}
              onChange={(event) => onChange("starts_at", event.target.value)}
              className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
            />
          </label>
        ) : (
          <>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Starts At
              </span>

              <input
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={(event) => onChange("starts_at", event.target.value)}
                className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Ends At
              </span>

              <input
                type="datetime-local"
                required
                value={form.ends_at}
                onChange={(event) => onChange("ends_at", event.target.value)}
                className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
              />
            </label>
          </>
        )}

        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Repeat
          </span>

          <select
            value={form.recurrence_rule}
            onChange={(event) =>
              onChange("recurrence_rule", event.target.value)
            }
            className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          >
            {BOOKING_RECURRENCE_PRESETS.map((preset) => (
              <option key={preset.value || "none"} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        {isFullDay && form.recurrence_rule === "FREQ=WEEKLY" && (
          <p className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-3 text-sm font-semibold text-blue-500">
            Weekly repeat uses the weekday of the unavailable date you selected.
            Example: select a Wednesday to block every Wednesday.
          </p>
        )}

        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Reason
          </span>

          <textarea
            value={form.reason}
            onChange={(event) => onChange("reason", event.target.value)}
            placeholder="Optional note for internal reference."
            className="min-h-[92px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 h-11 w-full rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black disabled:opacity-60"
      >
        {saving ? "Adding..." : "Add Blocked Time"}
      </button>
    </form>
  );
}
