import { useMemo, useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeDate(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateFromKey(dateKey) {
  const normalized = normalizeDate(dateKey);

  if (!normalized) return null;

  const date = new Date(`${normalized}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getWeekdayRRuleValue(dateKey) {
  const date = getDateFromKey(dateKey);

  if (!date) return "";

  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][date.getDay()];
}

function isDateInRange(dateKey, startsAt, endsAt) {
  const target = getDateFromKey(dateKey);
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (
    !target ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return false;
  }

  return target >= start && target <= end;
}

function matchesRecurrenceRule(dateKey, exception) {
  const rule = String(exception?.recurrence_rule || "").toUpperCase();

  if (!rule) return false;

  const startsOn = normalizeDate(exception.starts_at);
  const selectedOn = normalizeDate(dateKey);

  if (!startsOn || !selectedOn || selectedOn < startsOn) {
    return false;
  }

  if (rule.includes("FREQ=DAILY")) {
    return true;
  }

  if (rule.includes("FREQ=WEEKLY")) {
    const weekday = getWeekdayRRuleValue(dateKey);

    return rule.includes(`BYDAY=${weekday}`) || !rule.includes("BYDAY=");
  }

  if (rule.includes("FREQ=MONTHLY")) {
    return (
      getDateFromKey(selectedOn)?.getDate() ===
      getDateFromKey(startsOn)?.getDate()
    );
  }

  if (rule.includes("FREQ=YEARLY")) {
    return selectedOn.slice(5) === startsOn.slice(5);
  }

  return false;
}

function isDateBlocked(dateKey, exceptions = []) {
  if (!dateKey) return false;

  return exceptions.some((exception) => {
    if (!exception || exception.archived_at) return false;

    if (exception.recurrence_rule) {
      return matchesRecurrenceRule(dateKey, exception);
    }

    return isDateInRange(dateKey, exception.starts_at, exception.ends_at);
  });
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let index = 0; index < firstDay; index += 1) {
    days.push({
      key: `empty-${index}`,
      empty: true,
      dateKey: "",
      label: "",
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);

    days.push({
      key: toDateKey(date),
      empty: false,
      dateKey: toDateKey(date),
      label: String(day),
    });
  }

  return days;
}

function getTheme(theme = {}) {
  return {
    primaryColor: theme.primaryColor || "#2563eb",
    headingColor: theme.headingColor || "#0f172a",
    bodyTextColor: theme.bodyTextColor || "#475569",
    cardBackground: theme.cardBackground || "#ffffff",
    borderColor: theme.borderColor || "#e2e8f0",
    hoverBackground: theme.hoverBackground || "rgba(37, 99, 235, 0.08)",
    blockedBackground: theme.blockedBackground || "rgba(239, 68, 68, 0.1)",
    blockedColor: theme.blockedColor || "#ef4444",
  };
}

export default function PublicBookingDatePicker({
  value,
  exceptions = [],
  fieldClass = "",
  required = false,
  theme = {},
  onChange,
}) {
  const pickerTheme = getTheme(theme);
  const selectedDate = getDateFromKey(value);
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    selectedDate?.getMonth() ?? today.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    selectedDate?.getFullYear() ?? today.getFullYear()
  );

  const calendarDays = useMemo(() => {
    return buildCalendarDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
  const selectedDateKey = normalizeDate(value);

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
      return;
    }

    setCurrentMonth((month) => month - 1);
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
      return;
    }

    setCurrentMonth((month) => month + 1);
  }

  function selectDate(dateKey) {
    if (!dateKey || isDateBlocked(dateKey, exceptions)) {
      return;
    }

    onChange?.(dateKey);
  }

  function getDayStyle({ selected, blocked }) {
    if (selected) {
      return {
        backgroundColor: pickerTheme.primaryColor,
        color: "#ffffff",
        borderColor: pickerTheme.primaryColor,
      };
    }

    if (blocked) {
      return {
        backgroundColor: pickerTheme.blockedBackground,
        color: pickerTheme.blockedColor,
        borderColor: "transparent",
      };
    }

    return {
      color: pickerTheme.headingColor,
      borderColor: "transparent",
    };
  }

  return (
    <div className="grid gap-3">
      <input
        type="hidden"
        required={required}
        value={selectedDateKey}
        onChange={() => {}}
      />

      <div
        className={`${fieldClass} min-h-[48px] px-0 py-0`}
        role="group"
        aria-label="Booking date picker"
        style={{
          backgroundColor: pickerTheme.cardBackground,
          borderColor: pickerTheme.borderColor,
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-3"
          style={{ borderColor: pickerTheme.borderColor }}
        >
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg px-3 py-1 text-sm font-black"
            style={{ color: pickerTheme.headingColor }}
            aria-label="Previous month"
          >
            ‹
          </button>

          <span
            className="text-sm font-black"
            style={{ color: pickerTheme.headingColor }}
          >
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg px-3 py-1 text-sm font-black"
            style={{ color: pickerTheme.headingColor }}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 px-3 pt-3">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="text-center text-[11px] font-black uppercase"
              style={{ color: pickerTheme.bodyTextColor }}
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 p-3">
          {calendarDays.map((day) => {
            const blocked = isDateBlocked(day.dateKey, exceptions);
            const selected = selectedDateKey === day.dateKey;

            if (day.empty) {
              return <div key={day.key} className="h-9" />;
            }

            return (
              <button
                key={day.key}
                type="button"
                disabled={blocked}
                onClick={() => selectDate(day.dateKey)}
                className={`h-9 rounded-lg border text-sm font-black transition ${
                  blocked ? "cursor-not-allowed line-through" : ""
                }`}
                style={getDayStyle({ selected, blocked })}
                title={blocked ? "Unavailable" : day.dateKey}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateKey && isDateBlocked(selectedDateKey, exceptions) && (
        <p
          className="rounded-xl p-3 text-sm font-bold"
          style={{
            backgroundColor: pickerTheme.blockedBackground,
            color: pickerTheme.blockedColor,
          }}
        >
          This date is unavailable. Please choose another date.
        </p>
      )}
    </div>
  );
}

export { isDateBlocked };
