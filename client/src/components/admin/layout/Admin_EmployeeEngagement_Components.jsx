import {
  AlertTriangle,
  Brain,
  HeartHandshake,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

function scoreColor(score = 0) {
  if (Number(score) >= 80) return "text-[var(--success)]";
  if (Number(score) >= 70) return "text-[var(--brand-gold)]";
  return "text-[var(--danger)]";
}

function progressColor(score = 0) {
  if (Number(score) >= 80) return "bg-[var(--success)]";
  if (Number(score) >= 70) return "bg-[var(--brand-gold)]";
  return "bg-[var(--danger)]";
}

function sentimentBadge(sentiment = "neutral") {
  const map = {
    positive:
      "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    neutral:
      "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    negative:
      "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
  };

  return map[sentiment] || map.neutral;
}

function riskBadge(level = "medium") {
  const map = {
    high: "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    medium:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    low: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
  };

  return map[level] || map.medium;
}

function trendIndicator(trend = "stable") {
  if (trend === "up") return "text-[var(--success)]";
  if (trend === "down") return "text-[var(--danger)]";
  return "text-[var(--brand-gold)]";
}

function clampPercent(value = 0) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

export function EmployeeEngagementHeader({
  onRefresh,
  onCreateSurvey,
  onCreateRecognition,
  onCreateFeedback,
  onCreateRisk,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Employee Engagement
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Pulse surveys, recognition systems, workforce sentiment, and retention intelligence.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        <button
          type="button"
          onClick={onCreateSurvey}
          className="rounded-3xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-bold text-[#050816]"
        >
          + Survey
        </button>

        <button
          type="button"
          onClick={onCreateFeedback}
          className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-4 py-2.5 text-sm font-bold text-[var(--brand-cyan)]"
        >
          + Feedback
        </button>

	<button
          type="button"
          onClick={onCreateRecognition}
          className="rounded-3xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-4 py-2.5 text-sm font-bold text-[var(--brand-gold)]"
        >
          + Recognition
        </button>

        <button
          type="button"
          onClick={onCreateRisk}
          className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-2.5 text-sm font-bold text-[var(--danger)]"
        >
          + Risk
        </button>
      </div>
    </div>
  );
}

export function EngagementKPICards({ overview = {} }) {
  const engagementScore = Number(overview.engagementScore || 0);
  const satisfactionScore = Number(overview.satisfactionScore || 0);
  const wellnessScore = Number(overview.wellnessScore || 0);
  const participationRate = Number(
    overview.participationRate || overview.engagementScore || 0
  );

  const cards = [
    {
      label: "Engagement",
      value: engagementScore,
      icon: HeartHandshake,
      suffix: "%",
      color:
        "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Satisfaction",
      value: satisfactionScore,
      icon: Sparkles,
      suffix: "%",
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Wellness",
      value: wellnessScore,
      icon: Users,
      suffix: "%",
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      label: "Participation",
      value: participationRate,
      icon: Trophy,
      suffix: "%",
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
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

                <h3 className={`mt-4 text-3xl font-bold ${scoreColor(card.value)}`}>
                  {card.value}
                  {card.suffix}
                </h3>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-3xl border ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--hover-bg)]">
              <div
                className={`h-full ${progressColor(card.value)}`}
                style={{ width: `${clampPercent(card.value)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EngagementAIInsights({ insights = [] }) {
  return (
    <div className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-[var(--brand-cyan)]" />

        <div className="flex-1">
          <h3 className="font-bold text-[var(--text-primary)]">
            Employee Intelligence
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            AI-generated engagement and retention observations.
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

export function DepartmentSentimentTable({ departments = [] }) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Department Sentiment
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Employee mood and satisfaction indicators by department.
        </p>
      </div>

      <div className="space-y-4">
        {departments.length === 0 && (
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-8 text-center text-[var(--text-muted)]">
            No department sentiment data found.
          </div>
        )}

        {departments.map((item) => {
          const departmentName =
            item.department || item.dept || item.name || "Department";

          return (
            <div
              key={item.id || departmentName}
              className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)]">
                    {departmentName}
                  </h4>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Workforce sentiment analysis
                  </p>
                </div>

                <div
                  className={`flex items-center gap-2 text-sm font-bold ${trendIndicator(
                    item.trend
                  )}`}
                >
                  <span>
                    {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→"}
                  </span>
                  <span>{item.score || 0}%</span>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                <div
                  className={`h-full ${progressColor(item.score)}`}
                  style={{ width: `${clampPercent(item.score)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PulseSurveysTable({ surveys = [], saving, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Survey</th>
            <th className="px-4 py-3">Responses</th>
            <th className="px-4 py-3">Participation</th>
            <th className="px-4 py-3">Average</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {surveys.length === 0 && (
            <tr>
              <td
                colSpan="6"
                className="px-4 py-10 text-center text-[var(--text-muted)]"
              >
                No pulse surveys found.
              </td>
            </tr>
          )}

          {surveys.map((item) => {
            const total = Number(item.totalRecipients || item.total || 0);
            const responses = Number(item.responsesCount || item.responses || 0);
            const average = Number(item.averageScore || item.average || 0);
            const percentage = total ? Math.round((responses / total) * 100) : 0;

            return (
              <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.surveyCode}
                  </p>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {responses}/{total}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                      <div
                        className={`h-full ${progressColor(percentage)}`}
                        style={{ width: `${clampPercent(percentage)}%` }}
                      />
                    </div>

                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      {percentage}%
                    </span>
                  </div>
                </td>

                <td className={`px-4 py-3 text-lg font-bold ${scoreColor(average)}`}>
                  {average}
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-full border border-green-500/20 bg-[var(--success-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--success)]">
                    {item.status}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <ActionButtons
                    saving={saving}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RecognitionFeed({ items = [], saving, onEdit, onDelete }) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5 flex items-center gap-3">
        <Trophy className="h-5 w-5 text-[var(--brand-gold)]" />

        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Recognition Feed
          </h3>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Workforce recognition and peer appreciation stream.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-8 text-center text-[var(--text-muted)]">
            No recognition items found.
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[var(--brand-cyan)]">
                    {item.from}
                  </span>

                  <span className="text-[var(--text-muted)]">recognized</span>

                  <span className="font-semibold text-[var(--text-primary)]">
                    {item.to}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  "{item.message}"
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  {item.category}
                </span>

                <ActionButtons
                  saving={saving}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <HeartHandshake className="h-4 w-4" />
              {item.likes} recognitions
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RetentionRiskTable({ risks = [], saving, onEdit, onDelete }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-5">
      <div className="mb-5 flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-[var(--danger)]" />

        <div>
          <h3 className="text-lg font-bold text-[var(--danger)]">
            Retention Risk Monitoring
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">
            AI-generated workforce retention indicators requiring HR review.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {risks.length === 0 && (
          <div className="rounded-3xl border border-red-500/10 bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">
            No retention risks found.
          </div>
        )}

        {risks.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-red-500/10 bg-[var(--bg-card)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)]">
                  {item.employee}
                </h4>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {item.department}
                </p>

                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.aiNote || item.reason || "Needs HR review."}
                </p>

                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {(item.signals || []).join(", ")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${riskBadge(
                    item.riskLevel
                  )}`}
                >
                  {item.riskLevel}
                </span>

                <ActionButtons
                  saving={saving}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeedbackTable({ feedback = [], saving, onEdit, onDelete }) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-[var(--brand-cyan)]" />

        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Employee Feedback
          </h3>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Anonymous and named workforce feedback collection.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {feedback.length === 0 && (
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-8 text-center text-[var(--text-muted)]">
            No feedback items found.
          </div>
        )}

        {feedback.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-cyan)]">
                  {item.topic}
                </span>

                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${sentimentBadge(
                    item.sentiment
                  )}`}
                >
                  {item.sentiment}
                </span>
              </div>

              <ActionButtons
                saving={saving}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              {item.content}
            </p>

            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {item.type} · {item.employee}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButtons({ saving, onEdit, onDelete }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={saving}
        onClick={onEdit}
        className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
      >
        ✏
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={onDelete}
        className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:opacity-60"
      >
        🗑
      </button>
    </div>
  );
}

export function PulseSurveyFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Pulse Survey" : "Create Pulse Survey"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Survey Code">
            <input
              required
              className="input-base"
              value={form.surveyCode}
              onChange={(event) => update("surveyCode", event.target.value)}
            />
          </Field>

          <Field label="Title">
            <input
              required
              className="input-base"
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </Field>

          <Field label="Sent Date">
            <input
              type="date"
              className="input-base"
              value={form.sentDate}
              onChange={(event) => update("sentDate", event.target.value)}
            />
          </Field>

          <Field label="Deadline">
            <input
              type="date"
              className="input-base"
              value={form.deadline}
              onChange={(event) => update("deadline", event.target.value)}
            />
          </Field>

          <Field label="Total Recipients">
            <input
              type="number"
              min="0"
              className="input-base"
              value={form.totalRecipients}
              onChange={(event) => update("totalRecipients", event.target.value)}
            />
          </Field>

          <Field label="Responses">
            <input
              type="number"
              min="0"
              className="input-base"
              value={form.responsesCount}
              onChange={(event) => update("responsesCount", event.target.value)}
            />
          </Field>

          <Field label="Average Score">
            <input
              type="number"
              min="0"
              max="100"
              className="input-base"
              value={form.averageScore}
              onChange={(event) => update("averageScore", event.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              className="input-base"
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
            </select>
          </Field>

          <Field label="Description">
            <input
              className="input-base"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Survey"}
        />
      </form>
    </ModalShell>
  );
}

export function FeedbackFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  employees = [],
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell title={isEdit ? "Edit Feedback" : "Create Feedback"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Employee">
            <EmployeeSelect
              value={form.employeeId}
              employees={employees}
              onChange={(value) => update("employeeId", value)}
            />
          </Field>

          <Field label="Type">
            <select
              className="input-base"
              value={form.type}
              onChange={(event) => update("type", event.target.value)}
            >
              <option value="anonymous">Anonymous</option>
              <option value="named">Named</option>
            </select>
          </Field>

          <Field label="Topic">
            <input
              required
              className="input-base"
              value={form.topic}
              onChange={(event) => update("topic", event.target.value)}
            />
          </Field>

          <Field label="Sentiment">
            <select
              className="input-base"
              value={form.sentiment}
              onChange={(event) => update("sentiment", event.target.value)}
            >
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </Field>

          <Field label="Date">
            <input
              type="date"
              className="input-base"
              value={form.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </Field>

          <Field label="Content">
            <input
              required
              className="input-base"
              value={form.content}
              onChange={(event) => update("content", event.target.value)}
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Feedback"}
        />
      </form>
    </ModalShell>
  );
}

export function RetentionRiskFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  employees = [],
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Retention Risk" : "Create Retention Risk"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Employee">
            <EmployeeSelect
              value={form.employeeId}
              employees={employees}
              onChange={(value) => update("employeeId", value)}
            />
          </Field>

          <Field label="Risk Level">
            <select
              className="input-base"
              value={form.riskLevel}
              onChange={(event) => update("riskLevel", event.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>

          <Field label="Signals">
            <input
              className="input-base"
              value={form.signals}
              onChange={(event) => update("signals", event.target.value)}
              placeholder="Overdue review, Low engagement"
            />
          </Field>

          <Field label="Status">
            <input
              className="input-base"
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
            />
          </Field>

          <Field label="AI Note">
            <input
              className="input-base"
              value={form.aiNote}
              onChange={(event) => update("aiNote", event.target.value)}
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Risk"}
        />
      </form>
    </ModalShell>
  );
}

export function RecognitionFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  employees = [],
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Recognition" : "Create Recognition"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Recognized By">
            <EmployeeSelect
              value={form.fromEmployeeId}
              employees={employees}
              onChange={(value) => update("fromEmployeeId", value)}
            />
          </Field>

          <Field label="Recognized Employee">
            <EmployeeSelect
              value={form.toEmployeeId}
              employees={employees}
              onChange={(value) => update("toEmployeeId", value)}
            />
          </Field>

          <Field label="Category">
            <select
              className="input-base"
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            >
              <option value="teamwork">Teamwork</option>
              <option value="leadership">Leadership</option>
              <option value="innovation">Innovation</option>
              <option value="performance">Performance</option>
              <option value="collaboration">Collaboration</option>
              <option value="customer_service">Customer Service</option>
              <option value="achievement">Achievement</option>
            </select>
          </Field>

          <Field label="Date">
            <input
              type="date"
              className="input-base"
              value={form.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </Field>

          <Field label="Likes">
            <input
              type="number"
              min="0"
              className="input-base"
              value={form.likes}
              onChange={(event) => update("likes", event.target.value)}
            />
          </Field>

          <Field label="Message">
            <input
              required
              className="input-base"
              value={form.message}
              onChange={(event) => update("message", event.target.value)}
              placeholder="Recognition message"
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Recognition"}
        />
      </form>
    </ModalShell>
  );
}

function EmployeeSelect({ value, employees = [], onChange }) {
  return (
    <select
      className="input-base"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Unassigned</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.employeeCode} · {employee.name}
        </option>
      ))}
    </select>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-6">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, saving, label }) {
  return (
    <div className="flex justify-end gap-3 border-t border-[var(--border-color)] pt-5">
      <button
        type="button"
        onClick={onClose}
        className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-3xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-bold text-[#050816] disabled:opacity-60"
      >
        {saving ? "Saving..." : label}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function EmployeeEngagementLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading engagement analytics...
      </p>
    </div>
  );
}

export function EmployeeEngagementErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />

        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load employee engagement
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

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
