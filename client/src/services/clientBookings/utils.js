export function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

export function normalizeDate(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function normalizeTime(value) {
  if (!value) return null;

  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  return value;
}

export function parseBookingDateTime(date, time) {
  if (!date) return null;

  if (!time) {
    return new Date(`${date}T00:00:00`);
  }

  if (/^\d{2}:\d{2}/.test(time)) {
    return new Date(`${date}T${time}`);
  }

  const [rawTime, meridiem] = String(time).split(" ");
  let [hours, minutes] = rawTime.split(":").map(Number);

  if (meridiem === "PM" && hours !== 12) {
    hours += 12;
  }

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return new Date(
    `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:00`
  );
}

export function formatBookingDate(date) {
  if (!date) {
    return "No date";
  }

  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date) {
  if (!date) {
    return "No date";
  }

  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(time) {
  if (!time) {
    return "No time";
  }

  const [hoursRaw, minutesRaw] = String(time).split(":");

  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw || 0);

  if (Number.isNaN(hours)) {
    return time;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
