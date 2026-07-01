import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  KanbanSquare,
  Layers,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  CLIENT_TASK_PRIORITY_LABELS,
  CLIENT_TASK_STATUS_LABELS,
} from "../../../services/clientTasks";

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

function statusLabel(status) {
  return CLIENT_TASK_STATUS_LABELS[status] || status || "To Do";
}

function priorityLabel(priority) {
  return CLIENT_TASK_PRIORITY_LABELS[priority] || priority || "Medium";
}

function statusClass(status) {
  if (status === "done") return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  if (status === "blocked") return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  if (status === "review") return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";
  if (status === "in_progress") return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function priorityClass(priority) {
  if (priority === "critical") return "text-[var(--brand-cyan)]";
  if (priority === "high") return "text-[var(--danger)]";
  if (priority === "medium") return "text-[var(--brand-gold)]";

  return "text-[var(--text-muted)]";
}

export function ClientTasksHeader({ onRefresh, onCreate }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          Workspace <span className="mx-1">›</span>{" "}
          <span className="text-[var(--brand-gold)]">Tasks</span>
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">Tasks</h1>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage workspace tasks, project work, priorities, and deadlines.
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
          New Task
        </button>
      </div>
    </div>
  );
}

export function ClientTasksLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading workspace tasks...
      </p>
    </div>
  );
}

export function ClientTasksErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">Failed to load tasks</h3>
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

export function ClientTasksKPICards({ tasks }) {
  const total = tasks.length;
  const open = tasks.filter((task) => task.status !== "done").length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const blocked = tasks.filter((task) => task.status === "blocked").length;
  const overdue = tasks.filter(
    (task) => isPastDue(task.dueDate) && task.status !== "done"
  ).length;
  const standalone = tasks.filter((task) => !task.clientProjectId).length;

  const cards = [
    {
      label: "Total Tasks",
      value: total,
      icon: ListChecks,
      color: "text-[var(--brand-gold)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Open",
      value: open,
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
      label: "Blocked",
      value: blocked,
      icon: AlertCircle,
      color: "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: CalendarDays,
      color: "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
    {
      label: "Standalone",
      value: standalone,
      icon: Layers,
      color: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
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
                  Workspace-safe task data
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

export function ClientTasksToolbar({
  filters,
  onFilterChange,
  statuses,
  priorities,
  view,
  onViewChange,
  projects,
}) {
  function update(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-4 border-b border-[var(--border-color)] py-4">
      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--text-muted)]" />

          <input
            className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
            placeholder="Search tasks, descriptions, projects..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
          />
        </div>

        <select
          className="h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)]"
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="all">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
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
              {priorityLabel(priority)}
            </option>
          ))}
        </select>

        <select
          className="h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)]"
          value={filters.project}
          onChange={(e) => update("project", e.target.value)}
        >
          <option value="all">All Projects</option>
          <option value="standalone">Standalone Tasks</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.project_name || "Untitled Project"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onViewChange("kanban")}
          className={
            view === "kanban"
              ? "inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-[#050816]"
              : "inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          }
        >
          <KanbanSquare className="h-4 w-4" />
          Kanban
        </button>

        <button
          type="button"
          onClick={() => onViewChange("list")}
          className={
            view === "list"
              ? "inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-[#050816]"
              : "inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          }
        >
          <ListChecks className="h-4 w-4" />
          List
        </button>
      </div>
    </div>
  );
}

export function ClientTasksKanban({ tasks, statuses, onSelectTask }) {
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);

        return (
          <div
            key={status}
            className="min-h-96 rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {statusLabel(status)}
              </h3>

              <span className="rounded-full bg-[var(--bg-card)] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onSelectTask(task)}
                />
              ))}

              {columnTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-center text-sm text-[var(--text-muted)]">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientTasksList({ tasks, onSelectTask }) {
  if (!tasks.length) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
        <ListChecks className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
          No tasks found
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Create a workspace task to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
      <div className="grid grid-cols-12 border-b border-[var(--border-color)] bg-[var(--hover-bg)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        <div className="col-span-5">Task</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Priority</div>
        <div className="col-span-2">Due Date</div>
        <div className="col-span-1 text-right">Open</div>
      </div>

      {tasks.map((task) => {
        const overdue = isPastDue(task.dueDate) && task.status !== "done";

        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelectTask(task)}
            className="grid w-full grid-cols-12 items-center border-b border-[var(--border-color)] px-4 py-4 text-left text-sm hover:bg-[var(--hover-bg)]"
          >
            <div className="col-span-5">
              <p className="font-semibold text-[var(--text-primary)]">{task.title}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {task.project?.name || "Standalone task"}
              </p>
            </div>

            <div className="col-span-2">
              <span
                className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(
                  task.status
                )}`}
              >
                {statusLabel(task.status)}
              </span>
            </div>

            <div
              className={`col-span-2 font-semibold ${priorityClass(
                task.priority
              )}`}
            >
              {priorityLabel(task.priority)}
            </div>

            <div
              className={
                overdue
                  ? "col-span-2 font-semibold text-[var(--danger)]"
                  : "col-span-2 text-[var(--text-secondary)]"
              }
            >
              {formatDate(task.dueDate)}
            </div>

            <div className="col-span-1 text-right text-[var(--brand-gold)]">View</div>
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({ task, onClick }) {
  const overdue = isPastDue(task.dueDate) && task.status !== "done";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-[var(--text-primary)]">{task.title}</h4>

        <span className={`text-xs font-bold ${priorityClass(task.priority)}`}>
          {priorityLabel(task.priority)}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">
        {task.description || "No description"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(
            task.status
          )}`}
        >
          {statusLabel(task.status)}
        </span>

        <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
          {task.project?.name || "Standalone"}
        </span>

        {overdue && (
          <span className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] px-2 py-1 text-xs font-bold text-[var(--danger)]">
            Overdue
          </span>
        )}
      </div>

      <p
        className={
          overdue
            ? "mt-3 text-xs font-bold text-[var(--danger)]"
            : "mt-3 text-xs text-[var(--text-muted)]"
        }
      >
        Due {formatDate(task.dueDate)}
      </p>
    </button>
  );
}

export function ClientTaskDetailDrawer({
  task,
  saving,
  onClose,
  onEdit,
  onArchive,
}) {
  const overdue = isPastDue(task.dueDate) && task.status !== "done";

  return (
    <div
      className="fixed bottom-0 right-0 top-[72px] z-50 flex justify-end bg-black/30"
      style={{ left: 0 }}
      onClick={onClose} 
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-[var(--bg-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${statusClass(
                    task.status
                  )}`}
                >
                  {statusLabel(task.status)}
                </span>

                <span
                  className={`rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold uppercase ${priorityClass(
                    task.priority
                  )}`}
                >
                  {priorityLabel(task.priority)}
                </span>

                {overdue && (
                  <span className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] px-2.5 py-1 text-xs font-bold uppercase text-[var(--danger)]">
                    Overdue
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                {task.title}
              </h3>

              <p className="mt-2 text-sm font-medium text-[var(--brand-gold)]">
                {task.project?.name || "Standalone Task"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-secondary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="Status" value={statusLabel(task.status)} />
            <DetailCard label="Priority" value={priorityLabel(task.priority)} />
            <DetailCard
              label="Project"
              value={task.project?.name || "Standalone"}
            />
            <DetailCard
              label="Due Date"
              value={formatDate(task.dueDate)}
              danger={overdue}
            />
            <DetailCard
              label="Completed At"
              value={formatDate(task.completedAt)}
            />
            <DetailCard label="Created By" value={task.createdBy} />
          </div>

          <div className="mt-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Description
            </p>

            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">
              {task.description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          >
            Edit
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onArchive}
            className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientTaskFormModal({
  mode,
  task,
  projects,
  saving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    clientProjectId: "",
  });

  useEffect(() => {
    if (mode === "edit" && task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        dueDate: task.dueDate || "",
        clientProjectId: task.clientProjectId || "",
      });
    }
  }, [mode, task]);

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
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      clientProjectId: form.clientProjectId || null,
    });
  }

  const projectOptions = useMemo(() => {
    return projects.map((project) => [
      project.id,
      project.project_name || "Untitled Project",
    ]);
  }, [projects]);

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
              {mode === "edit" ? "Edit Task" : "New Task"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Create standalone or project-linked workspace tasks.
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
            <Input
              label="Task Title"
              value={form.title}
              onChange={(value) => update("title", value)}
            />
          </div>

          <Select
            label="Linked Project"
            value={form.clientProjectId}
            onChange={(value) => update("clientProjectId", value)}
            options={[["", "Standalone Task"], ...projectOptions]}
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(value) => update("status", value)}
            options={[
              ["todo", "To Do"],
              ["in_progress", "In Progress"],
              ["review", "Review"],
              ["done", "Done"],
              ["blocked", "Blocked"],
            ]}
          />

          <Select
            label="Priority"
            value={form.priority}
            onChange={(value) => update("priority", value)}
            options={[
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["critical", "Critical"],
            ]}
          />

          <Input
            type="date"
            label="Due Date"
            value={form.dueDate}
            onChange={(value) => update("dueDate", value)}
          />

          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Description
            </label>

            <textarea
              className="mt-1 min-h-28 w-full rounded-2xl border border-[var(--border-color)] p-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Task details, deliverable context, or notes..."
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
              : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailCard({ label, value, danger = false }) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={
          danger
            ? "mt-2 text-sm font-bold text-[var(--danger)]"
            : "mt-2 text-sm font-semibold text-[var(--text-primary)]"
        }
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>

      <input
        type={type}
        className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>

      <select
        className="mt-1 h-11 w-full rounded-2xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold-border)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
