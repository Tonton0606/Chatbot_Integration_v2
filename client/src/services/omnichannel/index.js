/**
 * Omni-Channel API Service
 * Client-side functions for the unified inbox and channel management.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

import { supabase } from "../../config/supabaseClient";

async function getAuthHeaders() {
  const headers = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // continue without auth header
  }
  const workspaceId =
    localStorage.getItem("exponify_active_client_workspace_id") ||
    localStorage.getItem("workspaceId") ||
    localStorage.getItem("workspace_id");
  if (workspaceId) headers["x-workspace-id"] = workspaceId;
  return headers;
}

async function apiCall(path, options = {}) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `API error (${res.status})`);
  }

  return data;
}

export const omniChannelService = {
  // ── Conversations ──

  getConversations: (params = {}) => {
    const query = new URLSearchParams();
    if (params.channel) query.set("channel", params.channel);
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (params.limit) query.set("limit", params.limit);
    if (params.offset) query.set("offset", params.offset);
    return apiCall(`/omnichannel/conversations?${query.toString()}`);
  },

  getConversation: (id) => apiCall(`/omnichannel/conversations/${id}`),

  enableHandoff: (id) =>
    apiCall(`/omnichannel/conversations/${id}/handoff`, { method: "POST" }),

  enableChatbot: (id) =>
    apiCall(`/omnichannel/conversations/${id}/enable-chatbot`, { method: "POST" }),

  resolveConversation: (id) =>
    apiCall(`/omnichannel/conversations/${id}/resolve`, { method: "POST" }),

  sendReply: (id, text) =>
    apiCall(`/omnichannel/conversations/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // ── Channel Configs ──

  getChannels: () => apiCall("/omnichannel/channels"),

  saveChannel: (config) =>
    apiCall("/omnichannel/channels", {
      method: "POST",
      body: JSON.stringify(config),
    }),

  disconnectChannel: (id) =>
    apiCall(`/omnichannel/channels/${id}`, { method: "DELETE" }),

  // ── Analytics ──

  getAnalytics: () => apiCall("/omnichannel/analytics"),
};
