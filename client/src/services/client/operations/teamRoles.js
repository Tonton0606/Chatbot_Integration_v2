import { supabase } from "../../../config/supabaseClient";

import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "../../workspaceResolver";

function normalizeRoleKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeRoleLabel(value = "") {
  return String(value || "member")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function teamRoleSelect() {
  return `
    id,
    workspace_id,
    role_key,
    label,
    description,
    level,
    sort_order,
    reports_to_role_id,
    is_leadership,
    can_manage_team,
    can_manage_assignments,
    permissions,
    is_active,
    archived_at,
    archived_by,
    created_by,
    updated_by,
    created_at,
    updated_at,
    parent_role:reports_to_role_id (
      id,
      role_key,
      label,
      level
    )
  `;
}

function normalizeTeamRole(row = {}) {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    value: row.id,
    role_key: row.role_key,
    label: row.label || normalizeRoleLabel(row.role_key),
    description: row.description || "",
    level: Number(row.level ?? 100),
    sort_order: Number(row.sort_order ?? 100),
    reports_to_role_id: row.reports_to_role_id || null,
    reports_to_role: row.parent_role || null,
    is_leadership: !!row.is_leadership,
    can_manage_team: !!row.can_manage_team,
    can_manage_assignments: !!row.can_manage_assignments,
    permissions: row.permissions || {},
    is_active: row.is_active ?? true,
    archived_at: row.archived_at,
    archived_by: row.archived_by,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildRoleMutationPayload(payload = {}) {
  const label = String(payload.label || "").trim();
  const roleKey = normalizeRoleKey(payload.role_key || label);

  if (!label) {
    throw new Error("Role label is required.");
  }

  if (!roleKey) {
    throw new Error("Role key is required.");
  }

  return {
    role_key: roleKey,
    label,
    description: payload.description?.trim() || null,
    level: Number(payload.level ?? 100),
    sort_order: Number(payload.sort_order ?? payload.level ?? 100),
    reports_to_role_id: payload.reports_to_role_id || null,
    is_leadership: !!payload.is_leadership,
    can_manage_team: !!payload.can_manage_team,
    can_manage_assignments: !!payload.can_manage_assignments,
    permissions: payload.permissions || {},
    is_active: payload.is_active ?? true,
  };
}

export async function getClientOperationTeamRoles(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  let query = supabase
    .from("client_operations_team_roles")
    .select(teamRoleSelect())
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("level", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (filters.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  if (filters.leadershipOnly) {
    query = query.eq("is_leadership", true);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(normalizeTeamRole);
}

export async function getClientOperationTeamRole(id) {
  if (!id) return null;

  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from("client_operations_team_roles")
    .select(teamRoleSelect())
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeTeamRole(data) : null;
}

export async function createClientOperationTeamRole(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const mutationPayload = buildRoleMutationPayload(payload);

  if (mutationPayload.reports_to_role_id) {
    const parent = await getClientOperationTeamRole(
      mutationPayload.reports_to_role_id
    );

    if (!parent?.id) {
      throw new Error("Parent role was not found in this workspace.");
    }
  }

  const { data, error } = await supabase
    .from("client_operations_team_roles")
    .insert({
      workspace_id: workspaceId,
      ...mutationPayload,
      created_by: userId,
      updated_by: userId,
    })
    .select(teamRoleSelect())
    .single();

  if (error) throw error;

  return normalizeTeamRole(data);
}

export async function updateClientOperationTeamRole(id, payload = {}) {
  if (!id) {
    throw new Error("Role ID is required.");
  }

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const currentRole = await getClientOperationTeamRole(id);

  if (!currentRole?.id) {
    throw new Error("Role not found.");
  }

  const updates = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if ("label" in payload) {
    const label = String(payload.label || "").trim();

    if (!label) {
      throw new Error("Role label is required.");
    }

    updates.label = label;
  }

  if ("role_key" in payload) {
    const roleKey = normalizeRoleKey(payload.role_key);

    if (!roleKey) {
      throw new Error("Role key is required.");
    }

    updates.role_key = roleKey;
  }

  if ("description" in payload) {
    updates.description = payload.description?.trim() || null;
  }

  if ("level" in payload) {
    updates.level = Number(payload.level ?? currentRole.level ?? 100);
  }

  if ("sort_order" in payload) {
    updates.sort_order = Number(payload.sort_order ?? currentRole.sort_order ?? 100);
  }

  if ("reports_to_role_id" in payload) {
    const parentId = payload.reports_to_role_id || null;

    if (parentId === id) {
      throw new Error("A role cannot report to itself.");
    }

    if (parentId) {
      const parent = await getClientOperationTeamRole(parentId);

      if (!parent?.id) {
        throw new Error("Parent role was not found in this workspace.");
      }
    }

    updates.reports_to_role_id = parentId;
  }

  if ("is_leadership" in payload) {
    updates.is_leadership = !!payload.is_leadership;
  }

  if ("can_manage_team" in payload) {
    updates.can_manage_team = !!payload.can_manage_team;
  }

  if ("can_manage_assignments" in payload) {
    updates.can_manage_assignments = !!payload.can_manage_assignments;
  }

  if ("permissions" in payload) {
    updates.permissions = payload.permissions || {};
  }

  if ("is_active" in payload) {
    updates.is_active = !!payload.is_active;
  }

  const { data, error } = await supabase
    .from("client_operations_team_roles")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(teamRoleSelect())
    .single();

  if (error) throw error;

  return normalizeTeamRole(data);
}

export async function archiveClientOperationTeamRole(id) {
  if (!id) {
    throw new Error("Role ID is required.");
  }

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const { count: memberCount, error: memberCountError } = await supabase
    .from("client_operations_team_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role_id", id)
    .is("removed_at", null);

  if (memberCountError) throw memberCountError;

  if ((memberCount || 0) > 0) {
    throw new Error("This role is still assigned to active team members.");
  }

  const { count: childRoleCount, error: childRoleCountError } = await supabase
    .from("client_operations_team_roles")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("reports_to_role_id", id)
    .is("archived_at", null);

  if (childRoleCountError) throw childRoleCountError;

  if ((childRoleCount || 0) > 0) {
    throw new Error("This role is still used as a parent role.");
  }

  const { error } = await supabase
    .from("client_operations_team_roles")
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archived_by: userId,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  return true;
}

export {
  normalizeRoleKey,
  normalizeRoleLabel,
  normalizeTeamRole,
};
