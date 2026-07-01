import { supabase } from "../../config/supabaseClient";

export async function getCurrentUserProfile() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User session not found.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return {
    id: userId,
    full_name:
      profile?.full_name ||
      authData?.user?.user_metadata?.full_name ||
      authData?.user?.email ||
      "Current User",

    email: profile?.email || authData?.user?.email || "",

    role: profile?.role || "client",
  };
}

export async function resolveClientWorkspaceId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User session not found.");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.workspace_id) {
    throw new Error("No workspace assigned to this user.");
  }

  return data.workspace_id;
}
