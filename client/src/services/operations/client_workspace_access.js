import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceContext } from "../workspaceResolver";
import { getERPRegistryData } from "./erp_registry";
import {
  cancelWorkspaceInvitation,
  createWorkspaceInvitation,
  expireWorkspaceInvitations,
  listWorkspaceInvitations,
} from "./workspace_invitations";

const OWNER_ROLES = new Set(["owner", "admin"]);

function normalizeRole(role = "") {
  return String(role || "").trim().toLowerCase();
}

function canManageWorkspaceAccess(role = "") {
  return OWNER_ROLES.has(normalizeRole(role));
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error("User not authenticated.");

  return user;
}

export async function getClientWorkspaceAccessData() {
  const context = await getCurrentWorkspaceContext();
  const workspaceId = context.workspace_id;
  const currentUserId = context.profile.id;

  const workspaceRole = await getCurrentWorkspaceRole({
    workspaceId,
    userId: currentUserId,
  });

  if (!canManageWorkspaceAccess(workspaceRole)) {
    throw new Error(
      "Only workspace owners and workspace admins can manage member access."
    );
  }

  await expireWorkspaceInvitations();

  const [
    members,
    invitations,
    registryData,
    workspaceAccessRows,
    memberAccessRows,
  ] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    listWorkspaceInvitations(workspaceId),
    getERPRegistryData(),
    getWorkspaceFeatureAccess(workspaceId),
    getWorkspaceMemberFeatureAccess(workspaceId),
  ]);

  return {
    context,
    workspace: context.workspace,
    workspaceId,
    workspaceRole,
    currentUserId,
    members,
    invitations,
    modules: buildClientManageableModules({
      registryData,
      workspaceAccessRows,
    }),
    workspaceAccessRows,
    memberAccessRows,
  };
}

export async function getCurrentWorkspaceRole({ workspaceId, userId }) {
  if (!workspaceId || !userId) return "member";

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data || data.status === "archived") {
    return "member";
  }

  return data.role || "member";
}

export async function getWorkspaceMembers(workspaceId) {
  if (!workspaceId) throw new Error("Workspace ID is required.");

  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      id,
      user_id,
      workspace_id,
      role,
      status,
      invited_by,
      joined_at,
      created_at,
      archived_at,
      user:user_id (
        id,
        email,
        full_name,
        role,
        status
      )
    `)
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getWorkspaceFeatureAccess(workspaceId) {
  if (!workspaceId) throw new Error("Workspace ID is required.");

  const { data, error } = await supabase
    .from("workspace_feature_access")
    .select(`
      id,
      workspace_id,
      feature_key,
      is_enabled,
      enabled_at,
      enabled_by,
      access_source
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_enabled", true);

  if (error) throw error;

  return data || [];
}

export async function getWorkspaceMemberFeatureAccess(workspaceId) {
  if (!workspaceId) throw new Error("Workspace ID is required.");

  const { data, error } = await supabase
    .from("workspace_member_feature_access")
    .select(`
      id,
      workspace_id,
      user_id,
      feature_key,
      is_enabled,
      enabled_by,
      enabled_at,
      access_source,
      created_at,
      updated_at
    `)
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  return data || [];
}

export async function inviteClientWorkspaceMember({ email, role = "member" }) {
  const context = await getCurrentWorkspaceContext();

  return createWorkspaceInvitation({
    workspaceId: context.workspace_id,
    email,
    role,
  });
}

export async function cancelClientWorkspaceInvitation(invitationId) {
  return cancelWorkspaceInvitation(invitationId);
}

export async function archiveClientWorkspaceMember({ workspaceId, memberId }) {
  if (!workspaceId) throw new Error("Workspace ID is required.");
  if (!memberId) throw new Error("Workspace member ID is required.");

  const { data, error } = await supabase.rpc("archive_workspace_member", {
    p_workspace_id: workspaceId,
    p_member_id: memberId,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}

export async function updateWorkspaceMemberFeatureAccess({
  workspaceId,
  userId,
  featureKey,
  isEnabled,
}) {
  if (!workspaceId) throw new Error("Workspace ID is required.");
  if (!userId) throw new Error("Member is required.");
  if (!featureKey) throw new Error("Feature key is required.");

  const user = await getCurrentUser();

  const payload = {
    workspace_id: workspaceId,
    user_id: userId,
    feature_key: featureKey,
    is_enabled: isEnabled,
    enabled_by: user.id,
    enabled_at: isEnabled ? new Date().toISOString() : null,
    access_source: "manual",
  };

  const { data, error } = await supabase
    .from("workspace_member_feature_access")
    .upsert(payload, {
      onConflict: "workspace_id,user_id,feature_key",
    })
    .select(`
      id,
      workspace_id,
      user_id,
      feature_key,
      is_enabled,
      enabled_by,
      enabled_at,
      access_source,
      created_at,
      updated_at
    `)
    .single();

  if (error) throw error;

  return data;
}

export function getMemberEnabledFeatureKeys({
  memberAccessRows = [],
  userId,
}) {
  return new Set(
    memberAccessRows
      .filter((row) => row.user_id === userId && row.is_enabled)
      .map((row) => row.feature_key)
  );
}

export function buildMemberAccessRows({
  members = [],
  modules = [],
  memberAccessRows = [],
}) {
  return members.map((member) => {
    const enabledKeys = getMemberEnabledFeatureKeys({
      memberAccessRows,
      userId: member.user_id,
    });

    return {
      ...member,
      enabledFeatureKeys: enabledKeys,
      enabledModuleCount: modules.filter((module) =>
        enabledKeys.has(module.key)
      ).length,
    };
  });
}

function buildDivisionOrderMap(divisions = []) {
  const map = new Map();

  divisions.forEach((division, index) => {
    map.set(division.division_key, {
      order: Number(division.order_index ?? index),
      title: division.title || division.division_key || "Workspace",
    });
  });

  return map;
}

function buildClientManageableModules({
  registryData,
  workspaceAccessRows = [],
}) {
  const workspaceEnabledKeys = new Set(
    workspaceAccessRows
      .filter((row) => row.is_enabled)
      .map((row) => row.feature_key)
  );

  const features = registryData.features || [];
  const divisionOrderMap = buildDivisionOrderMap(registryData.divisions || []);

  return features
    .filter((feature) => {
      if (!feature.client_visible) return false;
      if (!feature.client_route) return false;
      if (feature.status !== "active") return false;
      if (!workspaceEnabledKeys.has(feature.feature_key)) return false;

      return true;
    })
    .map((feature) => {
      const divisionKey = feature.division?.division_key || "";
      const divisionMeta = divisionOrderMap.get(divisionKey);

      return {
        id: feature.id,
        key: feature.feature_key,
        label: feature.label,
        description: feature.description || "Workspace module",
        status: feature.status,
        clientRoute: feature.client_route,
        divisionKey,
        divisionTitle:
          feature.division?.title ||
          divisionMeta?.title ||
          "Workspace",
        divisionOrder: Number(divisionMeta?.order ?? 9999),
        autoEnableWithDivision: feature.auto_enable_with_division,
        order: Number(feature.order_index || 0),
      };
    })
    .sort((a, b) => {
      if (a.divisionOrder !== b.divisionOrder) {
        return a.divisionOrder - b.divisionOrder;
      }

      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.label.localeCompare(b.label);
    });
}
