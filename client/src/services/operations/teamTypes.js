import { supabase } from "../../config/supabaseClient";

import { getCurrentWorkspaceId } from "../workspaceResolver";

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

function normalizeTeamType(row = {}) {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    value: row.type_key,
    type_key: row.type_key,
    label: row.label || normalizeTypeLabel(row.type_key),
    color: row.color || null,
    is_system: row.is_system ?? false,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function teamTypeSelect() {
  return `
    id,
    workspace_id,
    type_key,
    label,
    color,
    is_system,
    is_active,
    created_at,
    updated_at
  `;
}

export async function getTeamTypes(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  let query = supabase
    .from("operation_team_types")
    .select(teamTypeSelect())
    .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    .order("is_system", { ascending: false })
    .order("label", { ascending: true });

  if (filters.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(normalizeTeamType);
}

export async function getTeamType(id) {
  if (!id) return null;

  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from("operation_team_types")
    .select(teamTypeSelect())
    .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return normalizeTeamType(data);
}

export async function createTeamType(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  const label = String(payload.label || "").trim();
  const typeKey = normalizeTypeKey(payload.type_key || label);

  if (!label) {
    throw new Error("Team type label is required.");
  }

  if (!typeKey) {
    throw new Error("Team type key is required.");
  }

  const { data: existingType, error: existingError } = await supabase
    .from("operation_team_types")
    .select("id")
    .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    .eq("type_key", typeKey)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingType?.id) {
    throw new Error("A team type with this key already exists.");
  }

  const { data, error } = await supabase
    .from("operation_team_types")
    .insert({
      workspace_id: workspaceId,
      type_key: typeKey,
      label,
      color: payload.color || "#4a90d9",
      is_system: false,
      is_active: true,
    })
    .select(teamTypeSelect())
    .single();

  if (error) throw error;

  return normalizeTeamType(data);
}

export async function updateTeamType(id, payload = {}) {
  if (!id) {
    throw new Error("Team type ID is required.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  const { data: existing, error: existingError } = await supabase
    .from("operation_team_types")
    .select("id, workspace_id, is_system")
    .eq("id", id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing?.id) {
    throw new Error("Team type not found.");
  }

  if (existing.is_system || existing.workspace_id === null) {
    throw new Error("System team types cannot be edited.");
  }

  if (existing.workspace_id !== workspaceId) {
    throw new Error("You cannot edit this team type.");
  }

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

    const { data: duplicateType, error: duplicateError } = await supabase
      .from("operation_team_types")
      .select("id")
      .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
      .eq("type_key", typeKey)
      .neq("id", id)
      .maybeSingle();

    if (duplicateError) throw duplicateError;

    if (duplicateType?.id) {
      throw new Error("Another team type already uses this key.");
    }

    updates.type_key = typeKey;
  }

  if ("color" in payload) {
    updates.color = payload.color || "#4a90d9";
  }

  if ("is_active" in payload) {
    updates.is_active = !!payload.is_active;
  }

  const { data, error } = await supabase
    .from("operation_team_types")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(teamTypeSelect())
    .single();

  if (error) throw error;

  return normalizeTeamType(data);
}

export async function archiveTeamType(id) {
  if (!id) {
    throw new Error("Team type ID is required.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  const { data: existing, error: existingError } = await supabase
    .from("operation_team_types")
    .select("id, workspace_id, type_key, is_system")
    .eq("id", id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing?.id) {
    throw new Error("Team type not found.");
  }

  if (existing.is_system || existing.workspace_id === null) {
    throw new Error("System team types cannot be archived.");
  }

  if (existing.workspace_id !== workspaceId) {
    throw new Error("You cannot archive this team type.");
  }

  const { count, error: teamCountError } = await supabase
    .from("operation_teams")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("type", existing.type_key)
    .is("archived_at", null);

  if (teamCountError) throw teamCountError;

  if ((count || 0) > 0) {
    throw new Error("This team type is still assigned to active teams.");
  }

  const { error } = await supabase
    .from("operation_team_types")
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
