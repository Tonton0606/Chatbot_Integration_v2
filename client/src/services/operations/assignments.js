import { supabase } from "../../config/supabaseClient";

import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "../workspaceResolver";

import {
  ASSIGNEE_TYPES,
  ASSIGNMENT_RECORD_TYPES,
  ASSIGNMENT_ROLES,
  getAssigneeTypeLabel,
  getAssignmentRoleLabel,
  getPriorityColor,
  getRecordTypeLabel,
} from "@/constants/operations/teamConstants";

const VALID_ASSIGNMENT_ROLES = new Set([
  "primary_owner",
  "secondary_owner",
  "observer",
  "contributor",
  "approver",
]);

const ASSIGNMENT_SELECT = `
  id,
  workspace_id,
  record_type,
  record_id,
  record_label,
  assignee_type,
  team_id,
  employee_id,
  profile_id,
  role,
  status,
  is_primary,
  priority,
  due_date,
  assigned_by,
  assigned_at,
  note,
  archived_at,
  archived_by,
  created_at,
  updated_at,
  team:operation_teams (
    id,
    name
  ),
  employee:hr_employees (
    id,
    first_name,
    last_name,
    email
  ),
  profile:profiles!operation_assignments_profile_id_fkey (
    id,
    full_name,
    email
  )
`;

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(role) {
  const normalized = String(role || "primary_owner").trim();

  if (VALID_ASSIGNMENT_ROLES.has(normalized)) {
    return normalized;
  }

  if (normalized === "reviewer") {
    return "contributor";
  }

  return "primary_owner";
}

function normalizePriority(value, fallback = "medium") {
  const priority = String(value || fallback || "medium").trim().toLowerCase();

  if (["low", "medium", "high", "critical"].includes(priority)) {
    return priority;
  }

  return "medium";
}

function formatMoney(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return `₱${number.toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function buildMeta(parts = []) {
  return parts.filter(Boolean).join(" · ");
}

function inferDealPriority(row = {}) {
  const probability = Number(row.probability || 0);
  const revenue = Number(row.expected_revenue || 0);

  if (revenue >= 250000) return "critical";
  if (revenue >= 100000 || probability >= 80) return "high";
  if (probability <= 25) return "low";

  return "medium";
}

function inferLeadPriority(row = {}) {
  const probability = Number(row.probability || 0);
  const value = Number(row.estimated_value || 0);

  if (value >= 250000) return "critical";
  if (value >= 100000 || probability >= 80) return "high";
  if (probability <= 25) return "low";

  return "medium";
}

function employeeName(employee = {}) {
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ");
}

function profileName(profile = {}) {
  return profile?.full_name || profile?.email || "Profile";
}

function normalizeAssignment(row = {}) {
  const teamLabel = row.team?.name || "";
  const employeeLabel =
    employeeName(row.employee || {}) || row.employee?.email || "";
  const profileLabel = profileName(row.profile || {});

  const assigneeLabel =
    row.assignee_type === "team"
      ? teamLabel
      : row.assignee_type === "employee"
        ? employeeLabel
        : profileLabel;

  return {
    id: row.id,
    workspace_id: row.workspace_id,

    record_type: row.record_type,
    record_id: row.record_id,
    record_label: row.record_label || "Untitled record",
    record_type_label: getRecordTypeLabel(row.record_type),

    assignee_type: row.assignee_type,
    assignee_id: row.team_id || row.employee_id || row.profile_id,
    assignee_label: assigneeLabel || "Unassigned",
    assignee_type_label: getAssigneeTypeLabel(row.assignee_type),

    team_id: row.team_id,
    employee_id: row.employee_id,
    profile_id: row.profile_id,

    role: row.role,
    role_label: getAssignmentRoleLabel(row.role),
    status: row.status,
    is_primary: !!row.is_primary,

    priority: row.priority || "medium",
    priority_color: getPriorityColor(row.priority),
    due_date: row.due_date,
    assigned_by: "Admin",
    assigned_at: row.assigned_at,
    note: row.note || "",

    archived_at: row.archived_at,
    archived_by: row.archived_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function applyFilters(assignments = [], filters = {}) {
  let result = [...assignments];

  if (filters.team_id) {
    result = result.filter(
      (assignment) =>
        assignment.assignee_type === "team" &&
        assignment.team_id === filters.team_id
    );
  }

  if (filters.assignee_type && filters.assignee_type !== "all") {
    result = result.filter(
      (assignment) => assignment.assignee_type === filters.assignee_type
    );
  }

  if (filters.assignee_id) {
    result = result.filter(
      (assignment) => assignment.assignee_id === filters.assignee_id
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

  if (filters.search) {
    const search = normalizeValue(filters.search);

    result = result.filter(
      (assignment) =>
        assignment.record_label.toLowerCase().includes(search) ||
        assignment.assignee_label.toLowerCase().includes(search) ||
        assignment.role_label.toLowerCase().includes(search)
    );
  }

  return result;
}

async function logAssignmentActivity({
  workspaceId,
  assignmentId,
  teamId = null,
  actorProfileId = null,
  activityType,
  title,
  description = null,
  metadata = {},
}) {
  if (!workspaceId || !assignmentId || !activityType || !title) {
    return null;
  }

  const { data, error } = await supabase
    .from("operation_team_activity")
    .insert({
      workspace_id: workspaceId,
      team_id: teamId || null,
      assignment_id: assignmentId,
      actor_profile_id: actorProfileId || null,
      activity_type: activityType,
      title,
      description,
      metadata,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("Assignment activity log failed:", error);
    return null;
  }

  return data;
}

function buildAssignmentMutationPayload(payload = {}) {
  const role = normalizeRole(payload.role);

  const mutationPayload = {
    record_type: payload.record_type,
    record_id: payload.record_id,
    record_label: payload.record_label || null,
    assignee_type: payload.assignee_type,
    team_id: null,
    employee_id: null,
    profile_id: null,
    role,
    is_primary: payload.is_primary ?? role === "primary_owner",
    priority: normalizePriority(payload.priority),
    due_date: payload.due_date || null,
    note: payload.note || null,
  };

  if (payload.assignee_type === "team") {
    mutationPayload.team_id = payload.assignee_id || payload.team_id || null;
  }

  if (payload.assignee_type === "employee") {
    mutationPayload.employee_id =
      payload.assignee_id || payload.employee_id || null;
  }

  if (payload.assignee_type === "profile") {
    mutationPayload.profile_id =
      payload.assignee_id || payload.profile_id || null;
  }

  return mutationPayload;
}

function applyNullableAssignmentFilter(query, column, value) {
  if (value) {
    return query.eq(column, value);
  }

  return query.is(column, null);
}

async function findExistingActiveAssignment(workspaceId, payload) {
  let query = supabase
    .from("operation_assignments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("record_type", payload.record_type)
    .eq("record_id", payload.record_id)
    .eq("assignee_type", payload.assignee_type)
    .eq("role", payload.role)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  query = applyNullableAssignmentFilter(query, "team_id", payload.team_id);
  query = applyNullableAssignmentFilter(query, "employee_id", payload.employee_id);
  query = applyNullableAssignmentFilter(query, "profile_id", payload.profile_id);

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return data || null;
}

async function getAssignmentRowForMutation(id, workspaceId) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("operation_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeAssignment(data) : null;
}

export async function getAssignments(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from("operation_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return applyFilters((data || []).map(normalizeAssignment), filters);
}

export async function getAssignment(id) {
  if (!id) return null;

  const workspaceId = await getCurrentWorkspaceId();

  return getAssignmentRowForMutation(id, workspaceId);
}

export async function assignRecord(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const assignmentPayload = buildAssignmentMutationPayload(payload);

  const existingAssignment = await findExistingActiveAssignment(
    workspaceId,
    assignmentPayload
  );

  if (existingAssignment?.id) {
    return getAssignment(existingAssignment.id);
  }

  const insertPayload = {
    ...assignmentPayload,
    workspace_id: workspaceId,
    status: "active",
    assigned_by: userId,
  };

  const { data, error } = await supabase
    .from("operation_assignments")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) throw error;

  const assignment = await getAssignmentRowForMutation(data.id, workspaceId);

  await logAssignmentActivity({
    workspaceId,
    assignmentId: data.id,
    teamId: assignment?.team_id || null,
    actorProfileId: userId,
    activityType: "assignment_created",
    title: `${assignment?.record_label || "Assignment"} assigned`,
    description: "Assignment created from Operations Teams module.",
    metadata: {
      source: "assignments_crud",
      action_label: "assigned",
      target_label: assignment?.record_label || "Assignment",
      target_type: "assignment",
      record_type: assignment?.record_type || payload.record_type,
      assignee_type: assignment?.assignee_type || payload.assignee_type,
      assignee_label: assignment?.assignee_label || "Assignee",
      severity: "success",
      icon: "📋",
    },
  });

  return assignment;
}

export async function updateAssignment(id, payload = {}) {
  if (!id) throw new Error("Assignment ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const currentAssignment = await getAssignmentRowForMutation(id, workspaceId);
  if (!currentAssignment?.id) {
    throw new Error("Assignment not found.");
  }

  if (currentAssignment.archived_at || currentAssignment.status === "archived") {
    throw new Error("Archived assignments cannot be updated.");
  }

  const updatePayload = {
    updated_at: new Date().toISOString(),
  };

  if ("record_type" in payload) updatePayload.record_type = payload.record_type;
  if ("record_id" in payload) updatePayload.record_id = payload.record_id;
  if ("record_label" in payload) {
    updatePayload.record_label = payload.record_label || null;
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
      assignee_type: payload.assignee_type || currentAssignment.assignee_type,
    };

    const normalized = buildAssignmentMutationPayload(mergedPayload);

    const existingAssignment = await findExistingActiveAssignment(
      workspaceId,
      normalized
    );

    if (existingAssignment?.id && existingAssignment.id !== id) {
      throw new Error(
        "An active assignment already exists for this record, assignee, and role."
      );
    }

    updatePayload.assignee_type = normalized.assignee_type;
    updatePayload.team_id = normalized.team_id;
    updatePayload.employee_id = normalized.employee_id;
    updatePayload.profile_id = normalized.profile_id;
  }

  if ("role" in payload) {
    const role = normalizeRole(payload.role);
    updatePayload.role = role;
    updatePayload.is_primary = payload.is_primary ?? role === "primary_owner";
  }

  if ("is_primary" in payload) {
    updatePayload.is_primary = !!payload.is_primary;
  }

  if ("priority" in payload) {
    updatePayload.priority = normalizePriority(payload.priority);
  }

  if ("due_date" in payload) {
    updatePayload.due_date = payload.due_date || null;
  }

  if ("status" in payload) {
    updatePayload.status = payload.status || "active";
  }

  if ("note" in payload) {
    updatePayload.note = payload.note || null;
  }

  const { data, error } = await supabase
    .from("operation_assignments")
    .update(updatePayload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .single();

  if (error) throw error;

  const assignment = await getAssignmentRowForMutation(data.id, workspaceId);

  await logAssignmentActivity({
    workspaceId,
    assignmentId: id,
    teamId: assignment?.team_id || currentAssignment.team_id || null,
    actorProfileId: userId,
    activityType: "assignment_changed",
    title: `${assignment?.record_label || "Assignment"} updated`,
    description: "Assignment details changed.",
    metadata: {
      source: "assignments_crud",
      action_label: "updated",
      target_label: assignment?.record_label || "Assignment",
      target_type: "assignment",
      record_type: assignment?.record_type || currentAssignment.record_type,
      previous_assignee_label: currentAssignment.assignee_label,
      assignee_label: assignment?.assignee_label,
      severity: "info",
      icon: "🔄",
    },
  });

  return assignment;
}

export async function removeAssignment(id) {
  if (!id) throw new Error("Assignment ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const assignment = await getAssignmentRowForMutation(id, workspaceId);

  if (!assignment?.id) {
    return true;
  }

  if (assignment.archived_at || assignment.status === "archived") {
    return true;
  }

  const archivedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("operation_assignments")
    .update({
      status: "archived",
      archived_at: archivedAt,
      archived_by: userId,
      updated_at: archivedAt,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    return true;
  }

  await logAssignmentActivity({
    workspaceId,
    assignmentId: id,
    teamId: assignment.team_id || null,
    actorProfileId: userId,
    activityType: "assignment_removed",
    title: `${assignment.record_label || "Assignment"} removed`,
    description: "Assignment archived from Operations Teams module.",
    metadata: {
      source: "assignments_crud",
      action_label: "removed",
      target_label: assignment.record_label || "Assignment",
      target_type: "assignment",
      record_type: assignment.record_type,
      assignee_type: assignment.assignee_type,
      assignee_label: assignment.assignee_label,
      severity: "warning",
      icon: "🗑️",
    },
  });

  return true;
}

export async function getAssignmentTargets(recordType) {
  await getCurrentWorkspaceId();

  if (!recordType) {
    const [tasks, projects, leads, deals] = await Promise.all([
      getAssignmentTargets("task"),
      getAssignmentTargets("project"),
      getAssignmentTargets("lead"),
      getAssignmentTargets("deal"),
    ]);

    return {
      task: tasks,
      project: projects,
      lead: leads,
      deal: deals,
    };
  }

  if (recordType === "task") {
    const { data, error } = await supabase
      .from("admin_tasks")
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        project:project_id (
          id,
          project_name
        ),
        assigned_user:assigned_to (
          id,
          full_name,
          email
        )
      `)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      label: row.title,
      status: row.status,
      priority: normalizePriority(row.priority),
      due_date: row.due_date,
      project: row.project?.project_name || null,
      assignee: row.assigned_user?.full_name || row.assigned_user?.email || null,
      assignee_id: row.assigned_user?.id || null,
      meta: buildMeta([
        row.status,
        row.project?.project_name,
        row.assigned_user?.full_name || row.assigned_user?.email
          ? `Assigned: ${
              row.assigned_user?.full_name || row.assigned_user?.email
            }`
          : null,
        row.due_date ? `Due ${row.due_date}` : "No due date",
      ]),
    }));
  }

  const workspaceId = await getCurrentWorkspaceId();

  if (recordType === "project") {
    const { data, error } = await supabase
      .from("projects")
      .select(`
        id,
        project_name,
        status,
        progress_percent,
        progress,
        target_launch_date,
        actual_launch_date,
        start_date,
        modules_included,
        modules_availed,
        sale_value,
        assigned_member,
        assigned_admin_id,
        external_client_name,
        external_client_email,
        archived_at
      `)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => {
      const progress = Number(row.progress_percent ?? row.progress ?? 0);
      const dueDate = row.target_launch_date || row.actual_launch_date || null;

      return {
        id: row.id,
        label: row.project_name,
        status: row.status,
        priority: "medium",
        due_date: dueDate,
        project: row.modules_included || null,
        assignee: row.assigned_member || row.external_client_name || null,
        assignee_id: row.assigned_admin_id || null,
        progress_percent: progress,
        sale_value: row.sale_value || 0,
        meta: buildMeta([
          row.status,
          row.modules_included,
          row.external_client_name,
          formatMoney(row.sale_value),
          `${progress}% progress`,
          dueDate ? `Target ${dueDate}` : null,
          row.assigned_member ? `Assigned: ${row.assigned_member}` : null,
        ]),
      };
    });
  }

  if (recordType === "lead") {
    const { data, error } = await supabase
      .from("client_leads")
      .select(`
        id,
        title,
        status,
        source,
        estimated_value,
        probability,
        assignment_type,
        assigned_user_id,
        assigned_contact_id,
        assigned_name
      `)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      label: row.title,
      status: row.status,
      priority: inferLeadPriority(row),
      due_date: null,
      project: row.source || null,
      assignee: row.assigned_name || null,
      assignee_id: row.assigned_user_id || row.assigned_contact_id || null,
      estimated_value: row.estimated_value || 0,
      probability: row.probability || 0,
      meta: buildMeta([
        row.status,
        row.source,
        formatMoney(row.estimated_value),
        row.probability ? `${row.probability}% probability` : null,
        row.assigned_name ? `Assigned: ${row.assigned_name}` : null,
      ]),
    }));
  }

  if (recordType === "deal") {
    const { data, error } = await supabase
      .from("client_deals")
      .select(`
        id,
        title,
        stage,
        status,
        expected_revenue,
        probability,
        expected_close_date,
        source,
        assignment_type,
        assigned_user_id,
        assigned_contact_id,
        assigned_name
      `)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      label: row.title,
      status: row.stage || row.status,
      priority: inferDealPriority(row),
      due_date: row.expected_close_date,
      project: row.source || null,
      assignee: row.assigned_name || null,
      assignee_id: row.assigned_user_id || row.assigned_contact_id || null,
      expected_revenue: row.expected_revenue || 0,
      probability: row.probability || 0,
      meta: buildMeta([
        row.stage || row.status,
        row.source,
        formatMoney(row.expected_revenue),
        row.probability ? `${row.probability}% probability` : null,
        row.expected_close_date ? `Close ${row.expected_close_date}` : null,
        row.assigned_name ? `Assigned: ${row.assigned_name}` : null,
      ]),
    }));
  }

  return [];
}

export async function getAssignmentTarget(recordType, recordId) {
  if (!recordType || !recordId) return null;

  const targets = await getAssignmentTargets(recordType);
  return targets.find((target) => target.id === recordId) || null;
}

export { ASSIGNEE_TYPES, ASSIGNMENT_RECORD_TYPES, ASSIGNMENT_ROLES };
