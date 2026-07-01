import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const fmt = {
  currency: (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(v || 0),

  number: (v) => new Intl.NumberFormat("en-US").format(v || 0),

  pct: (v) => `${v >= 0 ? "+" : ""}${Number(v || 0).toFixed(1)}%`,

  date: (d) => {
    if (!d) return "No date";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(d));
  },

  shortDate: (d) => {
    if (!d) return "No date";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(d));
  },

  timeAgo: (date) => {
    if (!date) return "Unknown time";

    const timestamp = new Date(date).getTime();
    if (Number.isNaN(timestamp)) return "Unknown time";

    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? "" : "s"} ago`;
  },
};

export function initials(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function randomColor(seed = "") {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];

  let h = 0;
  const value = String(seed);

  for (let i = 0; i < value.length; i++) {
    h = value.charCodeAt(i) + ((h << 5) - h);
  }

  return colors[Math.abs(h) % colors.length];
}
