const envApiBase = import.meta.env.VITE_API_URL;

function deriveProductionApiBase() {
  try {
    const origin = window?.location?.origin || "";
    if (!origin) return "/api";
    if (origin.includes("-fe.")) return origin.replace("-fe.", "-be.");
    return origin;
  } catch {
    return "/api";
  }
}

function normalizeApiBase(base) {
  const cleanBase = String(base || "").trim().replace(/\/$/, "");
  if (!cleanBase || cleanBase === "/api") return "http://localhost:5000/api";
  return cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;
}

const API_BASE_URL = import.meta.env.DEV
  ? normalizeApiBase(envApiBase)
  : normalizeApiBase(envApiBase || deriveProductionApiBase());

class HandoffService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    let authHeaders = {};
    try {
      // Lazy import supabase so it works without module cycle if applicable
      const { supabase } = await import("../config/supabaseClient");
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeaders = { Authorization: `Bearer ${session.access_token}` };
      }
    } catch (err) {
      // Ignore token fetch errors
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options.headers,
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `API error (${response.status})`);
    }

    return payload;
  }

  /**
   * Loads human handoff conversations for the given workspace and page.
   */
  async getConversations({ workspaceId, pageId = "", filter = "all" }) {
    const query = new URLSearchParams();
    if (workspaceId) query.set("workspaceId", workspaceId);
    if (pageId) query.set("pageId", pageId);
    if (filter) query.set("filter", filter);

    return this.request(`/webhooks/facebook/client/handoffs?${query.toString()}`);
  }

  /**
   * Loads messages for a specific handoff conversation.
   */
  async getMessages({ workspaceId, conversationId }) {
    const query = new URLSearchParams();
    if (workspaceId) query.set("workspaceId", workspaceId);

    return this.request(`/webhooks/facebook/client/handoffs/${conversationId}/messages?${query.toString()}`);
  }

  /**
   * Sends a human agent reply.
   */
  async sendReply({ workspaceId, conversationId, messageText, mediaUrl, mediaType, senderName }) {
    return this.request(`/webhooks/facebook/client/handoffs/${conversationId}/reply`, {
      method: "POST",
      body: JSON.stringify({ workspaceId, messageText, mediaUrl, mediaType, senderName }),
    });
  }

  /**
   * Re-enables the chatbot for a paused conversation.
   */
  async enableChatbot({ workspaceId, conversationId }) {
    return this.request(`/webhooks/facebook/client/handoffs/${conversationId}/enable-chatbot`, {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    });
  }

  /**
   * Gets the count of pending handoff conversations.
   */
  async getBadgeCount({ workspaceId, pageId = "" }) {
    const query = new URLSearchParams();
    if (workspaceId) query.set("workspaceId", workspaceId);
    if (pageId) query.set("pageId", pageId);

    return this.request(`/webhooks/facebook/client/handoffs/badge-count?${query.toString()}`);
  }
}

export default new HandoffService();
