import { supabase } from "../../../config/supabaseClient";

import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "../../workspaceResolver";

import { logClientOperationActivity } from "./teams";

const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const VALID_STATUSES = new Set(["pending", "in_progress", "completed", "archived"]);
const VALID_ASSIGNEE_TYPES = new Set(["team", "employee", "profile"]);

const ASSIGNMENT_SELECT = `
  id,
  workspace_id,
  title,
  description,
  record_type,
  record_id,
  record_label,
  assignee_type,
  team_id,
  employee_id,
  profile_id,
  role_id,
  status,
  priority,
  due_date,
  assigned_by,
  assigned_at,
  archived_at,
  archived_by,
  created_by,
  updated_by,
  created_at,
  updated_at,
  team:client_operations_teams (
    id,
    name
  ),
  employee:client_hr_employees!client_operations_assignments_employee_id_fkey (
    id,
    first_name,
    last_name,
    email
  ),
  profile:profiles!client_operations_assignments_profile_id_fkey (
    id,
    full_name,
    email
  ),
  role:client_operations_team_roles (
    id,
    role_key,
    label,
    level
  )
`;

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePriority(value, fallback = "medium") {
  const priority = String(value || fallback || "medium").trim().toLowerCase();
  return VALID_PRIORITIES.has(priority) ? priority : "medium";
}

function normalizeStatus(value, fallback = "pending") {
  const status = String(value || fallback || "pending").trim().toLowerCase();
  return VALID_STATUSES.has(status) ? status : "pending";
}

function normalizeAssigneeType(value, fallback = "employee") {
  const type = String(value || fallback || "employee").trim().toLowerCase();
  return VALID_ASSIGNEE_TYPES.has(type) ? type : "employee";
}

function employeeName(employee = {}) {
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ");
}

function profileName(profile = {}) {
  return profile?.full_name || profile?.email || "Profile";
}

function getAssigneeLabel(row = {}) {
  if (row.assignee_type === "team") {
    return row.team?.name || "Team";
  }

  if (row.assignee_type === "employee") {
    return employeeName(row.employee || {}) || row.employee?.email || "Employee";
  }

  return profileName(row.profile || {});
}

function getStatusLabel(status = "pending") {
  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    archived: "Archived",
  };

  return labels[status] || status;
}

function getPriorityLabel(priority = "medium") {
  const labels = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };

  return labels[priority] || priority;
}

function normalizeAssignment(row = {}) {
  const priority = normalizePriority(row.priority);
  const status = normalizeStatus(row.status);

  return {
    id: row.id,
    workspace_id: row.workspace_id,

    title: row.title || row.record_label || "Untitled assignment",
    description: row.description || "",

    record_type: row.record_type || null,
    record_id: row.record_id || null,
    record_label: row.record_label || row.title || "Untitled record",

    assignee_type: row.assignee_type,
    assignee_id: row.team_id || row.employee_id || row.profile_id,
    assignee_label: getAssigneeLabel(row),

    team_id: row.team_id,
    employee_id: row.employee_id,
    profile_id: row.profile_id,

    role_id: row.role_id,
    role_key: row.role?.role_key || null,
    role_label: row.role?.label || "Owner",
    role_level: Number(row.role?.level ?? 100),

    status,
    status_label: getStatusLabel(status),

    priority,
    priority_label: getPriorityLabel(priority),

    due_date: row.due_date,
    assigned_by: row.assigned_by,
    assigned_at: row.assigned_at,

    archived_at: row.archived_at,
    archived_by: row.archived_by,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function applyFilters(assignments = [], filters = {}) {
  let result = [...assignments];

  if (filters.team_id) {
    result = result.filter((assignment) => assignment.team_id === filters.team_id);
  }

  if (filters.employee_id) {
    result = result.filter(
      (assignment) => assignment.employee_id === filters.employee_id
    );
  }

  if (filters.profile_id) {
    result = result.filter(
      (assignment) => assignment.profile_id === filters.profile_id
    );
  }

  if (filters.assignee_type && filters.assignee_type !== "all") {
    result = result.filter(
      (assignment) => assignment.assignee_type === filters.assignee_type
    );
  }

  if (filters.record_type && filters.record_type !== "all") {
    result = result.filter(
      (assignment) => assignment.record_type === filters.record_type
    );
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((assignment) => assignment.status === filters.status);
  }

  if (filters.priority && filters.priority !== "all") {
    result = result.filter(
      (assignment) => assignment.priority === filters.priority
    );
  }

  if (filters.search) {
    const search = normalizeValue(filters.search);

    result = result.filter(
      (assignment) =>
        assignment.title.toLowerCase().includes(search) ||
        assignment.record_label.toLowerCase().includes(search) ||
        assignment.assignee_label.toLowerCase().includes(search) ||
        assignment.role_label.toLowerCase().includes(search)
    );
  }

  return result;
}

function buildAssignmentMutationPayload(payload = {}) {
  const assigneeType = normalizeAssigneeType(payload.assignee_type);
  const title = String(payload.title || payload.record_label || "").trim();

  if (!title) {
    throw new Error("Assignment title is required.");
  }

  const mutationPayload = {
    title,
    description: payload.description?.trim() || null,
    record_type: payload.record_type || null,
    record_id: payload.record_id || null,
    record_label: payload.record_label || title,
    assignee_type: assigneeType,
    team_id: null,
    employee_id: null,
    profile_id: null,
    role_id: payload.role_id || null,
    status: normalizeStatus(payload.status),
    priority: normalizePriority(payload.priority),
    due_date: payload.due_date || null,
  };

  if (assigneeType === "team") {
    mutationPayload.team_id = payload.assignee_id || payload.team_id || null;
  }

  if (assigneeType === "employee") {
    mutationPayload.employee_id =
      payload.assignee_id || payload.employee_id || null;
  }

  if (assigneeType === "profile") {
    mutationPayload.profile_id =
      payload.assignee_id || payload.profile_id || null;
  }

  if (
    !mutationPayload.team_id &&
    !mutationPayload.employee_id &&
    !mutationPayload.profile_id
  ) {
    throw new Error("Assignment assignee is required.");
  }

  return mutationPayload;
}

async function getAssignmentRow(id, workspaceId) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("client_operations_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeAssignment(data) : null;
}

export async function getClientOperationAssignments(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from("client_operations_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return applyFilters((data || []).map(normalizeAssignment), filters);
}

export async function getClientOperationAssignment(id) {
  if (!id) return null;

  const workspaceId = await getCurrentWorkspaceId();
  return getAssignmentRow(id, workspaceId);
}

export async function createClientOperationAssignment(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const mutationPayload = buildAssignmentMutationPayload(payload);

  const { data, error } = await supabase
    .from("client_operations_assignments")
    .insert({
      workspace_id: workspaceId,
      ...mutationPayload,
      assigned_by: userId,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  const assignment = await getAssignmentRow(data.id, workspaceId);

  await logClientOperationActivity({
    workspaceId,
    assignmentId: data.id,
    teamId: assignment?.team_id || null,
    actorProfileId: userId,
    activityType: "assignment_created",
    title: `${assignment?.title || "Assignment"} created`,
    description: "Assignment created from Client Operations module.",
    metadata: {
      source: "client_operations_assignments",
      action_label: "created",
      target_label: assignment?.title || "Assignment",
      target_type: "assignment",
      assignee_type: assignment?.assignee_type,
      assignee_label: assignment?.assignee_label,
      severity: "success",
      icon: "📋",
    },
  });

  return assignment;
}

export async function updateClientOperationAssignment(id, payload = {}) {
  if (!id) throw new Error("Assignment ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const currentAssignment = await getAssignmentRow(id, workspaceId);

  if (!currentAssignment?.id) {
    throw new Error("Assignment not found.");
  }

  if (currentAssignment.archived_at || currentAssignment.status === "archived") {
    throw new Error("Archived assignments cannot be updated.");
  }

  const updatePayload = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if ("title" in payload) {
    const title = String(payload.title || "").trim();

    if (!title) {
      throw new Error("Assignment title is required.");
    }

    updatePayload.title = title;
  }

  if ("description" in payload) {
    updatePayload.description = payload.description?.trim() || null;
  }

  if ("record_type" in payload) {
    updatePayload.record_type = payload.record_type || null;
  }

  if ("record_id" in payload) {
    updatePayload.record_id = payload.record_id || null;
  }

  if ("record_label" in payload) {
    updatePayload.record_label = payload.record_label || null;
  }

  if ("role_id" in payload) {
    updatePayload.role_id = payload.role_id || null;
  }

  if ("status" in payload) {
    updatePayload.status = normalizeStatus(status, currentAssignment.status);
  }

  if ("priority" in payload) {
    updatePayload.priority = normalizePriority(
      payload.priority,
      currentAssignment.priority
    );
  }

  if ("due_date" in payload) {
    updatePayload.due_date = payload.due_date || null;
  }

  if (
    "assignee_type" in payload ||
    "assignee_id" in payload ||
    "team_id" in payload ||
    "employee_id" in payload ||
    "profile_id" in payload
  ) {
    const mergedPayload = {
      ...currentAssignment,
      ...payload,
      title: payload.title || currentAssignment.title,
      assignee_type: payload.assignee_type || currentAssignment.assignee_type,
    };

    const normalized = buildAssignmentMutationPayload(mergedPayload);

    updatePayload.assignee_type = normalized.assignee_type;
    updatePayload.team_id = normalized.team_id;
    updatePayload.employee_id = normalized.employee_id;
    updatePayload.profile_id = normalized.profile_id;
  }

  const { data, error } = await supabase
    .from("client_operations_assignments")
    .update(updatePayload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .single();

  if (error) throw error;

  const assignment = await getAssignmentRow(data.id, workspaceId);

  await logClientOperationActivity({
    workspaceId,
    assignmentId: id,
    teamId: assignment?.team_id || currentAssignment.team_id || null,
    actorProfileId: userId,
    activityType: "assignment_updated",
    title: `${assignment?.title || "Assignment"} updated`,
    description: "Assignment details updated.",
    metadata: {
      source: "client_operations_assignments",
      action_label: "updated",
      target_label: assignment?.title || "Assignment",
      target_type: "assignment",
      previous_assignee_label: currentAssignment.assignee_label,
      assignee_label: assignment?.assignee_label,
      severity: "info",
      icon: "🔄",
    },
  });

  return assignment;
}

export async function archiveClientOperationAssignment(id) {
  if (!id) throw new Error("Assignment ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const assignment = await getAssignmentRow(id, workspaceId);

  if (!assignment?.id) {
    return true;
  }

  if (assignment.archived_at || assignment.status === "archived") {
    return true;
  }

  const archivedAt = new Date().toISOString();

  const { error } = await supabase
    .from("client_operations_assignments")
    .update({
      status: "archived",
      archived_at: archivedAt,
      archived_by: userId,
      updated_by: userId,
      updated_at: archivedAt,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (error) throw error;

  await logClientOperationActivity({
    workspaceId,
    assignmentId: id,
    teamId: assignment.team_id || null,
    actorProfileId: userId,
    activityType: "assignment_archived",
    title: `${assignment.title || "Assignment"} archived`,
    description: "Assignment archived from Client Operations module.",
    metadata: {
      source: "client_operations_assignments",
      action_label: "archived",
      target_label: assignment.title || "Assignment",
      target_type: "assignment",
      assignee_type: assignment.assignee_type,
      assignee_label: assignment.assignee_label,
      severity: "warning",
      icon: "🗄️",
    },
  });

  return true;
}

export const CLIENT_OPERATION_ASSIGNMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export const CLIENT_OPERATION_ASSIGNMENT_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const CLIENT_OPERATION_ASSIGNEE_TYPES = [
  { value: "team", label: "Team" },
  { value: "employee", label: "Employee" },
  { value: "profile", label: "Workspace User" },
];
