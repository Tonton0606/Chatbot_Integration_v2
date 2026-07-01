import { supabase } from "../../config/supabaseClient";
import { setActiveClientWorkspaceId } from "../workspaceResolver";

const DEFAULT_INVITE_MINUTES = 30;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getBaseUrl() {
  return window.location.origin;
}

export function generateInviteToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildWorkspaceInviteUrl(token) {
  return `${getBaseUrl()}/signup?invite=${encodeURIComponent(token)}`;
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

export async function getWorkspaceInvitationPreview(token) {
  if (!token) throw new Error("Invitation token is required.");

  const { data, error } = await supabase.rpc(
    "get_workspace_invitation_preview",
    {
      p_token: token,
    }
  );

  if (error) throw error;

  const preview = Array.isArray(data) ? data[0] : data;

  if (!preview) {
    throw new Error("Invitation was not found.");
  }

  return preview;
}

export async function createWorkspaceInvitation({
  workspaceId,
  email,
  role = "member",
  expiresAt,
}) {
  if (!workspaceId) throw new Error("Workspace ID is required.");

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Invite email is required.");

  const token = generateInviteToken();

  const defaultExpiresAt = new Date();
  defaultExpiresAt.setMinutes(
    defaultExpiresAt.getMinutes() + DEFAULT_INVITE_MINUTES
  );

  const { data, error } = await supabase.rpc("create_workspace_invitation", {
    p_workspace_id: workspaceId,
    p_email: normalizedEmail,
    p_role: role || "member",
    p_token: token,
    p_expires_at: expiresAt || defaultExpiresAt.toISOString(),
  });

  if (error) throw error;

  return {
    invitation: data,
    token,
    inviteUrl: buildWorkspaceInviteUrl(token),
  };
}

export async function cancelWorkspaceInvitation(invitationId) {
  if (!invitationId) throw new Error("Invitation ID is required.");

  const { data, error } = await supabase.rpc("cancel_workspace_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) throw error;

  return data;
}

/**
 * Legacy helper kept only to avoid breaking older imports.
 * Do not call this from invitation acceptance.
 * Shared workspace invitations must not archive or disable a user's owned workspace.
 */
export async function archiveOwnedWorkspacesExcept(workspaceIdToKeep) {
  if (!workspaceIdToKeep) {
    throw new Error("Workspace to keep is required.");
  }

  const user = await getCurrentUser();
  const archivedAt = new Date().toISOString();

  const { data: ownedWorkspaces, error: ownedError } = await supabase
    .from("workspaces")
    .select("id, name, owner_user_id, workspace_type, status")
    .eq("owner_user_id", user.id)
    .eq("status", "active")
    .neq("id", workspaceIdToKeep);

  if (ownedError) throw ownedError;

  const workspaceIds = (ownedWorkspaces || []).map((workspace) => workspace.id);

  if (!workspaceIds.length) {
    return {
      archivedWorkspaceIds: [],
      archivedMembershipIds: [],
    };
  }

  const { data: archivedWorkspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .update({
      status: "archived",
      updated_at: archivedAt,
    })
    .in("id", workspaceIds)
    .eq("owner_user_id", user.id)
    .select("id");

  if (workspaceError) throw workspaceError;

  const { data: archivedMemberships, error: membershipError } = await supabase
    .from("workspace_members")
    .update({
      status: "archived",
      archived_at: archivedAt,
    })
    .eq("user_id", user.id)
    .in("workspace_id", workspaceIds)
    .select("id");

  if (membershipError) throw membershipError;

  return {
    archivedWorkspaceIds: (archivedWorkspaces || []).map((item) => item.id),
    archivedMembershipIds: (archivedMemberships || []).map((item) => item.id),
  };
}

export async function acceptWorkspaceInvitation(token) {
  if (!token) throw new Error("Invitation token is required.");

  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    p_token: token,
  });

  if (error) throw error;

  const acceptedInvitation = Array.isArray(data) ? data[0] : data;

  if (acceptedInvitation?.workspace_id) {
    setActiveClientWorkspaceId(acceptedInvitation.workspace_id);
  }

  return data;
}

export async function listWorkspaceInvitations(workspaceId) {
  if (!workspaceId) throw new Error("Workspace ID is required.");

  const { data, error } = await supabase
    .from("workspace_invitations")
    .select(`
      id,
      workspace_id,
      email,
      role,
      status,
      invited_by,
      accepted_by,
      expires_at,
      accepted_at,
      cancelled_at,
      created_at,
      updated_at,
      inviter:invited_by (
        id,
        email,
        full_name
      ),
      accepter:accepted_by (
        id,
        email,
        full_name
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function expireWorkspaceInvitations() {
  const { data, error } = await supabase.rpc("expire_workspace_invitations");

  if (error) throw error;

  return data || 0;
}
