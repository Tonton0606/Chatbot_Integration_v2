import { supabase } from "../../config/supabaseClient";

function normalizeApiBaseUrl(value) {
  const rawBaseUrl = (
    value ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:5000/api"
  ).replace(/\/+$/, "");

  if (rawBaseUrl.endsWith("/api")) {
    return rawBaseUrl;
  }

  return `${rawBaseUrl}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl();

async function getAuthHeaders(extraHeaders = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error("User session not found.");
  }

  return {
    ...extraHeaders,
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function parseApiResponse(response) {
  const rawText = await response.text();

  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch (_error) {
    throw new Error(
      `Invalid API response from ${response.url}. Expected JSON but received: ${rawText.slice(
        0,
        160
      )}`
    );
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export async function resolveWorkspaceId() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user?.id) {
    throw new Error("User session not found.");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      workspace_id,
      role,
      profile:profiles!workspace_members_user_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return {
    workspaceId: data.workspace_id,
    userId: user.id,
    userEmail: user.email,
    userName: data?.profile?.full_name || "",
  };
}

export async function getWorkspaceIntegrations() {
  const { workspaceId } = await resolveWorkspaceId();

  const response = await fetch(
    `${API_BASE_URL}/workspace-integrations?workspace_id=${encodeURIComponent(
      workspaceId
    )}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  const payload = await parseApiResponse(response);

  return payload.integrations || [];
}

export async function connectGoogleWorkspace({ intendedEmail }) {
  const { workspaceId, userId } = await resolveWorkspaceId();

  const response = await fetch(
    `${API_BASE_URL}/workspace-integrations/google/connect`,
    {
      method: "POST",
      headers: await getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        workspace_id: workspaceId,
        intended_email: intendedEmail,
        user_id: userId,
      }),
    }
  );

  const payload = await parseApiResponse(response);

  window.location.href = payload.auth_url;
}

export async function connectZoomWorkspace({ intendedEmail }) {
  const { workspaceId, userId } = await resolveWorkspaceId();

  const response = await fetch(
    `${API_BASE_URL}/workspace-integrations/zoom/connect`,
    {
      method: "POST",
      headers: await getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        workspace_id: workspaceId,
        intended_email: intendedEmail,
        user_id: userId,
      }),
    }
  );

  const payload = await parseApiResponse(response);

  window.location.href = payload.auth_url;
}

export async function disconnectWorkspaceIntegration(provider) {
  const { workspaceId } = await resolveWorkspaceId();

  const response = await fetch(
    `${API_BASE_URL}/workspace-integrations/disconnect`,
    {
      method: "POST",
      headers: await getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        workspace_id: workspaceId,
        provider,
      }),
    }
  );

  return parseApiResponse(response);
}

export function getIntegrationStatus(integrations, provider) {
  return (
    integrations.find(
      (item) => item.provider === provider && item.status === "active"
    ) || null
  );
}
