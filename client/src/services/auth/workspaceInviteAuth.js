import {
  acceptWorkspaceInvitation,
  getWorkspaceInvitationPreview,
} from "../operations/workspace_invitations";

export function getInviteTokenFromSearch(search = "") {
  const params = new URLSearchParams(search);
  return params.get("invite") || "";
}

export function hasInviteToken(search = "") {
  return Boolean(getInviteTokenFromSearch(search));
}

export async function loadInvitePreview(inviteToken) {
  if (!inviteToken) {
    throw new Error("Invitation token is required.");
  }

  const preview = await getWorkspaceInvitationPreview(inviteToken);

  if (!preview?.email) {
    throw new Error("Invitation was not found.");
  }

  if (preview.status !== "pending") {
    throw new Error("Invitation is no longer pending.");
  }

  if (preview.expires_at && new Date(preview.expires_at) <= new Date()) {
    throw new Error("Invitation has expired.");
  }

  return preview;
}

export async function buildInviteSignupMetadata(inviteToken) {
  if (!inviteToken) return {};

  return {
    workspace_invite_token: inviteToken,
  };
}

export async function acceptInviteForSignedInUser(inviteToken) {
  if (!inviteToken) {
    throw new Error("Invitation token is required.");
  }

  return acceptWorkspaceInvitation(inviteToken);
}
