import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FolderKanban,
  Layers,
  List,
  Plus,
  RefreshCw,
  Target,
  X,
} from "lucide-react";

import { PROJECT_STAGE_COLORS } from "../../../services/operations/projects";

import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "../../../services/operations/tasks";

function formatDate(date) {
  if (!date) return "No date";

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPastDue(date) {
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(date) < today;
}

function statusClass(status) {
  if (status === "blocked") return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";

  if (status === "completed") {
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (status === "cancelled") return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

  return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";
}

function priorityClass(priority) {
  if (priority === "Critical") return "text-[var(--brand-cyan)]";
  if (priority === "High") return "text-[var(--danger)]";
  if (priority === "Medium") return "text-[var(--brand-gold)]";

  return "text-[var(--text-muted)]";
}

function labelTaskStatus(status) {
  return TASK_STATUS_LABELS[status] || status || "To Do";
}

function labelTaskPriority(priority) {
  return TASK_PRIORITY_LABELS[priority] || priority || "Medium";
}

function Avatar({ name, size = "h-8 w-8" }) {
  const initials = String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-xs font-black text-[#050816]`}
    >
      {initials}
    </div>
  );
}

function ProgressBar({ value, color = "var(--brand-gold)" }) {
  return (
    <div className="h-1.5 flex-1 rounded-full bg-[var(--hover-bg)]">
      <div
        className="h-1.5 rounded-full"
        style={{
          width: `${Math.min(Number(value || 0), 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

export function ProjectsHeader({ onRefresh, onCreate }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>

        <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">Projects</h1>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Track service delivery, project tasks, milestones, and client work.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm hover:bg-[var(--hover-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#050816] shadow-sm hover:bg-[var(--brand-gold-hover)]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>
    </div>
  );
}

export function ProjectsLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading projects...
      </p>
    </div>
  );
}

export function ProjectsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">Failed to load projects</h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectsKPICards({ projects }) {
  const total = projects.length;
  const active = projects.filter((p) => p.status === "active").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const blocked = projects.filter((p) => p.status === "blocked").length;

  const overdue = projects.filter(
    (p) =>
      isPastDue(p.dueDate) && !["completed", "cancelled"].includes(p.status)
  ).length;

  const avgProgress = total
    ? Math.round(
        projects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / total
      )
    : 0;

  const cards = [
    {
      label: "Total Projects",
      value: total,
      icon: FolderKanban,
      color: "text-[var(--brand-gold)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Active",
      value: active,
      icon: Clock,
      color: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle2,
      color: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "At Risk",
      value: blocked + overdue,
      icon: AlertCircle,
      color: "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
    {
      label: "Avg Progress",
      value: `${avgProgress}%`,
      icon: Target,
      color: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Service Types",
      value: new Set(projects.map((p) => p.serviceCategory)).size,
      icon: Layers,
      color: "text-[var(--brand-gold)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

                <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">
                  Live service delivery data
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${card.color}`}
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

export function ProjectsViewTabs({ activeView, onViewChange }) {
  const tabs = [
    { key: "kanban", label: "Board", icon: FolderKanban },
    { key: "list", label: "List", icon: List },
  ];

  return (
    <div className="flex flex-wrap gap-6 border-b border-[var(--border-color)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onViewChange(tab.key)}
            className={
              activeView === tab.key
                ? "flex items-center gap-2 border-b-2 border-[var(--brand-gold)] pb-3 text-sm font-semibold text-[var(--brand-gold)]"
                : "flex items-center gap-2 pb-3 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProjectsFilterToolbar({
  filters,
  onFilterChange,
  stages,
  members,
  priorities,
  serviceCategories,
}) {
  function update(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 xl:flex-row">
      <input
        className="h-11 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
        placeholder="Search projects, client, service..."
        value={filters.search}
        onChange={(e) => update("search", e.target.value)}
      />

      <select
        className="h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)]"
        value={filters.serviceCategory}
        onChange={(e) => update("serviceCategory", e.target.value)}
      >
        <option value="all">All Services</option>
        {serviceCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        className="h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)]"
        value={filters.stage}
        onChange={(e) => update("stage", e.target.value)}
      >
        <option value="all">All Stages</option>
        {stages.map((stage) => (
          <option key={stage} value={stage}>
            {stage}
          </option>
        ))}
      </select>

      <select
        className="h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)]"
        value={filters.status}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="blocked">Blocked</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <select
        className="h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)]"
        value={filters.manager}
        onChange={(e) => update("manager", e.target.value)}
      >
        <option value="all">All Managers</option>
        {members.map((member) => (
          <option key={member} value={member}>
            {member}
          </option>
        ))}
      </select>

      <select
        className="h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)]"
        value={filters.priority}
        onChange={(e) => update("priority", e.target.value)}
      >
        <option value="all">All Priorities</option>
        {priorities.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const color = PROJECT_STAGE_COLORS[project.stage] || "var(--brand-gold)";

  const overdue =
    isPastDue(project.dueDate) &&
    !["completed", "cancelled"].includes(project.status);

  const completedDeliverables =
    project.deliverables?.filter((item) => item.done).length || 0;

  const deliverableCount = project.deliverables?.length || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-[var(--text-primary)]">{project.name}</h4>

          <p className="mt-1 text-sm font-medium text-[var(--brand-gold)]">
            {project.customer}
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Origin: {project.linkedDeal}
          </p>
        </div>

        <span
          className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
            project.status
          )}`}
        >
          {project.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand-cyan)]">
          {project.serviceCategory}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <ProgressBar
          value={project.progress}
          color={project.status === "blocked" ? "#e74c3c" : color}
        />

        <span className="text-xs font-bold text-[var(--text-secondary)]">
          {project.progress}%
        </span>
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Deliverables:{" "}
        <span className="font-semibold text-[var(--text-secondary)]">
          {completedDeliverables}/{deliverableCount} done
        </span>
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-2">
          <Avatar name={project.manager} size="h-6 w-6" />
          {project.manager}
        </span>

        <span className={overdue ? "font-bold text-[var(--danger)]" : ""}>
          Due {formatDate(project.dueDate)}
        </span>
      </div>
    </button>
  );
}

export function ProjectsKanbanBoard({ stages, projects, onCardClick }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageProjects = projects.filter((p) => p.stage === stage);
        const color = PROJECT_STAGE_COLORS[stage] || "var(--brand-gold)";

        return (
          <div
            key={stage}
            className="min-h-[420px] w-[280px] shrink-0 rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
          >
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />

                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                  {stage}
                </h3>

                <span className="rounded-full bg-[var(--border-color)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
                  {stageProjects.length}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {stageProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-center text-sm text-[var(--text-muted)]">
                  No projects
                </div>
              ) : (
                stageProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => onCardClick(project)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectsListView({ projects, onRowClick }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
        <FolderKanban className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
          No projects found
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Add a service delivery project to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Package</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Manager</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {projects.map((project) => (
            <tr
              key={project.id}
              onClick={() => onRowClick(project)}
              className="cursor-pointer hover:bg-[var(--hover-bg)]"
            >
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                {project.name}
              </td>

              <td className="px-4 py-3 text-[var(--brand-gold)]">{project.customer}</td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {project.serviceCategory}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {project.servicePackage}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">{project.stage}</td>

              <td
                className={`px-4 py-3 font-semibold ${priorityClass(
                  project.priority
                )}`}
              >
                {project.priority}
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProgressBar value={project.progress} />

                  <span className="text-xs text-[var(--text-muted)]">
                    {project.progress}%
                  </span>
                </div>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">{project.manager}</td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {formatDate(project.dueDate)}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTimeline({ activities }) {
  if (!activities?.length) {
    return <p className="text-center text-sm text-[var(--text-muted)]">No activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold capitalize text-[var(--brand-gold)]">
              {activity.type}
            </span>

            <span className="text-xs text-[var(--text-muted)]">
              {formatDate(activity.date)}
            </span>
          </div>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">{activity.note}</p>

          <p className="mt-2 text-xs text-[var(--text-muted)]">{activity.user}</p>
        </div>
      ))}
    </div>
  );
}

export function ProjectDetailDrawer({
  project,
  stages,
  saving,
  onClose,
  onEdit,
  onAddTask,
  onArchive,
  onAddNote,
}) {
  const [tab, setTab] = useState("overview");
  const [note, setNote] = useState("");

  const milestones = project.milestones || [];
  const deliverables = project.deliverables || [];

  const completedMilestones = milestones.filter((m) => m.done).length;
  const completedDeliverables = deliverables.filter((item) => item.done).length;

  async function submitNote() {
    await onAddNote(project.id, note);
    setNote("");
    setTab("activity");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-[var(--bg-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-cyan)]">
                  {project.serviceCategory}
                </span>

                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>
              </div>

              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {project.name}
              </h3>

              <p className="mt-1 text-sm text-[var(--brand-gold)]">{project.customer}</p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Origin deal: {project.linkedDeal}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {stages.map((stage) => (
              <span
                key={stage}
                className="rounded-lg border px-3 py-1 text-xs font-semibold"
                style={{
                  borderColor:
                    project.stage === stage
                      ? PROJECT_STAGE_COLORS[stage]
                      : "var(--border-color)",
                  color:
                    project.stage === stage
                      ? PROJECT_STAGE_COLORS[stage]
                      : "var(--text-muted)",
                  background:
                    project.stage === stage
                      ? `${PROJECT_STAGE_COLORS[stage]}15`
                      : "transparent",
                }}
              >
                {stage}
              </span>
            ))}
          </div>
        </div>

        <div className="flex border-b border-[var(--border-color)]">
          {["overview", "deliverables", "milestones", "activity", "notes"].map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={
                  tab === item
                    ? "border-b-2 border-[var(--brand-gold)] px-4 py-3 text-sm font-semibold capitalize text-[var(--brand-gold)]"
                    : "px-4 py-3 text-sm font-medium capitalize text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }
              >
                {item}
              </button>
            )
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "overview" && (
            <div className="space-y-4 text-sm">
              <Info label="Client / Target" value={project.customer} />
              <Info label="Contact" value={project.contact} />
              <Info label="Service Category" value={project.serviceCategory} />
              <Info label="Service Package" value={project.servicePackage} />
              <Info label="Stage" value={project.stage} />
              <Info label="Priority" value={project.priority} />
              <Info label="Manager" value={project.manager} />
              <Info label="Start Date" value={formatDate(project.startDate)} />
              <Info label="Due Date" value={formatDate(project.dueDate)} />
              <Info label="Progress" value={`${project.progress}%`} />
              <Info label="Description" value={project.description} />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Team
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(project.team || []).map((member) => (
                    <span
                      key={member}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      <Avatar name={member} size="h-5 w-5" />
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "deliverables" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-muted)]">
                {completedDeliverables}/{deliverables.length} deliverables
                completed
              </p>

              {deliverables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-muted)]">
                  No deliverables yet. Use Add Task to create project
                  deliverables.
                </div>
              ) : (
                deliverables.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={
                          deliverable.done
                            ? "font-semibold text-[var(--text-muted)] line-through"
                            : "font-semibold text-[var(--text-primary)]"
                        }
                      >
                        {deliverable.title}
                      </p>

                      <span
                        className={
                          deliverable.done
                            ? "text-xs font-bold text-[var(--success)]"
                            : "text-xs font-bold text-[var(--text-muted)]"
                        }
                      >
                        {deliverable.done ? "Done" : "Pending"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Due {formatDate(deliverable.dueDate)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "milestones" && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-muted)]">
                {completedMilestones}/{milestones.length} milestones completed
              </p>

              {milestones.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-muted)]">
                  Milestones are currently derived from high/critical project
                  tasks.
                </div>
              ) : (
                milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={
                          milestone.done
                            ? "font-semibold text-[var(--text-muted)] line-through"
                            : "font-semibold text-[var(--text-primary)]"
                        }
                      >
                        {milestone.name}
                      </p>

                      <span
                        className={
                          milestone.done
                            ? "text-xs font-bold text-[var(--success)]"
                            : "text-xs font-bold text-[var(--text-muted)]"
                        }
                      >
                        {milestone.done ? "Done" : "Pending"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Due {formatDate(milestone.dueDate)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "activity" && (
            <ActivityTimeline activities={project.activities} />
          )}

          {tab === "notes" && (
            <div className="space-y-3">
              <textarea
                className="min-h-32 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
                placeholder="Write a note about this project..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <button
                type="button"
                disabled={saving || !note.trim()}
                onClick={submitNote}
                className="rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-[#050816] hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Note"}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onAddTask}
            className="rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand-cyan)]"
          >
            Add Task
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onArchive}
            className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectFormModal({
  mode,
  project,
  admins,
  contacts,
  saving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    name: "",
    clientType: "contact",
    contactId: "",
    externalClientName: "",
    externalClientEmail: "",
    stage: "planning",
    progress: 0,
    startDate: "",
    dueDate: "",
    assignedAdminId: "",
    assignedAdminName: "",
    serviceCategory: "",
    saleValue: 0,
    description: "",
  });

  useEffect(() => {
    if (mode === "edit" && project) {
      setForm({
        name: project.name || "",
        clientType: project.raw?.contact_id ? "contact" : "external",
        contactId: project.raw?.contact_id || "",
        externalClientName: project.raw?.external_client_name || "",
        externalClientEmail: project.raw?.external_client_email || "",
        stage: project.raw?.status || "planning",
        progress: project.progress || 0,
        startDate: project.startDate || "",
        dueDate: project.dueDate || "",
        assignedAdminId: project.raw?.assigned_admin_id || "",
        assignedAdminName: project.manager || "",
        serviceCategory: project.serviceCategory || "",
        saleValue: project.raw?.sale_value || 0,
        description: project.description || "",
      });
    }
  }, [mode, project]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Project name is required.");
      return;
    }

    if (form.clientType === "contact" && !form.contactId) {
      alert("Please select a contact.");
      return;
    }

    if (form.clientType === "external" && !form.externalClientName.trim()) {
      alert("Please enter who the project is for.");
      return;
    }

    const selectedAdmin = (admins || []).find(
      (admin) => admin.id === form.assignedAdminId
    );

    onSubmit({
      ...form,
      name: form.name.trim(),
      contactId: form.clientType === "contact" ? form.contactId : null,
      externalClientName:
        form.clientType === "external" ? form.externalClientName.trim() : null,
      externalClientEmail:
        form.clientType === "external" ? form.externalClientEmail.trim() : null,
      assignedAdminName:
        selectedAdmin?.full_name ||
        selectedAdmin?.email ||
        form.assignedAdminName ||
        null,
      description: form.description.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-3xl bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {mode === "edit" ? "Edit Project" : "New Project"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Create projects for contacts or external clients.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Project Name
            </label>

            <input
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Project For
            </label>

            <select
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.clientType}
              onChange={(e) => update("clientType", e.target.value)}
            >
              <option value="contact">Contact</option>
              <option value="external">Other / Manual Name</option>
            </select>
          </div>

          {form.clientType === "contact" && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Select Contact
              </label>

              <select
                className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
                value={form.contactId}
                onChange={(e) => update("contactId", e.target.value)}
              >
                <option value="">Choose contact</option>
                {(contacts || []).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                    {contact.company_name ? ` — ${contact.company_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.clientType === "external" && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Project For
                </label>

                <input
                  className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
                  value={form.externalClientName}
                  onChange={(e) => update("externalClientName", e.target.value)}
                  placeholder="Type client/company/person name"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Email Optional
                </label>

                <input
                  className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
                  value={form.externalClientEmail}
                  onChange={(e) => update("externalClientEmail", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Assigned Admin
            </label>

            <select
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.assignedAdminId}
              onChange={(e) => update("assignedAdminId", e.target.value)}
            >
              <option value="">Unassigned</option>
              {(admins || []).map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name || admin.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Stage
            </label>

            <select
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.stage}
              onChange={(e) => update("stage", e.target.value)}
            >
              <option value="planning">Planning</option>
              <option value="kickoff">Kickoff</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Progress %
            </label>

            <input
              type="number"
              min="0"
              max="100"
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.progress}
              onChange={(e) => update("progress", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Start Date
            </label>

            <input
              type="date"
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Due Date
            </label>

            <input
              type="date"
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Service Category
            </label>

            <input
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.serviceCategory}
              onChange={(e) => update("serviceCategory", e.target.value)}
              placeholder="ERP Implementation, CRM, Analytics..."
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Sale Value
            </label>

            <input
              type="number"
              min="0"
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.saleValue}
              onChange={(e) => update("saleValue", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Description / Notes
            </label>

            <textarea
              className="mt-1 min-h-28 w-full rounded-2xl border border-[var(--border-color)] p-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Project scope, request, bugs, requirements, or context..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-[#050816] hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProjectTaskModal({
  project,
  options,
  saving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    title: "",
    assignedTo: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    description: "",
  });

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Task title is required.");
      return;
    }

    onSubmit({
      title: form.title.trim(),
      assignedTo: form.assignedTo || null,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      description: form.description.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Add Project Task
            </h3>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Create a deliverable task for {project.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Task Title
            </label>

            <input
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Assignee
            </label>

            <select
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.assignedTo}
              onChange={(e) => update("assignedTo", e.target.value)}
            >
              <option value="">Unassigned</option>
              {(options.assignees || []).map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.full_name || assignee.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Status
            </label>

            <select
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelTaskStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Priority
            </label>

            <select
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.priority}
              onChange={(e) => update("priority", e.target.value)}
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {labelTaskPriority(priority)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Due Date
            </label>

            <input
              type="date"
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Description
            </label>

            <textarea
              className="mt-1 min-h-28 w-full rounded-2xl border border-[var(--border-color)] p-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Task details, deliverable context, bug notes, or request..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-[#050816] hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 font-medium text-[var(--text-primary)]">{value || "—"}</p>
    </div>
  );
}
