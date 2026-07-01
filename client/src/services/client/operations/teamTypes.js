import { supabase } from "../../../config/supabaseClient";

import { getCurrentWorkspaceId } from "../../workspaceResolver";

function normalizeTypeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeTypeLabel(value = "") {
  return String(value || "custom")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function teamTypeSelect() {
  return `
    id,
    workspace_id,
    type_key,
    label,
    color,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;
}

function normalizeTeamType(row = {}) {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    value: row.type_key,
    type_key: row.type_key,
    label: row.label || normalizeTypeLabel(row.type_key),
    color: row.color || null,
    is_active: row.is_active ?? true,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getClientOperationTeamTypes(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  let query = supabase
    .from("client_operations_team_types")
    .select(teamTypeSelect())
    .eq("workspace_id", workspaceId)
    .order("label", { ascending: true });

  if (filters.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(normalizeTeamType);
}

export async function getClientOperationTeamType(id) {
  if (!id) return null;

  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from("client_operations_team_types")
    .select(teamTypeSelect())
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeTeamType(data) : null;
}

export async function createClientOperationTeamType(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  const label = String(payload.label || "").trim();
  const typeKey = normalizeTypeKey(payload.type_key || label);

  if (!label) {
    throw new Error("Team type label is required.");
  }

  if (!typeKey) {
    throw new Error("Team type key is required.");
  }

  const { data, error } = await supabase
    .from("client_operations_team_types")
    .insert({
      workspace_id: workspaceId,
      type_key: typeKey,
      label,
      color: payload.color || "#c9a84c",
      is_active: true,
    })
    .select(teamTypeSelect())
    .single();

  if (error) throw error;

  return normalizeTeamType(data);
}

export async function updateClientOperationTeamType(id, payload = {}) {
  if (!id) {
    throw new Error("Team type ID is required.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if ("label" in payload) {
    const label = String(payload.label || "").trim();

    if (!label) {
      throw new Error("Team type label is required.");
    }

    updates.label = label;
  }

  if ("type_key" in payload) {
    const typeKey = normalizeTypeKey(payload.type_key);

    if (!typeKey) {
      throw new Error("Team type key is required.");
    }

    updates.type_key = typeKey;
  }

  if ("color" in payload) {
    updates.color = payload.color || "#c9a84c";
  }

  if ("is_active" in payload) {
    updates.is_active = !!payload.is_active;
  }

  const { data, error } = await supabase
    .from("client_operations_team_types")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(teamTypeSelect())
    .single();

  if (error) throw error;

  return normalizeTeamType(data);
}

export async function archiveClientOperationTeamType(id) {
  if (!id) {
    throw new Error("Team type ID is required.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  const { count, error: teamCountError } = await supabase
    .from("client_operations_teams")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("type_id", id)
    .is("archived_at", null);

  if (teamCountError) throw teamCountError;

  if ((count || 0) > 0) {
    throw new Error("This team type is still assigned to active teams.");
  }

  const { error } = await supabase
    .from("client_operations_team_types")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  return true;
}

export {
  normalizeTeamType,
  normalizeTypeKey,
  normalizeTypeLabel,
};
