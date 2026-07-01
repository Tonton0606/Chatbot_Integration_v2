import { supabase } from "../../../../config/supabaseClient";

export async function getWorkspaceFooter(workspaceId) {
  if (!workspaceId) return null;
  
  const { data, error } = await supabase
    .from("workspace_footers")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching workspace footer:", error);
    return null;
  }
  
  return data;
}

export async function saveWorkspaceFooter(payload) {
  if (!payload?.workspace_id) return null;

  const { data, error } = await supabase
    .from("workspace_footers")
    .upsert(
      {
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("Error saving workspace footer:", error);
    throw error;
  }

  return data;
}
