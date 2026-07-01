import { supabase } from "../../config/supabaseClient";
import { getCurrentSession } from "../../services/auth/authActions";

export function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

export async function waitForCurrentSession({ attempts = 8, delayMs = 500 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const session = await getCurrentSession();

    if (session?.user?.id) {
      return session;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

export async function getOwnedActiveWorkspacesExcept({
  userId,
  workspaceIdToKeep,
}) {
  if (!userId) return [];

  let query = supabase
    .from("workspaces")
    .select("id, name, workspace_type, status, owner_user_id")
    .eq("owner_user_id", userId)
    .eq("status", "active");

  if (workspaceIdToKeep) {
    query = query.neq("id", workspaceIdToKeep);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export function buildJoinSharedWorkspaceConfirmationMessage({
  inviteWorkspaceName,
  ownedWorkspaces = [],
}) {
  const ownedWorkspaceNames = ownedWorkspaces
    .map((workspace) => workspace.name)
    .filter(Boolean)
    .join(", ");

  return [
    "You already have your own workspace.",
    "",
    `Joining ${inviteWorkspaceName || "this shared workspace"} will switch your current active workspace to the shared workspace.`,
    "",
    ownedWorkspaceNames
      ? `Your existing workspace (${ownedWorkspaceNames}) will remain active and unchanged.`
      : "Your existing workspace will remain active and unchanged.",
    "",
    "You can switch back to your own workspace later.",
    "",
    "Do you want to join this shared workspace?",
  ].join("\\n");
}
