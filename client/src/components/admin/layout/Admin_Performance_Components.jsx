import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Edit,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";

function scoreClass(score) {
  if (score === null || score === undefined || score === "") {
    return "text-[var(--text-muted)]";
  }

  if (Number(score) >= 4.5) return "text-[var(--success)]";
  if (Number(score) >= 3.5) return "text-[var(--brand-gold)]";
  return "text-[var(--danger)]";
}

function progressClass(progress) {
  if (Number(progress) >= 80) return "bg-[var(--success)]";
  if (Number(progress) >= 60) return "bg-[var(--brand-gold)]";
  return "bg-[var(--danger)]";
}

function statusBadge(status) {
  const map = {
    completed:
      "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    in_progress:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    pending:
      "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    overdue:
      "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    on_track:
      "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    at_risk:
      "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    not_started:
      "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
  };

  return map[status] || map.in_progress;
}

function labelize(value = "") {
  return String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function PerformanceHeader({
  onRefresh,
  onCreateCycle,
  onCreateEvaluation,
  onCreateGoal,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Performance Management
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Review cycles, evaluations, goals, and performance intelligence.
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
          onClick={onCreateCycle}
          className="inline-flex items-center gap-2 rounded-3xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-bold text-[#050816]"
        >
          <Plus className="h-4 w-4" />
          Review Cycle
        </button>

        <button
          type="button"
          onClick={onCreateEvaluation}
          className="inline-flex items-center gap-2 rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-4 py-2.5 text-sm font-bold text-[var(--brand-cyan)]"
        >
          <Plus className="h-4 w-4" />
          Evaluation
        </button>

        <button
          type="button"
          onClick={onCreateGoal}
          className="inline-flex items-center gap-2 rounded-3xl border border-green-500/20 bg-[var(--success-soft)] px-4 py-2.5 text-sm font-bold text-[var(--success)]"
        >
          <Plus className="h-4 w-4" />
          Goal
        </button>
      </div>
    </div>
  );
}

export function PerformanceKPICards({
  reviewCycles = [],
  evaluations = [],
  goals = [],
}) {
  const cards = [
    {
      label: "Review Cycles",
      value: reviewCycles.length,
      icon: Trophy,
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Evaluations",
      value: evaluations.length,
      icon: Users,
      color:
        "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "High Performers",
      value: evaluations.filter((item) => Number(item.score || 0) >= 4.5)
        .length,
      icon: TrendingUp,
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Goals On Track",
      value: goals.filter((item) => item.status === "on_track").length,
      icon: Target,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
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

                <h3 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
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

export function PerformanceAIInsights({ insights = [] }) {
  return (
    <div className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-[var(--brand-cyan)]" />

        <div className="flex-1">
          <h3 className="font-bold text-[var(--text-primary)]">
            Performance Intelligence
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            AI-generated performance insights requiring HR validation.
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

export function ReviewCyclesTable({
  reviewCycles = [],
  saving,
  onEdit,
  onDelete,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-color)] p-5">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Review Cycles
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          DB-backed performance review cycles.
        </p>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Cycle Code</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {reviewCycles.length === 0 && (
            <tr>
              <td
                colSpan="6"
                className="px-4 py-10 text-center text-[var(--text-muted)]"
              >
                No review cycles found.
              </td>
            </tr>
          )}

          {reviewCycles.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                {item.cycleCode}
              </td>

              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                {item.name}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {labelize(item.reviewType)}
              </td>

              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                {formatDate(item.startDate)} → {formatDate(item.endDate)}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusBadge(
                    item.status
                  )}`}
                >
                  {labelize(item.status)}
                </span>
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onEdit(item)}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onDelete(item)}
                    className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EvaluationsTable({
  evaluations = [],
  saving,
  onEdit,
  onDelete,
}) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Employee Evaluations
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          DB-backed employee performance evaluations.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border-color)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Review Date</th>
              <th className="px-4 py-3">AI Signal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-color)]">
            {evaluations.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="px-4 py-10 text-center text-[var(--text-muted)]"
                >
                  No evaluations found.
                </td>
              </tr>
            )}

            {evaluations.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {item.employee}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.employeeCode}
                  </p>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {item.department}
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {item.reviewer}
                </td>

                <td
                  className={`px-4 py-3 text-lg font-bold ${scoreClass(
                    item.score
                  )}`}
                >
                  {item.score ?? "—"}
                </td>

                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {formatDate(item.reviewDate)}
                </td>

                <td className="max-w-xs truncate px-4 py-3 text-[var(--brand-cyan)]">
                  {item.aiSignal}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusBadge(
                      item.status
                    )}`}
                  >
                    {labelize(item.status)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onEdit(item)}
                      className="rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onDelete(item)}
                      className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GoalsTable({ goals = [], saving, onEdit, onDelete }) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Employee Goals
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          DB-backed KPI and strategic objective monitoring.
        </p>
      </div>

      <div className="space-y-4">
        {goals.length === 0 && (
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-10 text-center text-[var(--text-muted)]">
            No employee goals found.
          </div>
        )}

        {goals.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)]">
                  {item.goalTitle}
                </h4>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {item.employee} · {item.category}
                </p>

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Due: {formatDate(item.dueDate)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusBadge(
                    item.status
                  )}`}
                >
                  {labelize(item.status)}
                </span>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onEdit(item)}
                  className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
                >
                  <Edit className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onDelete(item)}
                  className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Progress</span>
                <span>{item.progress}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                <div
                  className={`h-full ${progressClass(item.progress)}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewCycleFormModal({
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
      title={isEdit ? "Edit Review Cycle" : "Create Review Cycle"}
      subtitle="Workspace-scoped performance review cycle."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cycle Code">
            <input
              required
              value={form.cycleCode}
              onChange={(event) => update("cycleCode", event.target.value)}
              className="input-base"
              placeholder="RC-2026-Q3"
            />
          </Field>

          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className="input-base"
              placeholder="Q3 2026 Performance Review"
            />
          </Field>

          <Field label="Review Type">
            <select
              value={form.reviewType}
              onChange={(event) => update("reviewType", event.target.value)}
              className="input-base"
            >
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="probationary">Probationary</option>
              <option value="360">360-Degree</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
              className="input-base"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </Field>

          <Field label="Start Date">
            <input
              required
              type="date"
              value={form.startDate}
              onChange={(event) => update("startDate", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="End Date">
            <input
              required
              type="date"
              value={form.endDate}
              onChange={(event) => update("endDate", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Description">
            <input
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className="input-base"
              placeholder="Cycle notes"
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Cycle"}
        />
      </form>
    </ModalShell>
  );
}

export function EvaluationFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  employees,
  reviewCycles,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Evaluation" : "Create Evaluation"}
      subtitle="Employee evaluation connected to a review cycle."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Review Cycle">
            <select
              value={form.reviewCycleId}
              onChange={(event) => update("reviewCycleId", event.target.value)}
              className="input-base"
            >
              <option value="">Unassigned</option>
              {reviewCycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.cycleCode} · {cycle.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employee">
            <select
              required
              value={form.employeeId}
              onChange={(event) => update("employeeId", event.target.value)}
              className="input-base"
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} · {employee.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reviewer">
            <select
              value={form.reviewerEmployeeId}
              onChange={(event) =>
                update("reviewerEmployeeId", event.target.value)
              }
              className="input-base"
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} · {employee.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Score">
            <input
              type="number"
              min="0"
              max="5"
              step="0.01"
              value={form.score}
              onChange={(event) => update("score", event.target.value)}
              className="input-base"
              placeholder="4.50"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
              className="input-base"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </Field>

          <Field label="Review Date">
            <input
              type="date"
              value={form.reviewDate}
              onChange={(event) => update("reviewDate", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Summary">
            <input
              value={form.summary}
              onChange={(event) => update("summary", event.target.value)}
              className="input-base"
              placeholder="Evaluation summary"
            />
          </Field>

          <Field label="Strengths">
            <input
              value={form.strengths}
              onChange={(event) => update("strengths", event.target.value)}
              className="input-base"
              placeholder="Strengths"
            />
          </Field>

          <Field label="Improvement Areas">
            <input
              value={form.improvementAreas}
              onChange={(event) =>
                update("improvementAreas", event.target.value)
              }
              className="input-base"
              placeholder="Improvement areas"
            />
          </Field>

          <Field label="AI Signal">
            <input
              value={form.aiSignal}
              onChange={(event) => update("aiSignal", event.target.value)}
              className="input-base"
              placeholder="Needs HR review"
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Evaluation"}
        />
      </form>
    </ModalShell>
  );
}

export function GoalFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  employees,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Goal" : "Create Goal"}
      subtitle="Employee goal and KPI tracking."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Employee">
            <select
              required
              value={form.employeeId}
              onChange={(event) => update("employeeId", event.target.value)}
              className="input-base"
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} · {employee.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Goal Title">
            <input
              required
              value={form.goalTitle}
              onChange={(event) => update("goalTitle", event.target.value)}
              className="input-base"
              placeholder="Ship HR module DB integration"
            />
          </Field>

          <Field label="Category">
            <input
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
              className="input-base"
              placeholder="Technical"
            />
          </Field>

          <Field label="Progress">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.progress}
              onChange={(event) => update("progress", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
              className="input-base"
            >
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="completed">Completed</option>
              <option value="not_started">Not Started</option>
            </select>
          </Field>

          <Field label="Due Date">
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => update("dueDate", event.target.value)}
              className="input-base"
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Goal"}
        />
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
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
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            <X className="h-5 w-5" />
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

export function PerformanceLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading performance data...
      </p>
    </div>
  );
}

export function PerformanceErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />

        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load performance management
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
