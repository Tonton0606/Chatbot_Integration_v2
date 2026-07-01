import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { cardClass } from "./shared";

export function ClientLandingAnalytics({ stats }) {
  const cards = [
    {
      label: "Views",
      value: stats?.views || 0,
      icon: BarChart3,
    },
    {
      label: "Booking Clicks",
      value: stats?.bookingClicks || 0,
      icon: CalendarCheck,
    },
    {
      label: "Bookings",
      value: stats?.bookingSubmissions || 0,
      icon: CheckCircle2,
    },
    {
      label: "Conversion",
      value: `${stats?.conversionRate || 0}%`,
      icon: Sparkles,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.label} className={`${cardClass} p-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--brand-gold)]">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
