import {
  AlertTriangle,
  Award,
  Brain,
  CheckCircle2,
  GitBranch,
  Gauge,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

function scoreColor(score) {
  if (score >= 90) return "text-[var(--success)]";
  if (score >= 80) return "text-[var(--brand-gold)]";
  return "text-[var(--danger)]";
}

function riskTone(risk) {
  const normalized = String(risk || "").toLowerCase();
  if (normalized === "low") {
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (normalized === "high") {
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
}

function readinessTone(readiness) {
  const normalized = String(readiness || "").toLowerCase();
  if (normalized.includes("ready now")) {
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (normalized.includes("development")) {
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
}

export function TalentManagementHeader({ onRefresh }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
          Talent Management
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Skills, succession planning, promotion readiness, and configurable talent scoring.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center justify-center gap-2 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] shadow-sm"
      >
        <Sparkles className="h-4 w-4" />
        Refresh Talent Data
      </button>
    </div>
  );
}

export function TalentIntelligencePanel({ config }) {
  const enabledMetrics = Object.entries(config || {})
    .filter(([, item]) => item.enabled && Number(item.weight || 0) > 0)
    .map(([key, item]) => `${item.weight}% ${key}`);

  return (
    <section className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">
      <div className="flex items-start gap-3">
        <Brain className="mt-1 h-5 w-5 text-[var(--brand-cyan)]" />
        <div>
          <h2 className="font-bold text-[var(--text-primary)]">
            Talent Intelligence
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Talent scores are decision-support only. HR can choose which signals matter and adjust percentages per workspace.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[var(--bg-card)] p-4">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Active scoring model
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {enabledMetrics.length ? enabledMetrics.join(" + ") : "No active scoring signals configured."}
        </p>
      </div>
    </section>
  );
}

export function TalentKPICards({ summary }) {
  const cards = [
    {
      label: "High Potential",
      value: summary?.highPotential || 0,
      sub: "Employees with high growth signal",
      icon: Award,
      color: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Promotion Ready",
      value: summary?.promotionReady || 0,
      sub: "Ready now",
      icon: TrendingUp,
      color: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Succession Candidates",
      value: summary?.successionCandidates || 0,
      sub: "Across critical roles",
      icon: GitBranch,
      color: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Avg Talent Score",
      value: `${summary?.averageTalentScore || 0}%`,
      sub: "Current configured scoring model",
      icon: Gauge,
      color: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Skills Gaps",
      value: summary?.skillsGapCount || 0,
      sub: "High-priority gaps",
      icon: AlertTriangle,
      color: "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.label}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>
                <h3 className="mt-4 text-2xl font-black text-[var(--text-primary)]">
                  {card.value}
                </h3>
                <p className="mt-3 text-sm text-[var(--text-muted)]">{card.sub}</p>
              </div>

              <div className={`flex h-10 w-10 items-center justify-center rounded-3xl border ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function TalentScoreSettings({ config, rules, onConfigChange, onRulesChange, onSave, saving, saveMessage }) {
  const labels = {
    tasks: "Task Completion",
    attendance: "Attendance",
    performance: "Performance Review",
    engagement: "Employee Engagement",
  };

  const total = Object.values(config || {}).reduce(
    (sum, item) => sum + (item.enabled ? Number(item.weight || 0) : 0),
    0
  );

  const isValid = total === 100;

  function updateSignal(key, patch) {
    onConfigChange?.({
      ...config,
      [key]: {
        ...config[key],
        ...patch,
      },
    });
  }

  function updateRule(key, value) {
    onRulesChange?.({
      ...rules,
      [key]: Number(value || 0),
    });
  }

  return (
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[var(--brand-gold)]" />
            <h2 className="text-xl font-black text-[var(--text-primary)]">
              Talent Configuration
            </h2>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Configure how talent scores are weighted and how readiness, potential, and risk labels are assigned.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-3xl border px-3 py-1 text-xs font-bold ${
              isValid
                ? "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]"
                : "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]"
            }`}
          >
            Total {total}%
          </span>

          <button
            type="button"
            disabled={!isValid || saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-3xl border border-[var(--border-color)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-bold text-[#050816] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(config || {}).map(([key, item]) => (
          <div
            key={key}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-[var(--text-primary)]">
                {labels[key] || key}
              </p>

              <label className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={!!item.enabled}
                  onChange={(event) =>
                    updateSignal(key, { enabled: event.target.checked })
                  }
                />
                Enabled
              </label>
            </div>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Weight %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={item.weight}
              disabled={!item.enabled}
              onChange={(event) =>
                updateSignal(key, { weight: Number(event.target.value || 0) })
              }
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none disabled:opacity-50"
            />

            <div className="mt-4 h-2 rounded-full bg-[var(--hover-bg)]">
              <div
                className="h-2 rounded-full bg-[var(--brand-gold)]"
                style={{ width: `${item.enabled ? item.weight : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ThresholdCard
          title="Readiness Rules"
          fields={[
            ["readyNow", "Ready Now ≥"],
            ["readySoon", "Ready in 6 Months ≥"],
          ]}
          rules={rules}
          onChange={updateRule}
        />

        <ThresholdCard
          title="Potential Rules"
          fields={[
            ["potentialHigh", "High Potential ≥"],
            ["potentialMedium", "Medium Potential ≥"],
          ]}
          rules={rules}
          onChange={updateRule}
        />

        <ThresholdCard
          title="Risk Rules"
          fields={[
            ["riskLow", "Low Risk ≥"],
            ["riskMedium", "Medium Risk ≥"],
          ]}
          rules={rules}
          onChange={updateRule}
        />
      </div>

      {!isValid && (
        <p className="mt-4 rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
          Scoring weights must total exactly 100%.
        </p>
      )}

      {saveMessage && (
        <p className="mt-4 rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-3 text-sm font-semibold text-[var(--text-secondary)]">
          {saveMessage}
        </p>
      )}
    </section>
  );
}

function ThresholdCard({ title, fields = [], rules = {}, onChange }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      <h3 className="font-black text-[var(--text-primary)]">{title}</h3>

      <div className="mt-4 space-y-3">
        {fields.map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {label}
            </span>
            <input
              type="number"
              min="0"
              max="100"
              value={rules[key] ?? 0}
              onChange={(event) => onChange?.(key, event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function TalentPoolTable({ talentPool = [] }) {
  return (
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
      <div className="border-b border-[var(--border-color)] p-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--brand-cyan)]" />
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            Talent Matrix
          </h2>
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Promotion readiness and high-potential view.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-[var(--hover-bg)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Final Score</th>
              <th className="px-5 py-3">Tasks</th>
              <th className="px-5 py-3">Attendance</th>
              <th className="px-5 py-3">Performance</th>
              <th className="px-5 py-3">Engagement</th>
              <th className="px-5 py-3">Readiness</th>
              <th className="px-5 py-3">Potential</th>
              <th className="px-5 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {talentPool.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4">
                  <p className="font-bold text-[var(--text-primary)]">{item.employee}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.role}</p>
                </td>
                <td className="px-5 py-4 text-[var(--text-secondary)]">{item.department}</td>
                <td className={`px-5 py-4 text-lg font-black ${scoreColor(item.talentScore)}`}>
                  {item.talentScore}%
                </td>
                <td className="px-5 py-4">
                  <p className="font-bold">{item.taskScore}%</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.completedTasks || 0}/{item.assignedTasks || 0} done · {item.overdueTasks || 0} overdue
                  </p>
                </td>
                <td className="px-5 py-4">{item.attendanceScore}%</td>
                <td className="px-5 py-4">{item.performanceScore}%</td>
                <td className="px-5 py-4">{item.engagementScore}%</td>
                <td className="px-5 py-4">
                  <span className={`rounded-3xl border px-3 py-1 text-xs font-bold ${readinessTone(item.readiness)}`}>
                    {item.readiness}
                  </span>
                </td>
                <td className="px-5 py-4">{item.potential}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-3xl border px-3 py-1 text-xs font-bold ${riskTone(item.risk)}`}>
                    {item.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SkillsAndSuccessionGrid({ skillMatrix = [], successionPlans = [], careerPaths = [] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[var(--brand-gold)]" />
          <h2 className="text-xl font-black text-[var(--text-primary)]">Skills Matrix</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Static skill coverage and gap signals.
        </p>

        <div className="mt-5 space-y-3">
          {skillMatrix.map((item) => (
            <div key={item.skill} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{item.skill}</p>
                  <p className="text-sm text-[var(--text-muted)]">{item.employees} employee(s)</p>
                </div>
                <span className={`rounded-3xl border px-3 py-1 text-xs font-bold ${riskTone(item.gap)}`}>
                  {item.gap} gap
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[var(--brand-cyan)]" />
          <h2 className="text-xl font-black text-[var(--text-primary)]">Succession Planning</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Critical-role coverage and successor readiness.
        </p>

        <div className="mt-5 space-y-3">
          {successionPlans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{plan.role}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Candidates: {plan.candidates.join(", ")}
                  </p>
                </div>
                <span className={`rounded-3xl border px-3 py-1 text-xs font-bold ${riskTone(plan.risk)}`}>
                  {plan.risk}
                </span>
              </div>

              <div className="mt-4 h-2 rounded-full bg-[var(--hover-bg)]">
                <div
                  className="h-2 rounded-full bg-[var(--brand-cyan)]"
                  style={{ width: `${plan.coverage}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-[var(--text-muted)]">
                {plan.coverage}% succession coverage
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm xl:col-span-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
          <h2 className="text-xl font-black text-[var(--text-primary)]">Career Paths</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Static preview of internal growth tracks.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {careerPaths.map((path) => (
            <div key={path.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[var(--text-primary)]">{path.path}</p>
                <span className="rounded-3xl border border-[var(--border-color)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                  {path.employees} employee(s)
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {path.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="rounded-3xl bg-[var(--hover-bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                      {step}
                    </span>
                    {index < path.steps.length - 1 && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function TalentManagementLoading() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-muted)]">
      Loading talent management...
    </div>
  );
}

export function TalentManagementError({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <p className="font-bold text-[var(--danger)]">Failed to load talent management</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-3xl border border-red-500/20 px-4 py-2 text-sm font-bold text-[var(--danger)]"
      >
        Retry
      </button>
    </div>
  );
}
