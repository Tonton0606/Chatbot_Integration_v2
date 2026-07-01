import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

const DEFAULT_MEMBER_CAPACITY_POINTS = 40;

const ASSIGNMENT_WEIGHTS = {
  low: 2,
  medium: 5,
  high: 8,
  critical: 13,
};

const EMPTY_CATEGORIES = {
  task: 0,
  project: 0,
  deal: 0,
  lead: 0,
  ticket: 0,
  campaign: 0,
  order: 0,
  inventory: 0,
};

function initials(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function employeeName(employee = {}) {
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
  return ASSIGNMENT_WEIGHTS[priority] || ASSIGNMENT_WEIGHTS.medium;
}

function calculateUtilization(totalPoints, capacity) {
  const safeCapacity = normalizeCapacity(capacity);

  if (safeCapacity <= 0) return 0;

  return Math.min(
    100,
    Math.round((Number(totalPoints || 0) / safeCapacity) * 100)
  );
}

function getRiskLevel(utilization = 0) {
  const value = Number(utilization || 0);

  if (value >= 90) return "overloaded";
  if (value >= 75) return "high";
  if (value >= 40) return "busy";

  return "healthy";
}

function getRiskLabel(riskLevel = "healthy") {
  if (riskLevel === "overloaded") return "Overloaded";
  if (riskLevel === "high") return "High Load";
  if (riskLevel === "busy") return "Busy";

  return "Healthy";
}

function applyLevelFilter(rows = [], level) {
  if (!level || level === "all") return rows;

  return rows.filter((row) => {
    if (level === "light") return row.utilization < 40;
    if (level === "moderate") return row.utilization >= 40 && row.utilization < 75;
    if (level === "heavy") return row.utilization >= 75 && row.utilization < 90;
    if (level === "overloaded") return row.utilization >= 90;
    return true;
  });
}

async function fetchWorkloadContext() {
  const workspaceId = await getCurrentWorkspaceId();

  const [teamsResult, membersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("operation_teams")
      .select("id, name, status")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),

    supabase
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
        removed_at,
        employee:hr_employees (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("workspace_id", workspaceId)
      .is("removed_at", null)
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
        status,
        priority,
        archived_at
      `)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (membersResult.error) throw membersResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  return {
    teams: teamsResult.data || [],
    members: membersResult.data || [],
    assignments: assignmentsResult.data || [],
  };
}

function assignmentBelongsToTeam(assignment = {}, team = {}, teamMembers = []) {
  if (assignment.status !== "active") return false;

  if (assignment.assignee_type === "team") {
    return assignment.team_id === team.id;
  }

  if (assignment.assignee_type === "employee") {
    return teamMembers.some(
      (member) => member.employee_id === assignment.employee_id
    );
  }

  if (assignment.assignee_type === "profile") {
    return teamMembers.some(
      (member) => member.profile_id === assignment.profile_id
    );
  }

  return false;
}

function assignmentBelongsToMemberIdentity(assignment = {}, identity = {}) {
  if (assignment.status !== "active") return false;

  if (assignment.assignee_type === "employee") {
    return !!identity.employee_id && assignment.employee_id === identity.employee_id;
  }

  if (assignment.assignee_type === "profile") {
    return !!identity.profile_id && assignment.profile_id === identity.profile_id;
  }

  return false;
}

function buildCategoryCounts(assignments = []) {
  const categories = { ...EMPTY_CATEGORIES };

  assignments.forEach((assignment) => {
    if (categories[assignment.record_type] !== undefined) {
      categories[assignment.record_type] += 1;
    }
  });

  return categories;
}

function buildMemberIdentityKey(member = {}) {
  if (member.employee_id) return `employee:${member.employee_id}`;
  if (member.profile_id) return `profile:${member.profile_id}`;
  return `membership:${member.id}`;
}

function buildTeamWorkloadRows({ teams, members, assignments }) {
  return teams.map((team) => {
    const teamMembers = members.filter((member) => member.team_id === team.id);

    const capacity = teamMembers.reduce(
      (sum, member) => sum + normalizeCapacity(member.capacity_points),
      0
    );

    const teamAssignments = assignments.filter((assignment) =>
      assignmentBelongsToTeam(assignment, team, teamMembers)
    );

    const totalItems = teamAssignments.length;
    const totalPoints = teamAssignments.reduce(
      (sum, assignment) => sum + getAssignmentWeight(assignment),
      0
    );

    const utilization = calculateUtilization(totalPoints, capacity);
    const riskLevel = getRiskLevel(utilization);
    const availableCapacity = Math.max(0, capacity - totalPoints);

    return {
      team_id: team.id,
      team_label: team.name,
      categories: buildCategoryCounts(teamAssignments),
      total_items: totalItems,
      total_points: totalPoints,
      workload_points: totalPoints,
      capacity,
      capacity_points: capacity,
      available_capacity: availableCapacity,
      available_points: availableCapacity,
      utilization,
      risk_level: riskLevel,
      risk_label: getRiskLabel(riskLevel),
      overloaded: utilization >= 90,
      trend: "0%",
    };
  });
}

function buildMemberWorkloadRows({ members, assignments }) {
  const groupedMembers = new Map();

  members.forEach((member) => {
    const key = buildMemberIdentityKey(member);
    const employee = member.employee || {};
    const name = employeeName(employee) || employee.email || "Unnamed Member";

    const current = groupedMembers.get(key) || {
      member_id: member.id,
      employee_id: member.employee_id,
      profile_id: member.profile_id,
      team_ids: [],
      member_label: name,
      initials: initials(name),
      capacity: 0,
    };

    current.team_ids.push(member.team_id);
    current.capacity += normalizeCapacity(member.capacity_points);

    groupedMembers.set(key, current);
  });

  return Array.from(groupedMembers.values()).map((member) => {
    const directAssignments = assignments.filter((assignment) =>
      assignmentBelongsToMemberIdentity(assignment, member)
    );

    const uniqueAssignments = Array.from(
      new Map(directAssignments.map((assignment) => [assignment.id, assignment])).values()
    );

    const totalItems = uniqueAssignments.length;
    const totalPoints = uniqueAssignments.reduce(
      (sum, assignment) => sum + getAssignmentWeight(assignment),
      0
    );

    const utilization = calculateUtilization(totalPoints, member.capacity);
    const riskLevel = getRiskLevel(utilization);
    const availableCapacity = Math.max(0, member.capacity - totalPoints);

    return {
      member_id: member.member_id,
      employee_id: member.employee_id,
      profile_id: member.profile_id,
      team_id: member.team_ids[0] || null,
      team_ids: member.team_ids,
      member_label: member.member_label,
      initials: member.initials,
      categories: buildCategoryCounts(uniqueAssignments),
      total_items: totalItems,
      total_points: totalPoints,
      workload_points: totalPoints,
      capacity: member.capacity,
      capacity_points: member.capacity,
      available_capacity: availableCapacity,
      available_points: availableCapacity,
      utilization,
      risk_level: riskLevel,
      risk_label: getRiskLabel(riskLevel),
      overloaded: utilization >= 90,
      trend: "0%",
    };
  });
}

function rankWorkloadRows(rows = []) {
  return [...rows]
    .sort((a, b) => {
      if (b.utilization !== a.utilization) {
        return b.utilization - a.utilization;
      }

      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }

      return String(a.team_label || "").localeCompare(String(b.team_label || ""));
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

export async function getWorkload(filters = {}) {
  const context = await fetchWorkloadContext();
  let result = buildTeamWorkloadRows(context);

  if (filters.team_id) {
    result = result.filter((row) => row.team_id === filters.team_id);
  }

  result = applyLevelFilter(result, filters.level);
  result = rankWorkloadRows(result);

  return filters.team_id ? result[0] || null : result;
}

export async function getMemberWorkload(filters = {}) {
  const context = await fetchWorkloadContext();
  let result = buildMemberWorkloadRows(context);

  if (filters.member_id) {
    result = result.filter((row) => row.member_id === filters.member_id);
  }

  if (filters.employee_id) {
    result = result.filter((row) => row.employee_id === filters.employee_id);
  }

  if (filters.team_id) {
    result = result.filter((row) => row.team_ids?.includes(filters.team_id));
  }

  if (filters.overloaded !== undefined) {
    result = result.filter((row) => row.overloaded === filters.overloaded);
  }

  result = result
    .sort((a, b) => {
      if (b.utilization !== a.utilization) {
        return b.utilization - a.utilization;
      }

      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }

      return String(a.member_label || "").localeCompare(
        String(b.member_label || "")
      );
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return filters.member_id || filters.employee_id ? result[0] || null : result;
}

export async function getBottlenecks(filters = {}) {
  const rows = await getWorkload();

  let result = rows
    .filter((row) => row.utilization >= 40)
    .map((row) => {
      let severity = "moderate";

      if (row.utilization >= 90) {
        severity = "critical";
      } else if (row.utilization >= 75) {
        severity = "high";
      }

      return {
        id: `bottleneck_${row.team_id}`,
        team_id: row.team_id,
        team_label: row.team_label,
        utilization: row.utilization,
        workload_points: row.total_points,
        capacity_points: row.capacity,
        available_capacity: row.available_capacity,
        risk_level: row.risk_level,
        severity,
        since: "Current",
        issue:
          row.utilization >= 90
            ? "Team workload is above safe operating capacity."
            : row.utilization >= 75
              ? "Team workload is entering high-load territory."
              : "Team workload is becoming busy and should be monitored.",
        recommendation:
          row.utilization >= 90
            ? "Redistribute active assignments or increase team capacity."
            : row.utilization >= 75
              ? "Avoid adding new high-priority work until load decreases."
              : "Monitor assignment intake and keep capacity visible.",
        status: "open",
      };
    });

  if (filters.team_id) {
    result = result.filter((row) => row.team_id === filters.team_id);
  }

  if (filters.severity && filters.severity !== "all") {
    result = result.filter((row) => row.severity === filters.severity);
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((row) => row.status === filters.status);
  }

  return result;
}

export async function getWorkloadTrend(filters = {}) {
  const rows = await getWorkload(filters);
  const sourceRows = Array.isArray(rows) ? rows : rows ? [rows] : [];

  return sourceRows.map((row) => ({
    period: "Current",
    team_id: row.team_id,
    team_label: row.team_label,
    utilization: row.utilization,
    workload_points: row.total_points,
    capacity_points: row.capacity,
    risk_level: row.risk_level,
  }));
}

export async function getWorkloadSummary() {
  const rows = await getWorkload();

  const totalTeams = rows.length;
  const totalItems = rows.reduce((sum, row) => sum + row.total_items, 0);
  const totalPoints = rows.reduce((sum, row) => sum + row.total_points, 0);
  const totalCapacity = rows.reduce((sum, row) => sum + row.capacity, 0);
  const totalAvailableCapacity = rows.reduce(
    (sum, row) => sum + row.available_capacity,
    0
  );

  const avgWorkload = totalTeams
    ? Math.round(rows.reduce((sum, row) => sum + row.utilization, 0) / totalTeams)
    : 0;

  const sortedRows = rankWorkloadRows(rows);
  const highestLoadTeam = sortedRows[0] || null;
  const lowestLoadTeam =
    [...rows].sort((a, b) => {
      if (a.utilization !== b.utilization) {
        return a.utilization - b.utilization;
      }

      return String(a.team_label || "").localeCompare(String(b.team_label || ""));
    })[0] || null;

  const bottlenecks = await getBottlenecks({ status: "open" });

  return {
    total_teams: totalTeams,
    total_items: totalItems,
    total_points: totalPoints,
    workload_points: totalPoints,
    total_capacity: totalCapacity,
    total_available_capacity: totalAvailableCapacity,
    avg_workload: avgWorkload,
    avg_utilization: avgWorkload,
    overloaded_teams: rows.filter((row) => row.utilization >= 90).length,
    high_load_teams: rows.filter(
      (row) => row.utilization >= 75 && row.utilization < 90
    ).length,
    busy_teams: rows.filter(
      (row) => row.utilization >= 40 && row.utilization < 75
    ).length,
    heavy_teams: rows.filter(
      (row) => row.utilization >= 75 && row.utilization < 90
    ).length,
    healthy_teams: rows.filter((row) => row.utilization < 40).length,
    open_bottlenecks: bottlenecks.length,
    highest_load_team: highestLoadTeam
      ? {
          team_id: highestLoadTeam.team_id,
          team_label: highestLoadTeam.team_label,
          utilization: highestLoadTeam.utilization,
          workload_points: highestLoadTeam.total_points,
          capacity_points: highestLoadTeam.capacity,
          risk_level: highestLoadTeam.risk_level,
          risk_label: highestLoadTeam.risk_label,
        }
      : null,
    lowest_load_team: lowestLoadTeam
      ? {
          team_id: lowestLoadTeam.team_id,
          team_label: lowestLoadTeam.team_label,
          utilization: lowestLoadTeam.utilization,
          workload_points: lowestLoadTeam.total_points,
          capacity_points: lowestLoadTeam.capacity,
          risk_level: lowestLoadTeam.risk_level,
          risk_label: lowestLoadTeam.risk_label,
        }
      : null,
  };
}
