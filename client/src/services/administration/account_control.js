import { supabase } from "../../config/supabaseClient";

function isAdminRole(role) {
  return ["admin", "superadmin"].includes(String(role || "").toLowerCase());
}

function normalizeRole(role) {
  return isAdminRole(role) ? "Admin" : "Client";
}

export async function getAccounts() {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      status,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function updateAccount(accountId, payload) {
  const { data: currentAccount, error: currentError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", accountId)
    .single();

  if (currentError) throw currentError;

  const currentRole = normalizeRole(currentAccount.role);
  const nextRole = normalizeRole(payload.role);

  const profilePayload = {
    full_name: payload.full_name,
    status: payload.status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(profilePayload)
    .eq("id", accountId)
    .select()
    .single();

  if (error) throw error;

  if (currentRole === "Client" && nextRole === "Admin") {
    const { error: promoteError } = await supabase.rpc("promote_user_to_admin", {
      target_user_id: accountId,
    });

    if (promoteError) throw promoteError;
  }

  if (currentRole === "Admin" && nextRole === "Client") {
    const { error: demoteError } = await supabase.rpc("demote_admin_to_client", {
      target_user_id: accountId,
    });

    if (demoteError) throw demoteError;
  }

  const { data: updatedAccount, error: updatedError } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      status,
      created_at,
      updated_at
    `)
    .eq("id", accountId)
    .single();

  if (updatedError) throw updatedError;

  return updatedAccount || data;
}
