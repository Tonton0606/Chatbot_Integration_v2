import {
  AlertTriangle,
  BarChart3,
  Brain,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  Activity,
} from "lucide-react";

function formatPhp(value = 0) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function scoreClass(score) {
  if (score >= 80) return "text-[var(--success)]";
  if (score >= 60) return "text-[var(--brand-gold)]";
  return "text-[var(--danger)]";
}

function barClass(value, max) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return `${Math.max(8, pct)}%`;
}

export function HRAnalyticsHeader({ onRefresh }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          HR Analytics
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Workforce intelligence, HR trends, and executive operational analytics.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh Analytics
      </button>
    </div>
  );
}

export function WorkforceHealthScore({ score }) {
  return (
    <div className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-cyan)]">
            Workforce Health Score
          </p>

          <h2 className={`mt-3 text-5xl font-black ${scoreClass(score)}`}>
            {score}
            <span className="text-xl text-[var(--text-muted)]">/100</span>
          </h2>

          <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">
            Composite HR score based on engagement, attendance stability,
            retention risk, performance health, hiring capacity, and payroll
            readiness.
          </p>
        </div>

        <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--bg-card)] lg:w-80">
          <div
            className="h-full rounded-full bg-[var(--brand-cyan)]"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function HRAnalyticsKPICards({ summary = {} }) {
  const cards = [
    {
      label: "Total Employees",
      value: summary.totalEmployees || 0,
      icon: Users,
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Growth",
      value: `+${summary.workforceGrowth || 0}`,
      icon: TrendingUp,
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Attendance",
      value: `${summary.attendanceRate || 0}%`,
      icon: Activity,
      color:
        "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Payroll Gross",
      value: formatPhp(summary.payrollGross || 0),
      icon: Wallet,
      color:
        "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-3xl border ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsBarWidget({ title, subtitle, data = [] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5 flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-[var(--brand-gold)]" />

        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-secondary)]">
                {item.label}
              </span>

              <span className="font-bold text-[var(--text-primary)]">
                {item.value}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-[var(--hover-bg)]">
              <div
                className="h-full rounded-full bg-[var(--brand-gold)]"
                style={{ width: barClass(item.value, max) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsLineWidget({ title, subtitle, data = [], suffix = "" }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5 flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-[var(--brand-cyan)]" />

        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex h-40 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-2xl bg-[var(--brand-cyan)]"
              style={{ height: barClass(item.value, max) }}
            />

            <span className="text-xs font-medium text-[var(--text-muted)]">
              {item.label}
            </span>

            <span className="text-xs font-bold text-[var(--text-primary)]">
              {item.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HRAnalyticsAIInsights({ insights = [] }) {
  return (
    <div className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-[var(--brand-cyan)]" />

        <div className="flex-1">
          <h3 className="font-bold text-[var(--text-primary)]">
            AI HR Intelligence
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            AI-generated workforce insights requiring HR validation.
          </p>

          <div className="mt-4 space-y-3">
            {insights.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--brand-gold)]" />

                  <h4 className="font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h4>
                </div>

                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HRAnalyticsLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading HR analytics...
      </p>
    </div>
  );
}

export function HRAnalyticsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />

        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load HR analytics
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-3xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
