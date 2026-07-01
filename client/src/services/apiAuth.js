import { supabase } from '../config/supabaseClient';

function getStoredWorkspaceId() {
  try {
    return localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || null;
  } catch {
    return null;
  }
}

export async function withAuthHeaders(headers = {}, workspaceId) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const wsId = workspaceId || getStoredWorkspaceId();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(wsId ? { 'x-workspace-id': wsId } : {}),
    ...headers,
  };
}
