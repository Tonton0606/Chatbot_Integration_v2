import { useState } from "react";
import {
  Award,
  Brain,
  ChevronRight,
  Crown,
  Eye,
  Phone,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";

import {
  BADGES,
  PERFORMANCE_BADGE_STYLES,
  formatCurrency,
} from "../../../services/sales_crm/sales_leaderboard";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const iconBox =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

function Avatar({ name }) {
  const initials = (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-sm font-bold text-[var(--brand-gold)]">
      {initials}
    </div>
  );
}

export function TeamKPICards({ kpis }) {
  const cards = [
    {
      label: "Top Performer",
      value: kpis.topPerformer,
      icon: Crown,
      color: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
    {
      label: "Revenue",
      value: formatCurrency(kpis.totalRevenue),
      icon: Trophy,
      color: "text-[var(--success)]",
      bar: "bg-[var(--success)]",
    },
    {
      label: "Avg Conversion",
      value: `${kpis.avgConversionRate}%`,
      icon: Target,
      color: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
    {
      label: "Activities",
      value: kpis.activitiesCompleted,
      icon: TrendingUp,
      color: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
    {
      label: "Won Deals",
      value: kpis.dealsWon,
      icon: Award,
      color: "text-[var(--success)]",
      bar: "bg-[var(--success)]",
    },
    {
      label: "Follow Ups",
      value: kpis.followUpsCompleted,
      icon: Phone,
      color: "text-[var(--brand-gold)]",
      bar: "bg-[var(--brand-gold)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.label} className={`${panelClass} p-4`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className={`mt-3 truncate text-2xl font-bold ${card.color}`}>
                  {card.value}
                </h3>
              </div>

              <div className={iconBox}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 h-1 rounded-full bg-[var(--hover-bg)]">
              <div className={`h-1 w-3/5 rounded-full ${card.bar}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LeaderboardPodium({ data, onSelect }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {data.map((person) => {
        const style =
          PERFORMANCE_BADGE_STYLES[person.rank] ||
          PERFORMANCE_BADGE_STYLES.default;

        return (
          <button
            key={person.rank}
            type="button"
            onClick={() => onSelect(person)}
            className={`${panelClass} p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)] hover:bg-[var(--hover-bg)]`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={person.name} />

                <div className="min-w-0">
                  <h3 className="truncate font-bold text-[var(--text-primary)]">
                    {person.name}
                  </h3>

                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {person.role}
                  </p>
                </div>
              </div>

              <span className={style.className}>{style.label}</span>
            </div>

            <h2 className="mt-5 text-3xl font-bold text-[var(--brand-gold)]">
              {formatCurrency(person.revenue)}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <MetricBadge label={`${person.dealsWon} Won`} />
              <MetricBadge label={`${person.conversionRate}% Conv`} />
              <MetricBadge label={`${person.activities} Activities`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function LeaderboardTable({ data, onRowClick }) {
  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-[var(--border-color)] px-5 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-[var(--text-primary)]">
            Sales Ranking
          </h3>

          <p className="text-sm text-[var(--text-muted)]">
            {data.length} team members
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              {[
                "Rank",
                "Salesperson",
                "Revenue",
                "Won",
                "Conversion",
                "Pipeline",
                "Badges",
                "",
              ].map((header) => (
                <th
                  key={header}
                  className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((person) => (
              <tr
                key={person.rank}
                className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--hover-bg)]"
              >
                <td className="px-5 py-3">
                  <span
                    className={
                      PERFORMANCE_BADGE_STYLES[person.rank]?.className ||
                      PERFORMANCE_BADGE_STYLES.default.className
                    }
                  >
                    #{person.rank}
                  </span>
                </td>

                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={person.name} />

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-primary)]">
                        {person.name}
                      </p>

                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {person.role}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3 font-bold text-[var(--brand-gold)]">
                  {formatCurrency(person.revenue)}
                </td>

                <td className="px-5 py-3 font-semibold text-[var(--success)]">
                  {person.dealsWon}
                </td>

                <td className="px-5 py-3 font-medium text-[var(--text-secondary)]">
                  {person.conversionRate}%
                </td>

                <td className="px-5 py-3 font-semibold text-[var(--brand-gold)]">
                  {formatCurrency(person.pipelineValue)}
                </td>

                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {person.badges.map((badge) => {
                      const style = BADGES[badge];

                      if (!style) return null;

                      return (
                        <span
                          key={badge}
                          className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)]"
                        >
                          {style.icon} {badge}
                        </span>
                      );
                    })}
                  </div>
                </td>

                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRowClick(person)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  No leaderboard records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SalespersonDrawer({ person, onClose }) {
  const [tab, setTab] = useState("summary");

  if (!person) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-auto border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="border-b border-[var(--border-color)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={person.name} />

              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-[var(--text-primary)]">
                  {person.name}
                </h2>

                <p className="truncate text-sm text-[var(--text-muted)]">
                  {person.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-[var(--border-color)]">
          {["summary", "deals", "activity", "coaching"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`flex-1 px-4 py-3 text-sm font-semibold capitalize ${
                tab === item
                  ? "border-b-2 border-[var(--brand-gold)] text-[var(--brand-gold)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "summary" && (
            <div className="grid gap-4 md:grid-cols-2">
              <SummaryCard label="Revenue" value={formatCurrency(person.revenue)} />
              <SummaryCard label="Won Deals" value={person.dealsWon} />
              <SummaryCard label="Conversion" value={`${person.conversionRate}%`} />
              <SummaryCard label="Pipeline" value={formatCurrency(person.pipelineValue)} />
            </div>
          )}

          {tab === "deals" && <SimpleList items={person.openDeals || []} />}

          {tab === "activity" && (
            <SimpleList
              items={(person.recentActivities || []).map(
                (activity) => `${activity.date} • ${activity.note}`
              )}
            />
          )}

          {tab === "coaching" && (
            <div className="space-y-3">
              {(person.aiCoaching || []).map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-[var(--brand-gold)]" />

                    <span className="text-sm font-bold text-[var(--brand-gold)]">
                      AI Suggestion
                    </span>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}

              {(!person.aiCoaching || person.aiCoaching.length === 0) && (
                <p className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  No coaching notes yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityBreakdownChart({ data }) {
  return (
    <div className={`${panelClass} p-5`}>
      <h3 className="mb-4 border-b border-[var(--border-color)] pb-3 font-bold text-[var(--text-primary)]">
        Team Activity Breakdown
      </h3>

      <div className="space-y-5">
        {data.map((week) => (
          <div key={week.week}>
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--brand-gold)]" />

              <span className="font-medium text-[var(--text-secondary)]">
                {week.week}
              </span>
            </div>

            {[
              ["Calls", week.calls],
              ["Emails", week.emails],
              ["Meetings", week.meetings],
            ].map(([label, value]) => (
              <div key={label} className="mb-3 flex items-center gap-3">
                <span className="w-20 text-sm text-[var(--text-muted)]">
                  {label}
                </span>

                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand-gold)]"
                    style={{ width: `${Math.min(Number(value || 0) * 3, 100)}%` }}
                  />
                </div>

                <span className="w-8 text-right text-sm font-semibold text-[var(--text-primary)]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        ))}

        {data.length === 0 && (
          <p className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
            No activity breakdown yet.
          </p>
        )}
      </div>
    </div>
  );
}

function MetricBadge({ label }) {
  return (
    <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
      {label}
    </span>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-3 text-xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function SimpleList({ items = [] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
        >
          <span className="text-sm text-[var(--text-secondary)]">{item}</span>

          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
      ))}

      {items.length === 0 && (
        <p className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
          No records yet.
        </p>
      )}
    </div>
  );
}
