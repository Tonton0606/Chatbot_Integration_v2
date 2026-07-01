import { supabase } from "../../../config/supabaseClient";

import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "../../workspaceResolver";

import { getClientOperationTeamTypes } from "./teamTypes";
import { getClientOperationTeamRoles } from "./teamRoles";

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

  if (priority === "urgent") return 8;
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

function buildMap(rows = [], key = "id") {
  return rows.reduce((map, row) => {
    if (row?.[key]) {
      map[row[key]] = row;
    }

    return map;
  }, {});
}

async function logClientOperationActivity({
  workspaceId,
  teamId = null,
  assignmentId = null,
  actorProfileId = null,
  activityType,
  title,
  description = null,
  metadata = {},
}) {
  if (!workspaceId || !activityType || !title) return null;

  const { data, error } = await supabase
    .from("client_operations_activity")
    .insert({
      workspace_id: workspaceId,
      team_id: teamId,
      assignment_id: assignmentId,
      actor_profile_id: actorProfileId,
      activity_type: activityType,
      title,
      description,
      metadata,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("Client operations activity log failed:", error);
    return null;
  }

  return data;
}

function normalizeMember(row = {}) {
  const employee = row.employee || {};
  const role = row.role || {};
  const manager = row.reports_to_member || {};
  const managerEmployee = manager.employee || {};
  const name = fullName(employee) || employee.email || "Unnamed Employee";
  const managerName = fullName(managerEmployee) || managerEmployee.email || null;
  const capacity = normalizeCapacity(row.capacity_points);

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    team_id: row.team_id,
    member_type: row.employee_id ? "employee" : "profile",
    member_id: row.employee_id || row.profile_id,
    employee_id: row.employee_id,
    profile_id: row.profile_id,
    role_id: row.role_id,
    role_key: role.role_key || null,
    role_label: role.label || "Member",
    role_level: Number(role.level ?? 100),
    is_leadership: !!role.is_leadership,
    can_manage_team: !!role.can_manage_team,
    can_manage_assignments: !!role.can_manage_assignments,
    reports_to_member_id: row.reports_to_member_id,
    reports_to_name: managerName,
    name,
    initials: initials(name),
    email: employee.email || "",
    phone: employee.phone || "",
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
    assignments_open: 0,
    assignments_completed: 0,
  };
}

function assignmentBelongsToTeam(assignment = {}, team = {}) {
  if (assignment.archived_at || assignment.status === "archived") {
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
  if (assignment.archived_at || assignment.status === "archived") {
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

  const completedAssignments = directAssignments.filter(
    (assignment) => assignment.status === "completed"
  );

  return {
    workload: calculateUtilization(totalPoints, member.capacity_points),
    assignments_open: directAssignments.filter(
      (assignment) => assignment.status !== "completed"
    ).length,
    assignments_completed: completedAssignments.length,
    tasks_open: directAssignments.filter(
      (assignment) =>
        assignment.record_type === "task" && assignment.status !== "completed"
    ).length,
    tasks_completed: completedAssignments.filter(
      (assignment) => assignment.record_type === "task"
    ).length,
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

  const completedAssignments = teamAssignments.filter(
    (assignment) => assignment.status === "completed"
  );

  const workload = calculateUtilization(totalPoints, capacity);

  const performance =
    teamAssignments.length > 0
      ? Math.round((completedAssignments.length / teamAssignments.length) * 100)
      : 0;

  return {
    assignments: teamAssignments.length,
    assignments_open: teamAssignments.filter(
      (assignment) => assignment.status !== "completed"
    ).length,
    assignments_completed: completedAssignments.length,
    open_tasks: teamAssignments.filter(
      (assignment) =>
        assignment.record_type === "task" && assignment.status !== "completed"
    ).length,
    completed_tasks: completedAssignments.filter(
      (assignment) => assignment.record_type === "task"
    ).length,
    performance,
    workload,
    capacity,
    total_points: totalPoints,
  };
}

function normalizeTeam(row = {}, typeMap = {}, assignments = []) {
  const baseMembers = (row.members || [])
    .filter((member) => !member.removed_at && member.status !== "removed")
    .map(normalizeMember)
    .sort((a, b) => {
      if (a.role_level !== b.role_level) return a.role_level - b.role_level;
      return a.name.localeCompare(b.name);
    });

  const members = baseMembers.map((member) => ({
    ...member,
    ...buildMemberMetrics(member, assignments),
  }));

  const teamType =
    row.type || typeMap[row.type_id] || typeMap[row.type_key] || null;

  const leadershipMembers = members.filter((member) => member.is_leadership);
  const topLeader = leadershipMembers[0] || null;

  const team = {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    type_id: row.type_id,
    type_key: row.type_key || teamType?.type_key || "operations",
    type_label: teamType?.label || row.type_key || "Operations",
    type_color: teamType?.color || row.color || null,
    description: row.description || "",
    status: row.status || "active",
    color: row.color || teamType?.color || null,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
    archived_by: row.archived_by,
    members,
    member_ids: members.map((member) => member.employee_id || member.profile_id),
    member_count: members.length,
    leadership_members: leadershipMembers,
    lead_member: topLeader,
    lead_name: topLeader?.name || "Unassigned",
    metrics: {
      assignments: 0,
      assignments_open: 0,
      assignments_completed: 0,
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
      !filters.type_id ||
      filters.type_id === "all" ||
      team.type_id === filters.type_id;

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
      .from("client_operations_teams")
      .select(`
        id,
        workspace_id,
        name,
        type_id,
        type_key,
        description,
        status,
        color,
        created_by,
        updated_by,
        archived_at,
        archived_by,
        created_at,
        updated_at,
        type:client_operations_team_types (
          id,
          type_key,
          label,
          color
        ),
        members:client_operations_team_members (
          id,
          workspace_id,
          team_id,
          employee_id,
          profile_id,
          role_id,
          reports_to_member_id,
          capacity_points,
          status,
          joined_at,
          removed_at,
          role:client_operations_team_roles (
            id,
            role_key,
            label,
            level,
            is_leadership,
            can_manage_team,
            can_manage_assignments
          ),
          reports_to_member:reports_to_member_id (
            id,
            employee:client_hr_employees!client_operations_team_members_employee_id_fkey (
              id,
              first_name,
              last_name,
              email
            )
          ),
          employee:client_hr_employees!client_operations_team_members_employee_id_fkey (
            id,
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            avatar_url,
            employment_status,
            department:client_hr_departments!client_hr_employees_department_id_fkey (
              id,
              name
            ),
            position:client_hr_positions!client_hr_employees_position_id_fkey (
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
      .from("client_operations_assignments")
      .select(`
        id,
        workspace_id,
        title,
        record_type,
        assignee_type,
        team_id,
        employee_id,
        profile_id,
        status,
        priority,
        archived_at
      `)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null),

    getClientOperationTeamTypes(),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const typeMap = {
    ...buildMap(teamTypes || [], "id"),
    ...buildMap(teamTypes || [], "type_key"),
  };

  const assignments = assignmentsResult.data || [];

  return (teamsResult.data || []).map((team) =>
    normalizeTeam(team, typeMap, assignments)
  );
}

export async function getClientOperationTeams(filters = {}) {
  const teams = await fetchTeamsBase();
  return applyTeamFilters(teams, filters);
}

export async function getClientOperationTeam(id) {
  if (!id) return null;

  const teams = await fetchTeamsBase();
  return teams.find((team) => team.id === id) || null;
}

export async function getClientOperationTeamMembers(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const search = normalizeSearch(filters.search);

  let query = supabase
    .from("client_operations_team_members")
    .select(`
      id,
      workspace_id,
      team_id,
      employee_id,
      profile_id,
      role_id,
      reports_to_member_id,
      capacity_points,
      status,
      joined_at,
      removed_at,
      role:client_operations_team_roles (
        id,
        role_key,
        label,
        level,
        is_leadership,
        can_manage_team,
        can_manage_assignments
      ),
      reports_to_member:reports_to_member_id (
        id,
        employee:client_hr_employees!client_operations_team_members_employee_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      ),
      employee:client_hr_employees!client_operations_team_members_employee_id_fkey (
        id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        employment_status,
        department:client_hr_departments!client_hr_employees_department_id_fkey (
          id,
          name
        ),
        position:client_hr_positions!client_hr_employees_position_id_fkey (
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

  if (filters.role_id) {
    query = query.eq("role_id", filters.role_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  const members = (data || []).map(normalizeMember);

  return members.filter((member) => {
    const matchesSearch =
      !search ||
      member.name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search) ||
      member.department.toLowerCase().includes(search) ||
      member.role_label.toLowerCase().includes(search);

    const matchesType =
      !filters.member_type ||
      filters.member_type === "all" ||
      member.member_type === filters.member_type;

    return matchesSearch && matchesType;
  });
}

export async function getClientOperationTeamMember(id) {
  if (!id) return null;

  const members = await getClientOperationTeamMembers();
  return members.find((member) => member.id === id) || null;
}

export async function createClientOperationTeam(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("client_operations_teams")
    .insert({
      workspace_id: workspaceId,
      name: payload.name?.trim(),
      type_id: payload.type_id || null,
      type_key: payload.type_key || "operations",
      description: payload.description?.trim() || null,
      status: payload.status || "active",
      color: payload.color || null,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, name")
    .single();

  if (error) throw error;

  if (Array.isArray(payload.members) && payload.members.length > 0) {
    await updateClientOperationTeamMembers(data.id, payload.members, {
      workspaceId,
      actorProfileId: userId,
      logChanges: false,
    });
  }

  await logClientOperationActivity({
    workspaceId,
    teamId: data.id,
    actorProfileId: userId,
    activityType: "team_created",
    title: `${data.name} created`,
    description: "Team created from Client Operations module.",
    metadata: {
      source: "client_operations_teams",
      action_label: "created",
      target_label: data.name,
      target_type: "team",
      severity: "success",
      icon: "👥",
    },
  });

  return getClientOperationTeam(data.id);
}

export async function updateClientOperationTeam(id, payload = {}) {
  if (!id) throw new Error("Team ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const updates = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if ("name" in payload) updates.name = payload.name?.trim();
  if ("type_id" in payload) updates.type_id = payload.type_id || null;
  if ("type_key" in payload) updates.type_key = payload.type_key || "operations";
  if ("description" in payload) {
    updates.description = payload.description?.trim() || null;
  }
  if ("status" in payload) updates.status = payload.status || "active";
  if ("color" in payload) updates.color = payload.color || null;

  const { data, error } = await supabase
    .from("client_operations_teams")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, name")
    .single();

  if (error) throw error;

  if (Array.isArray(payload.members)) {
    await updateClientOperationTeamMembers(id, payload.members, {
      workspaceId,
      actorProfileId: userId,
      logChanges: true,
    });
  }

  await logClientOperationActivity({
    workspaceId,
    teamId: id,
    actorProfileId: userId,
    activityType: "team_updated",
    title: `${data.name} updated`,
    description: "Team configuration updated.",
    metadata: {
      source: "client_operations_teams",
      action_label: "updated",
      target_label: data.name,
      target_type: "team",
      severity: "info",
      icon: "✏️",
    },
  });

  return getClientOperationTeam(id);
}

export async function archiveClientOperationTeam(id) {
  if (!id) throw new Error("Team ID is required.");

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const archivedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("client_operations_teams")
    .update({
      status: "archived",
      archived_at: archivedAt,
      archived_by: userId,
      updated_by: userId,
      updated_at: archivedAt,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, name")
    .single();

  if (error) throw error;

  await supabase
    .from("client_operations_team_members")
    .update({
      status: "removed",
      removed_at: archivedAt,
      updated_by: userId,
      updated_at: archivedAt,
    })
    .eq("team_id", id)
    .eq("workspace_id", workspaceId)
    .is("removed_at", null);

  await supabase
    .from("client_operations_assignments")
    .update({
      status: "archived",
      archived_at: archivedAt,
      archived_by: userId,
      updated_by: userId,
      updated_at: archivedAt,
    })
    .eq("team_id", id)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  await logClientOperationActivity({
    workspaceId,
    teamId: id,
    actorProfileId: userId,
    activityType: "team_archived",
    title: `${data.name} archived`,
    description: "Team archived with memberships and team assignments archived.",
    metadata: {
      source: "client_operations_teams",
      action_label: "archived",
      target_label: data.name,
      target_type: "team",
      severity: "warning",
      icon: "🗄️",
    },
  });

  return true;
}

export async function addClientOperationTeamMember(teamId, member = {}, options = {}) {
  if (!teamId) throw new Error("Team ID is required.");
  if (!member.employee_id && !member.profile_id) {
    throw new Error("Employee or profile ID is required.");
  }

  const workspaceId = options.workspaceId || (await getCurrentWorkspaceId());
  const userId = options.actorProfileId || (await getCurrentUserId());

  const matchColumn = member.employee_id ? "employee_id" : "profile_id";
  const matchValue = member.employee_id || member.profile_id;

  const { data: existing, error: existingError } = await supabase
    .from("client_operations_team_members")
    .select("id, removed_at, status")
    .eq("workspace_id", workspaceId)
    .eq("team_id", teamId)
    .eq(matchColumn, matchValue)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { data, error } = await supabase
      .from("client_operations_team_members")
      .update({
        status: "active",
        role_id: member.role_id || null,
        reports_to_member_id: member.reports_to_member_id || null,
        removed_at: null,
        capacity_points:
          member.capacity_points || DEFAULT_MEMBER_CAPACITY_POINTS,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("client_operations_team_members")
    .insert({
      workspace_id: workspaceId,
      team_id: teamId,
      employee_id: member.employee_id || null,
      profile_id: member.profile_id || null,
      role_id: member.role_id || null,
      reports_to_member_id: member.reports_to_member_id || null,
      status: "active",
      capacity_points:
        member.capacity_points || DEFAULT_MEMBER_CAPACITY_POINTS,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

export async function removeClientOperationTeamMember(teamId, memberId, options = {}) {
  if (!teamId) throw new Error("Team ID is required.");
  if (!memberId) throw new Error("Member ID is required.");

  const workspaceId = options.workspaceId || (await getCurrentWorkspaceId());
  const userId = options.actorProfileId || (await getCurrentUserId());
  const removedAt = new Date().toISOString();

  const { error } = await supabase
    .from("client_operations_team_members")
    .update({
      status: "removed",
      removed_at: removedAt,
      updated_by: userId,
      updated_at: removedAt,
    })
    .eq("workspace_id", workspaceId)
    .eq("team_id", teamId)
    .eq("id", memberId)
    .is("removed_at", null);

  if (error) throw error;

  return true;
}

export async function updateClientOperationTeamMembers(
  teamId,
  nextMembers = [],
  {
    workspaceId,
    actorProfileId,
    logChanges = true,
  } = {}
) {
  if (!teamId) throw new Error("Team ID is required.");

  const resolvedWorkspaceId = workspaceId || (await getCurrentWorkspaceId());
  const resolvedActorId = actorProfileId || (await getCurrentUserId());

  const normalizedNextMembers = (nextMembers || [])
    .filter((member) => member?.employee_id || member?.profile_id)
    .map((member) => ({
      employee_id: member.employee_id || null,
      profile_id: member.profile_id || null,
      role_id: member.role_id || null,
      reports_to_member_id: member.reports_to_member_id || null,
      capacity_points:
        member.capacity_points || DEFAULT_MEMBER_CAPACITY_POINTS,
    }));

  const { data: existingRows, error: existingError } = await supabase
    .from("client_operations_team_members")
    .select("id, employee_id, profile_id, status, removed_at")
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("team_id", teamId);

  if (existingError) throw existingError;

  const activeExistingRows = (existingRows || []).filter(
    (row) => !row.removed_at && row.status !== "removed"
  );

  const keyFor = (member = {}) =>
    member.employee_id ? `employee:${member.employee_id}` : `profile:${member.profile_id}`;

  const nextKeySet = new Set(normalizedNextMembers.map(keyFor));
  const existingKeySet = new Set(activeExistingRows.map(keyFor));

  const toAdd = normalizedNextMembers.filter(
    (member) => !existingKeySet.has(keyFor(member))
  );

  const toKeep = normalizedNextMembers.filter((member) =>
    existingKeySet.has(keyFor(member))
  );

  const toRemove = activeExistingRows.filter(
    (row) => !nextKeySet.has(keyFor(row))
  );

  for (const member of toAdd) {
    await addClientOperationTeamMember(teamId, member, {
      workspaceId: resolvedWorkspaceId,
      actorProfileId: resolvedActorId,
    });
  }

  for (const member of toKeep) {
    const existing = activeExistingRows.find(
      (row) => keyFor(row) === keyFor(member)
    );

    if (!existing?.id) continue;

    await supabase
      .from("client_operations_team_members")
      .update({
        role_id: member.role_id,
        reports_to_member_id: member.reports_to_member_id,
        capacity_points: member.capacity_points,
        updated_by: resolvedActorId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("workspace_id", resolvedWorkspaceId);
  }

  for (const member of toRemove) {
    await removeClientOperationTeamMember(teamId, member.id, {
      workspaceId: resolvedWorkspaceId,
      actorProfileId: resolvedActorId,
    });
  }

  if (logChanges && (toAdd.length > 0 || toRemove.length > 0)) {
    await logClientOperationActivity({
      workspaceId: resolvedWorkspaceId,
      teamId,
      actorProfileId: resolvedActorId,
      activityType: "team_members_updated",
      title: "Team members updated",
      description: `${toAdd.length} member(s) added, ${toRemove.length} member(s) removed.`,
      metadata: {
        source: "client_operations_teams",
        action_label: "updated members for",
        target_label: "team",
        target_type: "team",
        severity: "info",
        icon: "👤",
        added: toAdd,
        removed_member_ids: toRemove.map((member) => member.id),
      },
    });
  }

  return {
    added: toAdd,
    removed: toRemove,
  };
}

export async function getClientOperationTeamSetupOptions() {
  const [teamTypes, teamRoles] = await Promise.all([
    getClientOperationTeamTypes(),
    getClientOperationTeamRoles(),
  ]);

  return {
    teamTypes,
    teamRoles,
  };
}

export { logClientOperationActivity };
