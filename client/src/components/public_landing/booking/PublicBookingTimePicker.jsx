import { buildTimeValue, parseTimeValue } from "../publicLandingUtils";

const HOURS = ["08", "09", "10", "11", "12", "01", "02", "03", "04", "05"];
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];

function normalizeDate(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  if (!value) return "";

  if (/^\d{2}:\d{2}/.test(value)) {
    return String(value).slice(0, 5);
  }

  const [rawTime, rawPeriod] = String(value).trim().split(/\s+/);
  const [rawHour, rawMinute = "00"] = String(rawTime || "").split(":");

  let hour = Number(rawHour);
  const minute = Number(rawMinute);
  const period = String(rawPeriod || "").toUpperCase();

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return String(value);
  }

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildSlotKey(date, time) {
  return `${normalizeDate(date)}|${normalizeTime(time)}`;
}

function isSlotBooked(bookings = [], selectedDate, timeValue) {
  if (!selectedDate || !timeValue) return false;

  const selectedSlot = buildSlotKey(selectedDate, timeValue);

  return bookings.some((booking) => {
    return (
      buildSlotKey(booking.preferred_date, booking.preferred_time) ===
      selectedSlot
    );
  });
}

function isDateTimeInRange(selectedDate, timeValue, startsAt, endsAt) {
  if (!selectedDate || !timeValue) return false;

  const target = new Date(
    `${normalizeDate(selectedDate)}T${normalizeTime(timeValue)}:00`
  );
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (
    Number.isNaN(target.getTime()) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return false;
  }

  return target >= start && target <= end;
}

function isTimeBlocked(exceptions = [], selectedDate, timeValue) {
  if (!selectedDate || !timeValue) return false;

  return exceptions.some((exception) => {
    if (!exception || exception.archived_at) return false;

    if (exception.is_full_day || exception.recurrence_rule) {
      return false;
    }

    return isDateTimeInRange(
      selectedDate,
      timeValue,
      exception.starts_at,
      exception.ends_at
    );
  });
}

function getTheme(theme = {}) {
  return {
    primaryColor: theme.primaryColor || "#2563eb",
    headingColor: theme.headingColor || "#0f172a",
    bodyTextColor: theme.bodyTextColor || "#475569",
    cardBackground: theme.cardBackground || "#ffffff",
    borderColor: theme.borderColor || "#e2e8f0",
    blockedBackground: theme.blockedBackground || "rgba(239, 68, 68, 0.1)",
    blockedColor: theme.blockedColor || "#ef4444",
  };
}

function buildSelectedTime(parsed) {
  return buildTimeValue({
    hour: parsed.hour || "09",
    minute: parsed.minute || "00",
    period: parsed.period || "AM",
  });
}

function hexToRgba(hex, alpha) {
  const cleanHex = String(hex || "").replace("#", "");

  if (cleanHex.length !== 6) {
    return `rgba(37, 99, 235, ${alpha})`;
  }

  const red = parseInt(cleanHex.slice(0, 2), 16);
  const green = parseInt(cleanHex.slice(2, 4), 16);
  const blue = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default function PublicBookingTimePicker({
  value,
  selectedDate,
  bookings = [],
  exceptions = [],
  required = false,
  theme = {},
  onChange,
}) {
  const pickerTheme = getTheme(theme);
  const parsed = parseTimeValue(value || "09:00 AM");
  const selectedTime = value || buildSelectedTime(parsed);

  const selectedUnavailable =
    isSlotBooked(bookings, selectedDate, selectedTime) ||
    isTimeBlocked(exceptions, selectedDate, selectedTime);

  function updatePart(key, nextValue) {
    const nextTime = buildTimeValue({
      ...parsed,
      [key]: nextValue,
    });

    onChange?.(nextTime);
  }

  function getButtonStyle({ active }) {
    if (active) {
      return {
        backgroundColor: pickerTheme.primaryColor,
        borderColor: pickerTheme.primaryColor,
        color: "#ffffff",
      };
    }

    return {
      backgroundColor: pickerTheme.cardBackground,
      borderColor: pickerTheme.borderColor,
      color: pickerTheme.headingColor,
    };
  }

  return (
    <div className="grid gap-3">
      <input
        type="hidden"
        required={required}
        value={value || ""}
        onChange={() => {}}
      />

      {!selectedDate && (
        <div
          className="rounded-xl border p-4 text-sm font-bold"
          style={{
            backgroundColor: pickerTheme.cardBackground,
            borderColor: pickerTheme.borderColor,
            color: pickerTheme.bodyTextColor,
          }}
        >
          Select a date first.
        </div>
      )}

      {selectedDate && (
        <div
          className="min-h-[276px] rounded-xl border p-3"
          style={{
            backgroundColor: pickerTheme.cardBackground,
            borderColor: pickerTheme.borderColor,
          }}
        >
          <div
            className="mb-3 rounded-xl border px-3 py-3 text-center"
            style={{
              backgroundColor: hexToRgba(pickerTheme.primaryColor, 0.08),
              borderColor: hexToRgba(pickerTheme.primaryColor, 0.24),
            }}
          >
            <span
              className="font-mono text-2xl font-black tracking-[0.1em]"
              style={{ color: pickerTheme.primaryColor }}
            >
              {parsed.hour}:{parsed.minute}
            </span>

            <span
              className="ml-2 font-mono text-base font-black tracking-[0.1em]"
              style={{ color: pickerTheme.primaryColor }}
            >
              {parsed.period}
            </span>
          </div>

          <div className="grid gap-3">
            <div>
              <p
                className="mb-1.5 text-[10px] font-black uppercase tracking-wide"
                style={{ color: pickerTheme.bodyTextColor }}
              >
                Hour
              </p>

              <div className="grid grid-cols-5 gap-1.5">
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => updatePart("hour", hour)}
                    className="h-8 rounded-lg border text-xs font-black transition"
                    style={getButtonStyle({ active: parsed.hour === hour })}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p
                className="mb-1.5 text-[10px] font-black uppercase tracking-wide"
                style={{ color: pickerTheme.bodyTextColor }}
              >
                Minute
              </p>

              <div className="grid grid-cols-4 gap-1.5">
                {MINUTES.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => updatePart("minute", minute)}
                    className="h-8 rounded-lg border text-xs font-black transition"
                    style={getButtonStyle({ active: parsed.minute === minute })}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p
                className="mb-1.5 text-[10px] font-black uppercase tracking-wide"
                style={{ color: pickerTheme.bodyTextColor }}
              >
                Period
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {PERIODS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => updatePart("period", period)}
                    className="h-8 rounded-lg border text-xs font-black transition"
                    style={getButtonStyle({ active: parsed.period === period })}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedUnavailable && (
        <p
          className="rounded-xl p-3 text-sm font-bold"
          style={{
            backgroundColor: pickerTheme.blockedBackground,
            color: pickerTheme.blockedColor,
          }}
        >
          This time is unavailable. Please choose another time.
        </p>
      )}
    </div>
  );
}
