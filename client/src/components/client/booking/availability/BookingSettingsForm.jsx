import {
  BOOKING_TIMEZONE_OPTIONS,
} from "../../../../services/clientBookings/availability";

export default function BookingSettingsForm({
  settings,
  saving,
  onChange,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-gold)]">
          Booking Settings
        </p>

        <h3 className="mt-2 text-xl font-black text-[var(--text-primary)]">
          Availability Rules
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          These settings will be shared by the system booking module and public
          landing page appointment form.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Timezone
          </span>

          <select
            value={settings.timezone}
            onChange={(event) => onChange("timezone", event.target.value)}
            className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          >
            {BOOKING_TIMEZONE_OPTIONS.map((timezone) => (
              <option key={timezone.value} value={timezone.value}>
                {timezone.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Slot Duration
          </span>

          <select
            value={settings.slot_duration_minutes}
            onChange={(event) =>
              onChange("slot_duration_minutes", Number(event.target.value))
            }
            className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 h-11 w-full rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
