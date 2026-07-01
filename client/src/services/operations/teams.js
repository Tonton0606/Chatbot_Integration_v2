import { supabase } from "../../config/supabaseClient";

import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "../workspaceResolver";

import {
  TEAM_MEMBER_ROLES,
  TEAM_STATUSES,
} from "@/constants/operations/teamConstants";

import {
  getTeamTypes,
  normalizeTypeLabel,
} from "./teamTypes";

const DEFAULT_MEMBER_CAPACITY_POINTS = 40;

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function initials(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fullName(employee = {}) {
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ");
}

function normalizeCapacity(value) {
  const numeric = Number(value || 0);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_MEMBER_CAPACITY_POINTS;
  }

  return numeric;
}

function getAssignmentWeight(assignment = {}) {
  const priority = String(assignment.priority || "medium").toLowerCase();

  if (priority === "critical") return 8;
  if (priority === "high") return 5;
  if (priority === "low") return 2;

  return 3;
}

function calculateUtilization(totalPoints, capacity) {
  const safeCapacity = Number(capacity || 0);

  if (!safeCapacity || safeCapacity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((totalPoints / safeCapacity) * 100));
}

function buildTeamTypeMap(teamTypes = []) {
  return teamTypes.reduce((map, type) => {
    if (type?.type_key) {
      map[type.type_key] = type;
    }

    return map;
  }, {});
}

async function logTeamActivity({
  workspaceId,
  teamId,
  actorProfileId,
  activityType,
  title,
  description = null,
  metadata = {},
}) {
  if (!workspaceId || !activityType || !title) return null;

  const { data, error } = await supabase
    .from("operation_team_activity")
    .insert({
      workspace_id: workspaceId,
      team_id: teamId || null,
      actor_profile_id: actorProfileId || null,
      activity_type: activityType,
      title,
      description,
      metadata,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("Team activity log failed:", error);
    return null;
  }

  return data;
}

function normalizeMember(row = {}) {
  const employee = row.employee || {};
  const name = fullName(employee) || employee.email || "Unnamed Employee";
  const capacity = normalizeCapacity(row.capacity_points);

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    team_id: row.team_id,
    member_type: row.employee_id ? "employee" : "profile",
    member_id: row.employee_id || row.profile_id,
    employee_id: row.employee_id,
    profile_id: row.profile_id,
    name,
    initials: initials(name),
    email: employee.email || "",
    role: row.role || "member",
    department: employee.department?.name || "Unassigned",
    position: employee.position?.title || "Unassigned",
    avatar_url: employee.avatar_url || null,
    workload: 0,
    status: row.status || "active",
    capacity_points: capacity,
    joined_at: row.joined_at,
    removed_at: row.removed_at,
    tasks_open: 0,
    tasks_completed: 0,
  };
}

function assignmentBelongsToTeam(assignment = {}, team = {}) {
  if (assignment.status !== "active") {
    return false;
  }

  if (assignment.assignee_type === "team") {
    return assignment.team_id === team.id;
  }

  if (assignment.assignee_type === "employee") {
    return (team.members || []).some(
      (member) => member.employee_id === assignment.employee_id
    );
  }

  if (assignment.assignee_type === "profile") {
    return (team.members || []).some(
      (member) => member.profile_id === assignment.profile_id
    );
  }

  return false;
}

function assignmentBelongsToMember(assignment = {}, member = {}) {
  if (assignment.status !== "active") {
    return false;
  }

  if (assignment.assignee_type === "employee") {
    return assignment.employee_id === member.employee_id;
  }

  if (assignment.assignee_type === "profile") {
    return assignment.profile_id === member.profile_id;
  }

  return false;
}

function buildMemberMetrics(member = {}, assignments = []) {
  const directAssignments = assignments.filter((assignment) =>
    assignmentBelongsToMember(assignment, member)
  );

  const totalPoints = directAssignments.reduce(
    (sum, assignment) => sum + getAssignmentWeight(assignment),
    0
  );

  const workload = calculateUtilization(totalPoints, member.capacity_points);

  return {
    workload,
    tasks_open: directAssignments.filter(
      (assignment) => assignment.record_type === "task"
    ).length,
    tasks_completed: 0,
  };
}

function buildTeamMetrics(team = {}, assignments = []) {
  const teamAssignments = assignments.filter((assignment) =>
    assignmentBelongsToTeam(assignment, team)
  );

  const totalPoints = teamAssignments.reduce(
    (sum, assignment) => sum + getAssignmentWeight(assignment),
    0
  );

  const capacity = (team.members || []).reduce(
    (sum, member) => sum + normalizeCapacity(member.capacity_points),
    0
  );

  const workload = calculateUtilization(totalPoints, capacity);

  const openTasks = teamAssignments.filter(
    (assignment) => assignment.record_type === "task"
  ).length;

  const completedTasks = teamAssignments.filter(
    (assignment) =>
      assignment.record_type === "task" &&
      ["completed", "done"].includes(String(assignment.status || "").toLowerCase())
  ).length;

  const performance =
    teamAssignments.length > 0
      ? Math.max(0, Math.min(100, 100 - Math.max(0, workload - 70)))
      : 0;

  return {
    assignments: teamAssignments.length,
    open_tasks: openTasks,
    completed_tasks: completedTasks,
    performance,
    workload,
    capacity,
    total_points: totalPoints,
  };
}

function normalizeTeam(row = {}, teamTypeMap = {}, assignments = []) {
  const baseMembers = (row.members || [])
    .filter((member) => !member.removed_at && member.status !== "removed")
    .map(normalizeMember);

  const members = baseMembers.map((member) => ({
    ...member,
    ...buildMemberMetrics(member, assignments),
  }));

  const leadMember =
    members.find((member) => member.employee_id === row.lead_employee_id) ||
    members.find((member) => member.profile_id === row.lead_profile_id) ||
    null;

  const teamType = teamTypeMap[row.type] || null;

  const team = {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    type: row.type,
    type_label: teamType?.label || normalizeTypeLabel(row.type),
    type_color: teamType?.color || row.color || null,
    description: row.description || "",
    status: row.status || "active",
    color: row.color || teamType?.color || null,
    lead_employee_id: row.lead_employee_id,
    lead_profile_id: row.lead_profile_id,
    lead_member_id: leadMember?.id || null,
    lead_member: leadMember,
    lead_name: leadMember?.name || "Unassigned",
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
    archived_by: row.archived_by,
    members,
    member_ids: members.map((member) => member.employee_id || member.profile_id),
    member_count: members.length,
    metrics: {
      assignments: 0,
      open_tasks: 0,
      completed_tasks: 0,
      performance: 0,
      workload: 0,
      capacity: 0,
      total_points: 0,
    },
  };

  return {
    ...team,
    metrics: buildTeamMetrics(team, assignments),
  };
}

function applyTeamFilters(teams = [], filters = {}) {
  const search = normalizeSearch(filters.search);

  return teams.filter((team) => {
    const matchesSearch =
      !search ||
      team.name?.toLowerCase().includes(search) ||
      team.type_label?.toLowerCase().includes(search) ||
      team.lead_name?.toLowerCase().includes(search);

    const matchesStatus =
      !filters.status ||
      filters.status === "all" ||
      team.status === filters.status;

    const matchesType =
      !filters.type ||
      filters.type === "all" ||
      team.type === filters.type;

    const workload = team.metrics?.workload || 0;
    const matchesWorkload =
      !filters.workload ||
      filters.workload === "all" ||
      (filters.workload === "light" && workload < 60) ||
      (filters.workload === "moderate" && workload >= 60 && workload < 75) ||
      (filters.workload === "heavy" && workload >= 75 && workload < 90) ||
      (filters.workload === "overloaded" && workload >= 90);

    return matchesSearch && matchesStatus && matchesType && matchesWorkload;
  });
}

async function fetchTeamsBase() {
  const workspaceId = await getCurrentWorkspaceId();

  const [teamsResult, assignmentsResult, teamTypes] = await Promise.all([
    supabase
      .from("operation_teams")
      .select(`
        id,
        workspace_id,
        name,
        type,
        description,
        status,
        color,
        lead_employee_id,
        lead_profile_id,
        created_by,
        archived_at,
        archived_by,
        created_at,
        updated_at,
        members:operation_team_members (
          id,
          workspace_id,
          team_id,
          employee_id,
          profile_id,
          role,
          status,
          capacity_points,
          joined_at,
          removed_at,
          employee:hr_employees (
            id,
            employee_code,
            first_name,
            last_name,
            email,
            avatar_url,
            employment_status,
            department:hr_departments (
              id,
              name
            ),
            position:hr_positions (
              id,
              title
            )
          )
        )
      `)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),

    supabase
      .from("operation_assignments")
      .select(`
        id,
        workspace_id,
        record_type,
        assignee_type,
        team_id,
        employee_id,
        profile_id,
        role,
        status,
        priority,
        archived_at
      `)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null),

    getTeamTypes(),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const teamTypeMap = buildTeamTypeMap(teamTypes || []);
  const assignments = assignmentsResult.data || [];

  return (teamsResult.data || []).map((team) =>
    normalizeTeam(team, teamTypeMap, assignments)
  );
}

export async function getTeams(filters = {}) {
  const teams = await fetchTeamsBase();
  return applyTeamFilters(teams, filters);
}

export async function getTeam(id) {
  if (!id) return null;

  const teams = await fetchTeamsBase();
  return teams.find((team) => team.id === id) || null;
}

export async function getTeamMembers(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const search = normalizeSearch(filters.search);

  let query = supabase
    .from("operation_team_members")
    .select(`
      id,
      workspace_id,
      team_id,
      employee_id,
      profile_id,
      role,
      status,
      capacity_points,
      joined_at,
      removed_at,
      employee:hr_employees (
        id,
        employee_code,
        first_name,
        last_name,
        email,
        avatar_url,
        employment_status,
        department:hr_departments (
          id,
          name
        ),
        position:hr_positions (
          id,
          title
        )
      )
    `)
    .eq("workspace_id", workspaceId)
    .is("removed_at", null)
    .order("created_at", { ascending: true });

  if (filters.team_id) {
    query = query.eq("team_id", filters.team_id);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const members = (data || []).map(normalizeMember);

  return members.filter((member) => {
    const matchesSearch =
      !search ||
      member.name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search) ||
      member.department.toLowerCase().includes(search);

    const matchesType =
      !filters.member_type ||
      filters.member_type === "all" ||
      member.member_type === filters.member_type;

    return matchesSearch && matchesType;
  });
}

export async function getTeamMember(id) {
  if (!id) return null;

  const members = await getTeamMembers();
  return members.find((member) => member.id === id) || null;
}

export async function createTeam(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("operation_teams")
    .insert({
      workspace_id: workspaceId,
      name: payload.name?.trim(),
      type: payload.type || "custom",
      description: payload.description?.trim() || null,
      status: payload.status || "active",
      color: payload.color || null,
      lead_employee_id: payload.lead_employee_id || payload.lead_member_id || null,
      lead_profile_id: payload.lead_profile_id || null,
      created_by: userId,
    })
    .select("id, name")
    .single();

  if (error) throw error;

  const memberIds = payload.member_ids || [];
  if (memberIds.length > 0) {
    await updateTeamMembers(data.id, memberIds, {
      workspaceId,
      actorProfileId: userId,
      leadEmployeeId: payload.lead_employee_id || payload.lead_member_id || null,
      logChanges: false,
    });
  }

  await logTeamActivity({
    workspaceId,
    teamId: data.id,
    actorProfileId: userId,
    activityType: "team_created",
    title: `${data.name} created`,
    description: "Team created from Operations Teams module.",
    metadata: {
      source: "teams_crud",
      action_label: "created",
      target_label: data.name,
      target_type: "team",
      severity: "success",
      icon: "👥",
    },
  });

  return getTeam(data.id);
}

export async function updateTeam(id, payload = {}) {
  if (!id) throw new Error("Team ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if ("name" in payload) updates.name = payload.name?.trim();
  if ("type" in payload) updates.type = payload.type || "custom";
  if ("description" in payload) {
    updates.description = payload.description?.trim() || null;
  }
  if ("status" in payload) updates.status = payload.status || "active";
  if ("color" in payload) updates.color = payload.color || null;

  if ("lead_employee_id" in payload || "lead_member_id" in payload) {
    updates.lead_employee_id =
      payload.lead_employee_id || payload.lead_member_id || null;
  }

  if ("lead_profile_id" in payload) {
    updates.lead_profile_id = payload.lead_profile_id || null;
  }

  const { data, error } = await supabase
    .from("operation_teams")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, name")
    .single();

  if (error) throw error;

  if (Array.isArray(payload.member_ids)) {
    await updateTeamMembers(id, payload.member_ids, {
      workspaceId,
      actorProfileId: userId,
      leadEmployeeId: updates.lead_employee_id,
      logChanges: true,
    });
  }

  await logTeamActivity({
    workspaceId,
    teamId: id,
    actorProfileId: userId,
    activityType: "team_updated",
    title: `${data.name} updated`,
    description: "Team configuration updated.",
    metadata: {
      source: "teams_crud",
      action_label: "updated",
      target_label: data.name,
      target_type: "team",
      severity: "info",
      icon: "✏️",
    },
  });

  return getTeam(id);
}

export async function archiveTeam(id) {
  if (!id) throw new Error("Team ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("operation_teams")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, name")
    .single();

  if (error) throw error;

  await supabase
    .from("operation_team_members")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("team_id", id)
    .eq("workspace_id", workspaceId)
    .is("removed_at", null);

  await logTeamActivity({
    workspaceId,
    teamId: id,
    actorProfileId: userId,
    activityType: "team_archived",
    title: `${data.name} archived`,
    description: "Team archived and active memberships removed.",
    metadata: {
      source: "teams_crud",
      action_label: "archived",
      target_label: data.name,
      target_type: "team",
      severity: "warning",
      icon: "🗄️",
    },
  });

  return true;
}

export async function addTeamMember(teamId, employeeId, options = {}) {
  if (!teamId) throw new Error("Team ID is required.");
  if (!employeeId) throw new Error("Employee ID is required.");

  const workspaceId = options.workspaceId || (await getCurrentWorkspaceId());
  const userId = options.actorProfileId || (await getCurrentUserId());

  const { data: existing, error: existingError } = await supabase
    .from("operation_team_members")
    .select("id, removed_at, status")
    .eq("workspace_id", workspaceId)
    .eq("team_id", teamId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { data, error } = await supabase
      .from("operation_team_members")
      .update({
        status: "active",
        role: options.role || "member",
        removed_at: null,
        capacity_points: options.capacity_points || 40,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("operation_team_members")
    .insert({
      workspace_id: workspaceId,
      team_id: teamId,
      employee_id: employeeId,
      role: options.role || "member",
      status: "active",
      capacity_points: options.capacity_points || 40,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

export async function removeTeamMember(teamId, employeeId, options = {}) {
  if (!teamId) throw new Error("Team ID is required.");
  if (!employeeId) throw new Error("Employee ID is required.");

  const workspaceId = options.workspaceId || (await getCurrentWorkspaceId());

  const { error } = await supabase
    .from("operation_team_members")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("team_id", teamId)
    .eq("employee_id", employeeId)
    .is("removed_at", null);

  if (error) throw error;

  return true;
}

export async function updateTeamMembers(
  teamId,
  nextEmployeeIds = [],
  {
    workspaceId,
    actorProfileId,
    leadEmployeeId,
    logChanges = true,
  } = {}
) {
  if (!teamId) throw new Error("Team ID is required.");

  const resolvedWorkspaceId = workspaceId || (await getCurrentWorkspaceId());
  const resolvedActorId = actorProfileId || (await getCurrentUserId());

  const uniqueNextIds = Array.from(
    new Set((nextEmployeeIds || []).filter(Boolean))
  );

  const { data: existingRows, error: existingError } = await supabase
    .from("operation_team_members")
    .select("id, employee_id, status, removed_at")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("team_id", teamId);

  if (existingError) throw existingError;

  const activeExistingIds = (existingRows || [])
    .filter((row) => !row.removed_at && row.status !== "removed")
    .map((row) => row.employee_id)
    .filter(Boolean);

  const toAdd = uniqueNextIds.filter((id) => !activeExistingIds.includes(id));
  const toRemove = activeExistingIds.filter((id) => !uniqueNextIds.includes(id));

  for (const employeeId of toAdd) {
    await addTeamMember(teamId, employeeId, {
      workspaceId: resolvedWorkspaceId,
      actorProfileId: resolvedActorId,
      role: employeeId === leadEmployeeId ? "team_lead" : "member",
    });
  }

  for (const employeeId of toRemove) {
    await removeTeamMember(teamId, employeeId, {
      workspaceId: resolvedWorkspaceId,
      actorProfileId: resolvedActorId,
    });
  }

  if (leadEmployeeId && uniqueNextIds.includes(leadEmployeeId)) {
    await supabase
      .from("operation_team_members")
      .update({
        role: "team_lead",
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", resolvedWorkspaceId)
      .eq("team_id", teamId)
      .eq("employee_id", leadEmployeeId)
      .is("removed_at", null);
  }

  if (logChanges && (toAdd.length > 0 || toRemove.length > 0)) {
    await logTeamActivity({
      workspaceId: resolvedWorkspaceId,
      teamId,
      actorProfileId: resolvedActorId,
      activityType: "team_members_updated",
      title: "Team members updated",
      description: `${toAdd.length} member(s) added, ${toRemove.length} member(s) removed.`,
      metadata: {
        source: "teams_crud",
        action_label: "updated members for",
        target_label: "team",
        target_type: "team",
        severity: "info",
        icon: "👤",
        added_employee_ids: toAdd,
        removed_employee_ids: toRemove,
      },
    });
  }

  return {
    added: toAdd,
    removed: toRemove,
  };
}

export { TEAM_MEMBER_ROLES, TEAM_STATUSES };
