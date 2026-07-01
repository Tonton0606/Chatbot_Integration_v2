import { supabase } from "../../config/supabaseClient";

export async function resolveClientWorkspace(overrideWorkspaceId = "") {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User session not found.");
  }

  if (overrideWorkspaceId) {
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, name, workspace_type, status, owner_user_id")
      .eq("id", overrideWorkspaceId)
      .maybeSingle();

    if (workspaceError) {
      throw workspaceError;
    }

    if (!workspace?.id) {
      throw new Error("Selected client workspace was not found.");
    }

    return {
      userId,
      workspaceId: workspace.id,
      role: "admin_override",
      workspace,
      adminOverrideMode: true,
    };
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      workspace_id,
      role,
      workspace:workspaces (
        id,
        name,
        workspace_type,
        status,
        owner_user_id
      )
    `
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.workspace_id) {
    throw new Error("No workspace assigned to this user.");
  }

  return {
    userId,
    workspaceId: data.workspace_id,
    role: data.role,
    workspace: data.workspace || null,
    adminOverrideMode: false,
  };
}
