export const TEAM_TYPES = [
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "support", label: "Support" },
  { value: "project", label: "Project" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR" },
  { value: "it", label: "IT" },
  { value: "custom", label: "Custom" },
];

export const TEAM_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

export const TEAM_MEMBER_ROLES = [
  { value: "team_lead", label: "Team Lead" },
  { value: "manager", label: "Manager" },
  { value: "senior_member", label: "Senior Member" },
  { value: "member", label: "Member" },
  { value: "observer", label: "Observer" },
];

export const ASSIGNEE_TYPES = [
  { value: "team", label: "Team" },
  { value: "employee", label: "Employee" },
  { value: "profile", label: "Person" },
];

export const ASSIGNMENT_TYPES = ASSIGNEE_TYPES;

export const ASSIGNMENT_RECORD_TYPES = [
  { value: "task", label: "Task", icon: "✅" },
  { value: "project", label: "Project", icon: "🚀" },
  { value: "deal", label: "Deal", icon: "💼" },
  { value: "lead", label: "Lead", icon: "🎯" },
  { value: "order", label: "Order", icon: "📦", future: true },
  { value: "inventory", label: "Inventory", icon: "🗄️", future: true },
  { value: "ticket", label: "Ticket", icon: "🎫", future: true },
  { value: "campaign", label: "Campaign", icon: "📣", future: true },
];

export const ASSIGNMENT_TARGET_TYPES = ASSIGNMENT_RECORD_TYPES;

export const ASSIGNMENT_ROLES = [
  {
    value: "primary_owner",
    label: "Primary Owner",
    description: "Full responsibility and notifications",
  },
  {
    value: "secondary_owner",
    label: "Secondary Owner",
    description: "Backup owner with edit access",
  },
  {
    value: "observer",
    label: "Observer",
    description: "Read-only visibility",
  },
  {
    value: "contributor",
    label: "Contributor",
    description: "Can contribute work and updates",
  },
  {
    value: "approver",
    label: "Approver",
    description: "Final sign-off required",
  },
];

export const TEAM_VIEW_TABS = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "teams", label: "Teams", icon: "👥" },
  { id: "assignments", label: "Assignments", icon: "📋" },
  { id: "workload", label: "Workload", icon: "📊" },
  { id: "activity", label: "Activity", icon: "⏱" },
];

export const TEAM_DETAIL_TABS = [
  "Overview",
  "Members",
  "Assignments",
  "Projects",
  "Tasks",
  "Leads",
  "Deals",
  "Activity",
  "Analytics",
];

export const TEAM_TYPE_COLORS = {
  sales: "#4a90d9",
  marketing: "#9b59b6",
  operations: "#c9a84c",
  support: "#27ae60",
  project: "#e74c3c",
  finance: "#1abc9c",
  hr: "#00bcd4",
  it: "#8a94a6",
  custom: "#f5a623",
};

export const PRIORITY_COLORS = {
  critical: "#e74c3c",
  high: "#f5a623",
  medium: "#4a90d9",
  low: "#27ae60",
};

export const PRIORITY_DOT = PRIORITY_COLORS;

export const RECORD_TYPE_ICONS = ASSIGNMENT_RECORD_TYPES.reduce((map, item) => {
  map[item.value] = item.icon;
  return map;
}, {});

export const TYPE_ICONS = RECORD_TYPE_ICONS;

export function getTeamTypeLabel(value) {
  return TEAM_TYPES.find((item) => item.value === value)?.label || value || "Custom";
}

export function getAssigneeTypeLabel(value) {
  return ASSIGNEE_TYPES.find((item) => item.value === value)?.label || value || "Assignee";
}

export function getRecordTypeLabel(value) {
  return ASSIGNMENT_RECORD_TYPES.find((item) => item.value === value)?.label || value || "Record";
}

export function getAssignmentRoleLabel(value) {
  return ASSIGNMENT_ROLES.find((item) => item.value === value)?.label || value || "Role";
}

export function getWorkloadColor(value = 0) {
  if (value >= 90) return "#e74c3c";
  if (value >= 75) return "#f5a623";
  return "#27ae60";
}

export function getPerformanceColor(value = 0) {
  if (value >= 85) return "#27ae60";
  if (value >= 70) return "#f5a623";
  return "#e74c3c";
}

export function getPriorityColor(priority = "medium") {
  return PRIORITY_COLORS[String(priority).toLowerCase()] || PRIORITY_COLORS.medium;
}

export function getTeamTypeColor(type = "custom") {
  return TEAM_TYPE_COLORS[type] || TEAM_TYPE_COLORS.custom;
}

export const WORKLOAD_COLOR = getWorkloadColor;
export const PERFORMANCE_COLOR = getPerformanceColor;
