import { supabase } from "../../config/supabaseClient";

import {
  buildNavigationRegistry,
  getERPRegistryData,
} from "./erp_registry.js";

function normalizeRole(role = "") {
  return String(role || "").trim().toLowerCase();
}

function isPrivilegedWorkspaceRole(role = "") {
  const normalized = normalizeRole(role);
  return normalized === "owner" || normalized === "admin";
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("User not authenticated.");

  return user;
}

export async function getCurrentProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, avatar_url")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data;
}

export async function getCurrentWorkspace(userId) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      id,
      user_id,
      workspace_id,
      role,
      status,
      joined_at,
      workspaces:workspace_id (
        id,
        name,
        workspace_type,
        owner_user_id,
        status
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;

  const memberships = data || [];

  const activeClientMembership =
    memberships.find(
      (membership) =>
        membership.status !== "archived" &&
        membership.workspaces?.status === "active" &&
        membership.workspaces?.workspace_type !== "internal"
    ) ||
    memberships.find(
      (membership) =>
        membership.workspaces?.status === "active" &&
        membership.workspaces?.workspace_type !== "internal"
    ) ||
    memberships[0];

  if (!activeClientMembership?.workspace_id) {
    throw new Error("No client workspace found for this user.");
  }

  return {
    membership: activeClientMembership,
    workspace: activeClientMembership.workspaces,
    workspaceId: activeClientMembership.workspace_id,
    workspaceRole: activeClientMembership.role,
  };
}

export async function getWorkspaceFeatureAccess(workspaceId) {
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

export async function getWorkspaceMemberFeatureAccess({ workspaceId, userId }) {
  if (!workspaceId || !userId) return [];

  const { data, error } = await supabase
    .from("workspace_member_feature_access")
    .select(`
      id,
      workspace_id,
      user_id,
      feature_key,
      is_enabled,
      enabled_at,
      enabled_by,
      access_source
    `)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("is_enabled", true);

  if (error) throw error;

  return data || [];
}

export function resolveEffectiveFeatureKeys({
  workspaceAccessRows = [],
  memberAccessRows = [],
  workspaceRole = "member",
}) {
  const workspaceEnabledKeys = new Set(
    workspaceAccessRows
      .filter((row) => row.is_enabled)
      .map((row) => row.feature_key)
  );

  if (isPrivilegedWorkspaceRole(workspaceRole)) {
    return {
      workspaceEnabledKeys,
      memberEnabledKeys: new Set(),
      effectiveEnabledKeys: workspaceEnabledKeys,
      requiresMemberAccess: false,
    };
  }

  const memberEnabledKeys = new Set(
    memberAccessRows
      .filter((row) => row.is_enabled)
      .map((row) => row.feature_key)
  );

  const effectiveEnabledKeys = new Set(
    [...workspaceEnabledKeys].filter((featureKey) =>
      memberEnabledKeys.has(featureKey)
    )
  );

  return {
    workspaceEnabledKeys,
    memberEnabledKeys,
    effectiveEnabledKeys,
    requiresMemberAccess: true,
  };
}

export async function getEnabledClientModules() {
  const user = await getCurrentUser();

  const [profile, workspaceContext, registryData] = await Promise.all([
    getCurrentProfile(user.id),
    getCurrentWorkspace(user.id),
    getERPRegistryData(),
  ]);

  const [workspaceAccessRows, memberAccessRows] = await Promise.all([
    getWorkspaceFeatureAccess(workspaceContext.workspaceId),
    getWorkspaceMemberFeatureAccess({
      workspaceId: workspaceContext.workspaceId,
      userId: user.id,
    }),
  ]);

  const {
    workspaceEnabledKeys,
    memberEnabledKeys,
    effectiveEnabledKeys,
    requiresMemberAccess,
  } = resolveEffectiveFeatureKeys({
    workspaceAccessRows,
    memberAccessRows,
    workspaceRole: workspaceContext.workspaceRole,
  });

  const enabledFeatureKeys = Array.from(effectiveEnabledKeys);

  const navSections = buildNavigationRegistry({
    divisions: registryData.divisions || [],
    features: registryData.features || [],
    enabledFeatureKeys,
    mode: "client",
  });

  const modules = navSections.flatMap((section) =>
    section.items.map((item) => ({
      key: item.key,
      label: item.label,
      route: item.clientRoute,
      clientRoute: item.clientRoute,
      divisionKey: section.key,
      divisionTitle: section.title,
      divisionIcon: section.icon,
      status: item.status,
      icon: item.icon || section.icon,
      description: item.description || "Workspace module",
      isCore: item.autoEnableWithDivision || false,
      is_enabled: true,
    }))
  );

  return {
    user,
    profile,
    workspace: workspaceContext.workspace,
    workspaceId: workspaceContext.workspaceId,
    workspaceRole: workspaceContext.workspaceRole,
    accessRows: workspaceAccessRows,
    workspaceAccessRows,
    memberAccessRows,
    modules,
    coreModules: modules.filter((module) => module.isCore),
    workspaceModules: modules,
    enabledKeys: effectiveEnabledKeys,
    enabledFeatureKeys,
    workspaceEnabledKeys,
    memberEnabledKeys,
    requiresMemberAccess,
    navSections,
  };
}

export async function canAccessClientModule(featureKey) {
  if (!featureKey) return false;

  const context = await getEnabledClientModules();

  return context.enabledKeys.has(featureKey);
}
