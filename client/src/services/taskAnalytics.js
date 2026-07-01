const COMPLETED_STATUSES = new Set(["done", "completed"]);
const TERMINAL_STATUSES = new Set(["done", "completed", "cancelled", "canceled", "archived"]);

export function normalizeTaskStatus(status) {
  return String(status || "todo")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function normalizeTaskPriority(priority) {
  return String(priority || "medium").trim().toLowerCase();
}

export function isTaskPastDue(task, now = new Date()) {
  const dueDate = task?.dueDate || task?.due_date;
  if (!dueDate) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;

  return due < today;
}

export function isTaskOpen(task) {
  return !TERMINAL_STATUSES.has(normalizeTaskStatus(task?.status));
}

export function computeTaskStatusMetrics(tasks = []) {
  const statusDistribution = {};

  tasks.forEach((task) => {
    const status = normalizeTaskStatus(task?.status);
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });

  return {
    statusDistribution,
  };
}

export function computeTaskAnalytics(tasks = [], options = {}) {
  const now = options.now || new Date();
  const { statusDistribution } = computeTaskStatusMetrics(tasks);

  const total = tasks.length;
  const completed = tasks.filter((task) =>
    COMPLETED_STATUSES.has(normalizeTaskStatus(task?.status))
  ).length;
  const open = tasks.filter(isTaskOpen).length;
  const blocked = tasks.filter((task) => normalizeTaskStatus(task?.status) === "blocked").length;
  const highPriority = tasks.filter((task) =>
    ["high", "critical"].includes(normalizeTaskPriority(task?.priority))
  ).length;
  const overdue = tasks.filter((task) => {
    return isTaskOpen(task) && isTaskPastDue(task, now);
  }).length;

  return {
    total,
    open,
    completed,
    blocked,
    highPriority,
    overdue,
    statusDistribution,
  };
}

export function generateTaskExecutiveSummary(analytics) {
  const blockedClause = analytics.blocked === 1
    ? "1 task is blocked by dependencies"
    : `${analytics.blocked} tasks are blocked by dependencies`;

  const overdueClause = analytics.overdue === 1
    ? "1 task is overdue"
    : `${analytics.overdue} tasks are overdue`;

  return `The Tasks module currently manages ${analytics.total} scheduled actions across active projects. Of these, ${analytics.completed} tasks have been completed and ${analytics.open} remain open across all active statuses. ${blockedClause}, ${analytics.highPriority} tasks are high priority or critical, and ${overdueClause}. Task data is sourced from the same live dataset used by the Tasks dashboard.`;
}

