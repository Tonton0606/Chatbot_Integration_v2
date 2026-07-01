import {
  AlertTriangle,
  Brain,
  Briefcase,
  Edit,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  CANDIDATE_STAGE_LABELS,
  JOB_STATUS_LABELS,
} from "../../../services/human_resources/recruitment";

function labelStage(stage) {
  return CANDIDATE_STAGE_LABELS[stage] || stage || "Applied";
}

function labelJobStatus(status) {
  return JOB_STATUS_LABELS[status] || status || "Active";
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function stageClass(stage) {
  const map = {
    applied:
      "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
    screening:
      "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    interview:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    technical_review: "border-purple-500/20 bg-purple-500/10 text-purple-400",
    final_interview: "border-orange-500/20 bg-orange-500/10 text-orange-400",
    offer: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    hired: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    rejected: "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
  };

  return map[stage] || map.applied;
}

function statusClass(status) {
  const map = {
    active: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    closed: "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
    paused: "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    draft: "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
  };

  return map[status] || map.active;
}

function fitClass(score) {
  if (score >= 90) return "text-[var(--success)]";
  if (score >= 75) return "text-[var(--brand-gold)]";
  return "text-[var(--danger)]";
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function RecruitmentHeader({
  onRefresh,
  onCreateJob,
  onCreateCandidate,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Recruitment AI
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Candidate pipeline, recruitment intelligence, and hiring operations.
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
          onClick={onCreateJob}
          className="inline-flex items-center gap-2 rounded-3xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-bold text-[#050816]"
        >
          <Plus className="h-4 w-4" />
          Job Opening
        </button>

        <button
          type="button"
          onClick={onCreateCandidate}
          className="inline-flex items-center gap-2 rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-4 py-2.5 text-sm font-bold text-[var(--brand-cyan)]"
        >
          <Plus className="h-4 w-4" />
          Candidate
        </button>
      </div>
    </div>
  );
}

export function RecruitmentKPICards({ jobs = [], candidates = [] }) {
  const cards = [
    {
      label: "Open Positions",
      value: jobs.filter((job) => job.status === "active").length,
      icon: Briefcase,
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Candidates",
      value: candidates.length,
      icon: Users,
      color:
        "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Technical Review",
      value: candidates.filter((item) => item.stage === "technical_review")
        .length,
      icon: Target,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      label: "High Fit Candidates",
      value: candidates.filter((item) => item.fitScore >= 90).length,
      icon: TrendingUp,
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
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

export function RecruitmentAIInsights({ insights = [] }) {
  return (
    <div className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-[var(--brand-cyan)]" />

        <div className="flex-1">
          <h3 className="font-bold text-[var(--text-primary)]">
            Recruitment Intelligence
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            AI recruitment analytics requiring recruiter validation.
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

export function RecruitmentJobsTable({
  jobs = [],
  saving,
  onEdit,
  onDelete,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-color)] p-5">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Job Openings
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          DB-backed job postings and hiring demand.
        </p>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Job Code</th>
            <th className="px-4 py-3">Position</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Applicants</th>
            <th className="px-4 py-3">Recruiter</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Deadline</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {jobs.length === 0 && (
            <tr>
              <td
                colSpan="9"
                className="px-4 py-10 text-center text-[var(--text-muted)]"
              >
                No job openings found.
              </td>
            </tr>
          )}

          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                {job.jobCode}
              </td>

              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                {job.title}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {job.department}
              </td>

              <td className="px-4 py-3 font-bold text-[var(--brand-cyan)]">
                {job.applicants}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {job.recruiter}
              </td>

              <td className="px-4 py-3">
                <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-gold)]">
                  {job.priority}
                </span>
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    job.status
                  )}`}
                >
                  {labelJobStatus(job.status)}
                </span>
              </td>

              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                {formatDate(job.deadline)}
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onEdit(job)}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onDelete(job)}
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

export function RecruitmentCandidatesTable({
  candidates = [],
  saving,
  onEdit,
  onDelete,
}) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Candidate Pipeline
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          AI-assisted candidate scoring and recruitment tracking.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border-color)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Fit Score</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Recruiter</th>
              <th className="px-4 py-3">AI Signal</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-color)]">
            {candidates.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="px-4 py-10 text-center text-[var(--text-muted)]"
                >
                  No candidates found.
                </td>
              </tr>
            )}

            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-[var(--hover-bg)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-gold-soft)] text-sm font-bold text-[var(--brand-gold)]">
                      {getInitials(candidate.name)}
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {candidate.name}
                      </p>

                      <p className="text-xs text-[var(--text-muted)]">
                        {candidate.candidateCode}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {candidate.position}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold ${stageClass(
                      candidate.stage
                    )}`}
                  >
                    {labelStage(candidate.stage)}
                  </span>
                </td>

                <td
                  className={`px-4 py-3 text-lg font-bold ${fitClass(
                    candidate.fitScore
                  )}`}
                >
                  {candidate.fitScore}%
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {candidate.source}
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {candidate.recruiter}
                </td>

                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand-cyan)]">
                    <UserPlus className="h-3 w-3" />
                    {candidate.needsReview
                      ? "Needs Review"
                      : candidate.aiRecommendation}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onEdit(candidate)}
                      className="rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onDelete(candidate)}
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

export function JobFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  departments,
  employees,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Job Opening" : "Create Job Opening"}
      subtitle="Workspace-scoped recruitment demand."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Job Code">
            <input
              required
              value={form.jobCode}
              onChange={(event) => update("jobCode", event.target.value)}
              className="input-base"
              placeholder="JOB-2026-002"
            />
          </Field>

          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              className="input-base"
              placeholder="Frontend Engineer"
            />
          </Field>

          <Field label="Department">
            <select
              value={form.departmentId}
              onChange={(event) => update("departmentId", event.target.value)}
              className="input-base"
            >
              <option value="">Unassigned</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Recruiter">
            <select
              value={form.recruiterId}
              onChange={(event) => update("recruiterId", event.target.value)}
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

          <Field label="Employment Type">
            <select
              value={form.type}
              onChange={(event) => update("type", event.target.value)}
              className="input-base"
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </Field>

          <Field label="Priority">
            <select
              value={form.priority}
              onChange={(event) => update("priority", event.target.value)}
              className="input-base"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
              className="input-base"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
            </select>
          </Field>

          <Field label="Open Date">
            <input
              required
              type="date"
              value={form.openDate}
              onChange={(event) => update("openDate", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Deadline">
            <input
              type="date"
              value={form.deadline}
              onChange={(event) => update("deadline", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Description">
            <input
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className="input-base"
              placeholder="Role description"
            />
          </Field>

          <Field label="AI Notes">
            <input
              value={form.aiNotes}
              onChange={(event) => update("aiNotes", event.target.value)}
              className="input-base"
              placeholder="AI screening notes"
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Job"}
        />
      </form>
    </ModalShell>
  );
}

export function CandidateFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  jobs,
  employees,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Candidate" : "Create Candidate"}
      subtitle="Candidate record connected to a job opening."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Candidate Code">
            <input
              required
              value={form.candidateCode}
              onChange={(event) =>
                update("candidateCode", event.target.value)
              }
              className="input-base"
              placeholder="CAN-2026-002"
            />
          </Field>

          <Field label="Job Opening">
            <select
              value={form.jobOpeningId}
              onChange={(event) => update("jobOpeningId", event.target.value)}
              className="input-base"
            >
              <option value="">Unassigned</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobCode} · {job.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="First Name">
            <input
              required
              value={form.firstName}
              onChange={(event) => update("firstName", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Last Name">
            <input
              required
              value={form.lastName}
              onChange={(event) => update("lastName", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Source">
            <input
              value={form.source}
              onChange={(event) => update("source", event.target.value)}
              className="input-base"
              placeholder="LinkedIn"
            />
          </Field>

          <Field label="Recruiter">
            <select
              value={form.recruiterId}
              onChange={(event) => update("recruiterId", event.target.value)}
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

          <Field label="Stage">
            <select
              value={form.stage}
              onChange={(event) => update("stage", event.target.value)}
              className="input-base"
            >
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="technical_review">Technical Review</option>
              <option value="final_interview">Final Interview</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </Field>

          <Field label="Interview Status">
            <input
              value={form.interviewStatus}
              onChange={(event) =>
                update("interviewStatus", event.target.value)
              }
              className="input-base"
              placeholder="pending"
            />
          </Field>

          <Field label="Fit Score">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.fitScore}
              onChange={(event) => update("fitScore", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Skills Match">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.skillsMatch}
              onChange={(event) => update("skillsMatch", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Needs Review">
            <select
              value={form.needsReview ? "true" : "false"}
              onChange={(event) =>
                update("needsReview", event.target.value === "true")
              }
              className="input-base"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </Field>

          <Field label="AI Recommendation">
            <input
              value={form.aiRecommendation}
              onChange={(event) =>
                update("aiRecommendation", event.target.value)
              }
              className="input-base"
              placeholder="Proceed to interview"
            />
          </Field>

          <Field label="AI Summary">
            <input
              value={form.aiSummary}
              onChange={(event) => update("aiSummary", event.target.value)}
              className="input-base"
              placeholder="Candidate summary"
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Candidate"}
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

export function RecruitmentLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading recruitment data...
      </p>
    </div>
  );
}

export function RecruitmentErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />

        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load recruitment
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
