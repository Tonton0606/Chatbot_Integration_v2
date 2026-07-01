import { supabase } from "../config/supabaseClient";

const HERMES_INTERNAL_WORKSPACE_ID = "ba6ab3dd-d1bb-4494-9cf2-78b6a981f7f6";
const ACTIVE_CLIENT_WORKSPACE_KEY = "exponify_active_client_workspace_id";

function normalizeRole(role = "") {
  return String(role || "").trim().toLowerCase();
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function setActiveClientWorkspaceId(workspaceId) {
  if (!canUseBrowserStorage() || !workspaceId) return;

  window.localStorage.setItem(ACTIVE_CLIENT_WORKSPACE_KEY, workspaceId);
}

export function getStoredActiveClientWorkspaceId() {
  if (!canUseBrowserStorage()) return "";

  return window.localStorage.getItem(ACTIVE_CLIENT_WORKSPACE_KEY) || "";
}

export function clearActiveClientWorkspaceId() {
  if (!canUseBrowserStorage()) return;

  window.localStorage.removeItem(ACTIVE_CLIENT_WORKSPACE_KEY);
}

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  const userId = data?.user?.id || null;

  if (!userId) {
    throw new Error("No authenticated user found.");
  }

  return userId;
}

export async function getCurrentProfile() {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error("No profile found for current user.");
  }

  return data;
}

async function getValidatedActiveWorkspaceMembership({ userId, workspaceId }) {
  if (!userId || !workspaceId) return null;

  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      workspace_id,
      role,
      status,
      archived_at,
      workspace:workspaces (
        id,
        name,
        workspace_type,
        status,
        owner_user_id
      )
    `)
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  if (!data?.workspace_id) return null;
  if (data.status === "archived") return null;
  if (data.archived_at) return null;
  if (data.workspace?.status !== "active") return null;

  return data;
}

export async function getCurrentWorkspaceId() {
  const profile = await getCurrentProfile();
  const role = normalizeRole(profile.role);

  if (role === "admin") {
    return HERMES_INTERNAL_WORKSPACE_ID;
  }

  const storedWorkspaceId = getStoredActiveClientWorkspaceId();

  if (storedWorkspaceId) {
    const activeMembership = await getValidatedActiveWorkspaceMembership({
      userId: profile.id,
      workspaceId: storedWorkspaceId,
    });

    if (activeMembership?.workspace_id) {
      return activeMembership.workspace_id;
    }

    clearActiveClientWorkspaceId();
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      workspace_id,
      role,
      status,
      archived_at,
      workspace:workspaces (
        id,
        name,
        workspace_type,
        status,
        owner_user_id
      )
    `)
    .eq("user_id", profile.id);

  if (error) throw error;

  const activeMemberships = (data || []).filter(
    (member) =>
      member.status !== "archived" &&
      !member.archived_at &&
      member.workspace?.status === "active"
  );

  const nonOwnedSharedWorkspace = activeMemberships.find(
    (member) =>
      member.workspace?.owner_user_id !== profile.id &&
      (member.workspace?.workspace_type === "individual" ||
        member.workspace?.workspace_type === "company" ||
        member.workspace?.workspace_type === "shared")
  );

  if (nonOwnedSharedWorkspace?.workspace_id) {
    setActiveClientWorkspaceId(nonOwnedSharedWorkspace.workspace_id);
    return nonOwnedSharedWorkspace.workspace_id;
  }

  const ownedWorkspace = activeMemberships.find(
    (member) =>
      member.workspace?.owner_user_id === profile.id &&
      (member.workspace?.workspace_type === "individual" ||
        member.workspace?.workspace_type === "company" ||
        member.workspace?.workspace_type === "shared")
  );

  if (ownedWorkspace?.workspace_id) {
    setActiveClientWorkspaceId(ownedWorkspace.workspace_id);
    return ownedWorkspace.workspace_id;
  }

  const fallback = activeMemberships[0];

  if (fallback?.workspace_id) {
    setActiveClientWorkspaceId(fallback.workspace_id);
    return fallback.workspace_id;
  }

  throw new Error("No active workspace membership found for current user.");
}

export async function getCurrentWorkspaceContext() {
  const profile = await getCurrentProfile();
  const workspaceId =
    normalizeRole(profile.role) === "admin"
      ? HERMES_INTERNAL_WORKSPACE_ID
      : await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, workspace_type, status, owner_user_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error("Resolved workspace was not found.");
  }

  return {
    profile,
    workspace: data,
    workspace_id: data.id,
    is_admin: normalizeRole(profile.role) === "admin",
  };
}

export { HERMES_INTERNAL_WORKSPACE_ID };
