import { supabase } from "../../config/supabaseClient";

const API_ROOT = String(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api"
).replace(/\/$/, "");

async function getHeaders(workspaceId) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
  };
}

async function request(path, { workspaceId = "", ...options } = {}) {
  const response = await fetch(`${API_ROOT}/social-media-ads${path}`, {
    ...options,
    headers: {
      ...(await getHeaders(workspaceId)),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status}).`);
    error.status = response.status;
    error.configured = payload.configured;
    throw error;
  }

  return payload.data;
}

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function listSocialAdWorkspaces() {
  return request("/workspaces");
}

export function listSocialAdCampaigns(workspaceId, filters = {}) {
  return request(`/${queryString(filters)}`, { workspaceId });
}

export function getSocialAdCampaign(workspaceId, campaignId) {
  return request(`/${encodeURIComponent(campaignId)}`, { workspaceId });
}

export function createSocialAdCampaign(workspaceId, payload) {
  return request("/", {
    workspaceId,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSocialAdCampaign(workspaceId, campaignId, payload) {
  return request(`/${encodeURIComponent(campaignId)}`, {
    workspaceId,
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function runSocialAdAction(workspaceId, campaignId, action, payload = {}) {
  return request(`/${encodeURIComponent(campaignId)}/${action}`, {
    workspaceId,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteSocialAdCampaign(workspaceId, campaignId) {
  return request(`/${encodeURIComponent(campaignId)}`, {
    workspaceId,
    method: "DELETE",
  });
}

export function getSocialAdAnalytics(workspaceId) {
  return request("/analytics", { workspaceId });
}

export function getSocialAdConnections(workspaceId) {
  return request("/connections", { workspaceId });
}

export function saveSocialAdConnection(workspaceId, platform, payload) {
  return request(`/connections/${encodeURIComponent(platform)}`, {
    workspaceId,
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function removeSocialAdConnection(workspaceId, platform) {
  return request(`/connections/${encodeURIComponent(platform)}`, {
    workspaceId,
    method: "DELETE",
  });
}

export function testSocialAdConnection(workspaceId, platform) {
  return request(`/connection-test/${encodeURIComponent(platform)}`, {
    workspaceId,
    method: "POST",
    body: "{}",
  });
}

export function uploadSocialAdCreative(workspaceId, dataUrl) {
  return request("/creative-image", {
    workspaceId,
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
}

export function generateSocialAdSuggestion(workspaceId, context) {
  return request("/ai-suggestion", {
    workspaceId,
    method: "POST",
    body: JSON.stringify(context),
  });
}
