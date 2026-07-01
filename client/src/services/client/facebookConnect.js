import { supabase } from "../../config/supabaseClient";

const envApiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

function normalizeApiBase(base) {
  const cleanBase = String(base || "").trim().replace(/\/$/, "");
  if (!cleanBase) return import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
  return cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;
}

const API_BASE_URL = normalizeApiBase(envApiBase);

function normalizeWorkspaceId(workspaceId) {
  return typeof workspaceId === "string" ? workspaceId.trim() : "";
}

function normalizePageId(pageId) {
  if (typeof pageId === "number") return String(pageId);
  return typeof pageId === "string" ? pageId.trim() : "";
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const normalized =
      typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";

    if (normalized) {
      query.set(key, normalized);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

class ClientFacebookConnectService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `API error (${response.status})`);
    }

    return payload;
  }

  async getDashboard({ workspaceId, pageId = "" }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);

    if (!normalizedWorkspaceId) {
      return {
        workspaceId: "",
        pageId: "",
        summary: {},
        faqs: [],
        suggestions: [],
        analytics: [],
        conversations: [],
        pageSettings: null,
      };
    }

    return this.request(
      `/webhooks/facebook/client/connect/dashboard${buildQuery({
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
      })}`,
      { method: "GET" }
    );
  }

  async listFaqs({ workspaceId, status = "", search = "" }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    if (!normalizedWorkspaceId) {
      return { faqs: [], count: 0 };
    }

    return this.request(
      `/webhooks/facebook/client/connect/faqs${buildQuery({
        workspaceId: normalizedWorkspaceId,
        status,
        search,
      })}`,
      { method: "GET" }
    );
  }

  async createFaq({ workspaceId, payload }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    return this.request("/webhooks/facebook/client/connect/faqs", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: normalizedWorkspaceId,
        ...payload,
      }),
    });
  }

  async updateFaq({ workspaceId, faqId, payload }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    return this.request(
      `/webhooks/facebook/client/connect/faqs/${encodeURIComponent(faqId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          workspaceId: normalizedWorkspaceId,
          ...payload,
        }),
      }
    );
  }

  async archiveFaq({ workspaceId, faqId }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    return this.request(
      `/webhooks/facebook/client/connect/faqs/${encodeURIComponent(faqId)}/archive`,
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId: normalizedWorkspaceId,
        }),
      }
    );
  }

  async listSuggestions({ workspaceId, status = "pending" }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    if (!normalizedWorkspaceId) {
      return { suggestions: [], count: 0 };
    }

    return this.request(
      `/webhooks/facebook/client/connect/suggestions${buildQuery({
        workspaceId: normalizedWorkspaceId,
        status,
      })}`,
      { method: "GET" }
    );
  }

  async approveSuggestion({
    workspaceId,
    suggestionId,
    answer,
    category = "",
    keywords = [],
  }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    return this.request(
      `/webhooks/facebook/client/connect/suggestions/${encodeURIComponent(
        suggestionId
      )}/approve`,
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId: normalizedWorkspaceId,
          answer,
          category,
          keywords,
        }),
      }
    );
  }

  async rejectSuggestion({ workspaceId, suggestionId }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    return this.request(
      `/webhooks/facebook/client/connect/suggestions/${encodeURIComponent(
        suggestionId
      )}/reject`,
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId: normalizedWorkspaceId,
        }),
      }
    );
  }

  async archiveSuggestion({ workspaceId, suggestionId }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

    return this.request(
      `/webhooks/facebook/client/connect/suggestions/${encodeURIComponent(
        suggestionId
      )}/archive`,
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId: normalizedWorkspaceId,
        }),
      }
    );
  }

  async getSettings({ workspaceId, pageId }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);

    if (!normalizedWorkspaceId || !normalizedPageId) {
      return { settings: null };
    }

    return this.request(
      `/webhooks/facebook/client/connect/settings${buildQuery({
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
      })}`,
      { method: "GET" }
    );
  }

  async updateSettings({ workspaceId, pageId, payload }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);

    return this.request("/webhooks/facebook/client/connect/settings", {
      method: "PUT",
      body: JSON.stringify({
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        ...payload,
      }),
    });
  }

  async getAnalytics({ workspaceId, pageId = "", limit = 30 }) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);

    if (!normalizedWorkspaceId) {
      return { analytics: [], count: 0 };
    }

    return this.request(
      `/webhooks/facebook/client/connect/analytics${buildQuery({
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        limit,
      })}`,
      { method: "GET" }
    );
  }
}

export default new ClientFacebookConnectService();
