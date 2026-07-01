import { supabase } from "../../config/supabaseClient";

const envApiBase = import.meta.env.VITE_API_URL;

function deriveProductionApiBase() {
  try {
    const origin = window?.location?.origin || "";
    if (!origin) return "/api";
    if (origin.includes("-fe.")) return origin.replace("-fe.", "-be.");
    return origin;
  } catch (e) {
    return "/api";
  }
}

function withApiSuffix(base) {
  const normalized = String(base || "").replace(/\/$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

const API_BASE_URL = import.meta.env.DEV
  ? !envApiBase || envApiBase === "/api"
    ? "http://localhost:5000/api"
    : withApiSuffix(envApiBase)
  : (() => {
      const base = envApiBase || deriveProductionApiBase();
      return withApiSuffix(base);
    })();

class FacebookIntegrationService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.cacheKey = "hermes-facebook-integration";
  }

  createToken(prefix = "token") {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now()}_${randomPart}`;
  }

  getStoredTestToken(cached = {}) {
    return cached.verifyToken || this.createToken("test");
  }

  readCache() {
    if (typeof window === "undefined") return null;

    try {
      const cached = window.localStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  writeCache(data) {
    if (typeof window === "undefined") return data;

    try {
      window.localStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch {
      // Ignore storage failures in private/incognito contexts.
    }

    return data;
  }

  normalizePageId(value) {
    if (typeof value === "number") return String(value);
    return typeof value === "string" ? value.trim() : "";
  }

  upsertCachedPage(pageId, payload = {}, note = "") {
    const normalizedPageId = this.normalizePageId(pageId || payload.pageId);
    if (!normalizedPageId) {
      throw new Error("pageId is required");
    }

    const cached = this.readCache() || {};
    const connectedPages = Array.isArray(cached.connectedPages)
      ? cached.connectedPages
      : [];

    const existingPage =
      connectedPages.find(
        (page) => this.normalizePageId(page?.pageId) === normalizedPageId
      ) || {};

    const nextPage = {
      ...existingPage,
      pageId: normalizedPageId,
      pageName: payload.pageName ?? existingPage.pageName ?? cached.pageName ?? "Connected Facebook Page",
      businessType: payload.businessType ?? existingPage.businessType ?? "",
      productServices: payload.productServices ?? existingPage.productServices ?? "",
      productServicePriceRanges:
        payload.productServicePriceRanges ??
        existingPage.productServicePriceRanges ??
        "",
      websiteLink: payload.websiteLink ?? existingPage.websiteLink ?? "",
      shoppeLink: payload.shoppeLink ?? existingPage.shoppeLink ?? "",
      lazadaLink: payload.lazadaLink ?? existingPage.lazadaLink ?? "",
      knowledge: payload.knowledge ?? existingPage.knowledge ?? "",
      aiInstruction: payload.aiInstruction ?? existingPage.aiInstruction ?? cached.aiInstruction ?? "",
      connectedWorkspaceId:
        payload.connectedWorkspaceId ?? existingPage.connectedWorkspaceId ?? "",
      accessMode: payload.accessMode ?? existingPage.accessMode ?? "enable",
      pageAccessTokenMasked:
        payload.pageAccessToken
          ? `${String(payload.pageAccessToken).slice(0, 4)}********`
          : existingPage.pageAccessTokenMasked || cached.pageAccessTokenMasked || "********",
    };

    const nextConnectedPages = [
      nextPage,
      ...connectedPages.filter(
        (page) => this.normalizePageId(page?.pageId) !== normalizedPageId
      ),
    ];

    const isPrimaryPage =
      !cached.pageId || this.normalizePageId(cached.pageId) === normalizedPageId;
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return this.writeCache({
      ...cached,
      connected: true,
      pageId: isPrimaryPage ? nextPage.pageId : cached.pageId,
      pageName: isPrimaryPage ? nextPage.pageName : cached.pageName,
      businessType: isPrimaryPage ? nextPage.businessType : cached.businessType,
      productServices: isPrimaryPage ? nextPage.productServices : cached.productServices,
      productServicePriceRanges: isPrimaryPage
        ? nextPage.productServicePriceRanges
        : cached.productServicePriceRanges,
      websiteLink: isPrimaryPage ? nextPage.websiteLink : cached.websiteLink,
      shoppeLink: isPrimaryPage ? nextPage.shoppeLink : cached.shoppeLink,
      lazadaLink: isPrimaryPage ? nextPage.lazadaLink : cached.lazadaLink,
      knowledge: isPrimaryPage ? nextPage.knowledge : cached.knowledge,
      aiInstruction: isPrimaryPage ? nextPage.aiInstruction : cached.aiInstruction,
      connectedWorkspaceId: isPrimaryPage
        ? nextPage.connectedWorkspaceId
        : cached.connectedWorkspaceId,
      accessMode: isPrimaryPage ? nextPage.accessMode : cached.accessMode || "enable",
      hasPageAccessToken: true,
      hasVerifyToken: true,
      hasAppSecret: Boolean(cached.hasAppSecret),
      webhookUrl: cached.webhookUrl || `${origin}/api/webhooks/facebook`,
      subscription: cached.subscription || "messages and messaging_postbacks",
      pageAccessTokenMasked: isPrimaryPage
        ? nextPage.pageAccessTokenMasked
        : cached.pageAccessTokenMasked || "********",
      verifyToken: cached.verifyToken || payload.verifyToken || this.createToken("test"),
      connectedPages: nextConnectedPages,
      connectedCount: nextConnectedPages.length,
      note:
        note ||
        "Local fallback saved in browser storage because the API endpoint was unavailable.",
    });
  }

  buildFallbackStatus(payload = {}) {
    return this.upsertCachedPage(
      payload.pageId,
      payload,
      "Local fallback connection saved in browser storage because the API endpoint was unavailable."
    );
  }

  mapSupabaseFacebookPage(record = {}) {
    const pageId = this.normalizePageId(record.page_id || record.pageId);
    if (!pageId) return null;

    return {
      pageId,
      pageName: record.fb_name || record.page_name || record.pageName || "Facebook Page",
      businessType: record.business_type || record.businessType || "",
      productServices:
        record.product_services ||
        record.products_services ||
        record.productServices ||
        "",
      productServicePriceRanges:
        record.product_service_price_ranges ||
        record.productServicePriceRanges ||
        "",
      websiteLink: record.website_link || record.websiteLink || "",
      shoppeLink: record.shoppe_link || record.shoppeLink || "",
      lazadaLink: record.lazada_link || record.lazadaLink || "",
      knowledge: record.knowledge || "",
      aiInstruction: record.ai_instruction || record.aiInstruction || "",
      connectedWorkspaceId:
        record.workspace_id ||
        record.connected_workspace_id ||
        record.connectedWorkspaceId ||
        "",
      accessMode: record.access_mode || record.accessMode || "enable",
      pageAccessTokenMasked: record.fb_token ? `${String(record.fb_token).slice(0, 4)}********` : "********",
    };
  }

  async getClientPagesFromSupabase(workspaceId) {
    const normalized = typeof workspaceId === "string" ? workspaceId.trim() : "";
    if (!normalized) {
      return { workspaceId: "", pages: [], count: 0 };
    }

    const { data: fbPages, error: fbPagesError } = await supabase
      .from("fb_pages")
      .select("*")
      .eq("workspace_id", normalized)
      .order("created_at", { ascending: false });

    if (!fbPagesError && Array.isArray(fbPages) && fbPages.length > 0) {
      const pages = fbPages
        .map((page) => this.mapSupabaseFacebookPage(page))
        .filter(Boolean);

      return {
        workspaceId: normalized,
        pages,
        count: pages.length,
        source: "supabase-fb-pages",
      };
    }

    return {
      workspaceId: normalized,
      pages: [],
      count: 0,
      source: "supabase-empty",
      error: fbPagesError?.message || "",
    };
  }

  async request(endpoint, options = {}) {
    let authHeaders = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeaders = { Authorization: `Bearer ${session.access_token}` };
      }
    } catch (err) {
      // Ignore token fetch errors
    }

    let response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
      });
    } catch (networkErr) {
      throw new Error(
        "Cannot reach the backend server. Make sure it is running on port 5000 (run: npm run dev)."
      );
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `API error (${response.status})`);
    }

    return response.json();
  }

  async getStatus() {
    try {
      const cached = this.readCache() || {};
      const data = await this.request("/webhooks/facebook/admin/status", { method: "GET" });
      const cachedPages = Array.isArray(cached.connectedPages)
        ? cached.connectedPages
        : [];
      const serverPages = Array.isArray(data.connectedPages)
        ? data.connectedPages
        : [];

      if (serverPages.length === 0 && cachedPages.length > 0) {
        return this.writeCache({
          ...cached,
          ...data,
          connected: cached.connected ?? data.connected,
          pageId: cached.pageId || data.pageId || "",
          pageName: cached.pageName || data.pageName || "",
          businessType: cached.businessType || data.businessType || "",
          productServices: cached.productServices || data.productServices || "",
          productServicePriceRanges:
            cached.productServicePriceRanges ||
            data.productServicePriceRanges ||
            "",
          websiteLink: cached.websiteLink || data.websiteLink || "",
          shoppeLink: cached.shoppeLink || data.shoppeLink || "",
          lazadaLink: cached.lazadaLink || data.lazadaLink || "",
          knowledge: cached.knowledge || data.knowledge || "",
          connectedWorkspaceId:
            cached.connectedWorkspaceId || data.connectedWorkspaceId || "",
          accessMode: cached.accessMode || data.accessMode || "enable",
          subscription: data.subscription || "messages and messaging_postbacks",
          pageAccessTokenMasked:
            cached.pageAccessTokenMasked || data.pageAccessTokenMasked || "********",
          verifyToken: data.verifyToken || cached.verifyToken || this.createToken("test"),
          connectedPages: cachedPages,
          connectedCount: cachedPages.length,
          note:
            "Supabase returned no Facebook pages, so cached browser pages are being shown.",
        });
      }

      return this.writeCache({
        ...data,
        subscription: data.subscription || "messages and messaging_postbacks",
        pageAccessTokenMasked: data.pageAccessTokenMasked || "********",
        verifyToken: data.verifyToken || cached.verifyToken || this.createToken("test"),
      });
    } catch {
      const cached = this.readCache();
      if (cached) {
        return cached;
      }

      try {
        const cached = this.readCache() || {};
        const data = await this.request("/integrations/facebook", { method: "GET" });
        const cachedPages = Array.isArray(cached.connectedPages)
          ? cached.connectedPages
          : [];
        const serverPages = Array.isArray(data.connectedPages)
          ? data.connectedPages
          : [];

        if (serverPages.length === 0 && cachedPages.length > 0) {
          return this.writeCache({
            ...cached,
            ...data,
            connected: cached.connected ?? data.connected,
            connectedPages: cachedPages,
            connectedCount: cachedPages.length,
            note:
              "Fallback API returned no Facebook pages, so cached browser pages are being shown.",
          });
        }

        return this.writeCache({
          ...data,
          subscription: data.subscription || "messages and messaging_postbacks",
          pageAccessTokenMasked: data.pageAccessTokenMasked || "********",
          verifyToken: data.verifyToken || this.createToken("test"),
        });
      } catch {
        return {
          connected: false,
          pageId: "",
          pageName: "",
          businessType: "",
          productServices: "",
          productServicePriceRanges: "",
          websiteLink: "",
          shoppeLink: "",
          lazadaLink: "",
          knowledge: "",
          connectedWorkspaceId: "",
          accessMode: "enable",
          hasPageAccessToken: false,
          hasVerifyToken: false,
          hasAppSecret: false,
          webhookUrl: "",
          subscription: "messages and messaging_postbacks",
          pageAccessTokenMasked: "********",
          verifyToken: this.createToken("test"),
          connectedPages: [],
          note: "No cached connection found yet.",
        };
      }
    }
  }

  async connectPage(payload) {
    const workspaceId = String(
      payload?.workspaceId || payload?.connectedWorkspaceId || ""
    ).trim();
    const requestPayload = {
      ...payload,
      workspaceId,
      connectedWorkspaceId: workspaceId,
    };

    try {
      const data = await this.request("/webhooks/facebook/admin/connect", {
        method: "POST",
        body: JSON.stringify(requestPayload),
      });

      return this.writeCache({
        ...data,
        accessMode: data.accessMode || requestPayload.accessMode || "enable",
        subscription: data.subscription || "messages and messaging_postbacks",
        pageAccessTokenMasked: requestPayload.pageAccessToken ? `${String(requestPayload.pageAccessToken).slice(0, 4)}********` : "********",
        verifyToken: data.verifyToken || requestPayload.verifyToken || this.createToken("test"),
      });
    } catch (primaryError) {
      try {
        const data = await this.request("/integrations/facebook", {
          method: "POST",
          body: JSON.stringify({ action: "connect", ...requestPayload }),
        });

        return this.writeCache({
          ...data,
          accessMode: data.accessMode || requestPayload.accessMode || "enable",
          subscription: data.subscription || "messages and messaging_postbacks",
          pageAccessTokenMasked: requestPayload.pageAccessToken ? `${String(requestPayload.pageAccessToken).slice(0, 4)}********` : "********",
          verifyToken: data.verifyToken || requestPayload.verifyToken || this.createToken("test"),
        });
      } catch (fallbackError) {
        return this.buildFallbackStatus(requestPayload);
      }
    }
  }

  async updateAccessMode(pageId, accessMode) {
    try {
      const data = await this.request("/webhooks/facebook/admin/access-mode", {
        method: "POST",
        body: JSON.stringify({ pageId, accessMode }),
      });

      return this.writeCache({
        ...data,
        accessMode: data.accessMode || "enable",
      });
    } catch (primaryError) {
      try {
        const data = await this.request("/integrations/facebook", {
          method: "POST",
          body: JSON.stringify({ action: "updateAccessMode", pageId, accessMode }),
        });

        return this.writeCache({
          ...data,
          accessMode: data.accessMode || "enable",
        });
      } catch (fallbackError) {
        return this.upsertCachedPage(
          pageId,
          { accessMode },
          "Local fallback access mode saved in browser storage because the API endpoint was unavailable."
        );
      }
    }
  }

  async updatePageDetails(pageId, payload = {}) {
    const workspaceId = String(
      payload?.workspaceId || payload?.connectedWorkspaceId || ""
    ).trim();
    const requestPayload = {
      ...payload,
      workspaceId,
      connectedWorkspaceId: workspaceId,
    };

    try {
      const data = await this.request("/webhooks/facebook/admin/page-details", {
        method: "POST",
        body: JSON.stringify({ pageId, ...requestPayload }),
      });

      return this.writeCache({
        ...data,
      });
    } catch (primaryError) {
      try {
        const data = await this.request("/integrations/facebook", {
          method: "POST",
          body: JSON.stringify({ action: "updatePageDetails", pageId, ...requestPayload }),
        });

        return this.writeCache({
          ...data,
        });
      } catch (fallbackError) {
        return this.upsertCachedPage(
          pageId,
          requestPayload,
          "Local fallback page details saved in browser storage because the API endpoint was unavailable."
        );
      }
    }
  }

  async deletePage(pageId) {
    const normalized = typeof pageId === "string" ? pageId.trim() : String(pageId || "").trim();
    if (!normalized) {
      throw new Error("pageId is required");
    }

    try {
      const data = await this.request("/webhooks/facebook/admin/delete", {
        method: "POST",
        body: JSON.stringify({ pageId: normalized }),
      });

      return this.writeCache({
        ...data,
      });
    } catch (primaryError) {
      const primaryMessage = primaryError?.message || "Primary delete endpoint failed.";
      throw new Error(primaryMessage);
    }
  }

  async subscribePage(pageId) {
    const normalized = typeof pageId === "string" ? pageId.trim() : String(pageId || "").trim();
    if (!normalized) throw new Error("pageId is required");
    return this.request("/webhooks/facebook/admin/subscribe-page", {
      method: "POST",
      body: JSON.stringify({ pageId: normalized }),
    });
  }

  async getOAuthUrl(workspaceId, role = "") {
    const normalized = typeof workspaceId === "string" ? workspaceId.trim() : "";
    const normalizedRole = typeof role === "string" ? role.trim() : "";
    const params = new URLSearchParams({ workspaceId: normalized });
    if (normalizedRole) params.set("role", normalizedRole);
    return this.request(
      `/webhooks/facebook/admin/oauth/start?${params.toString()}`,
      { method: "GET" }
    );
  }

  async getOAuthPages(workspaceId) {
    const normalized = typeof workspaceId === "string" ? workspaceId.trim() : "";
    return this.request(
      `/webhooks/facebook/admin/oauth/pages?workspaceId=${encodeURIComponent(normalized)}`,
      { method: "GET" }
    );
  }

  async sdkTokenToPages(workspaceId, accessToken) {
    const normalized = typeof workspaceId === "string" ? workspaceId.trim() : "";
    if (!normalized) throw new Error("workspaceId is required");
    if (!accessToken) throw new Error("accessToken is required");
    return this.request(
      "/webhooks/facebook/admin/oauth/sdk-token",
      {
        method: "POST",
        body: JSON.stringify({ workspaceId: normalized, accessToken }),
      }
    );
  }

  async selectOAuthPage(payload = {}) {
    const workspaceId = String(payload?.workspaceId || "").trim();
    return this.request("/webhooks/facebook/admin/oauth/select-page", {
      method: "POST",
      body: JSON.stringify({ ...payload, workspaceId }),
    });
  }

  async testChatbotReply(payload = {}) {
    const { pageId, message, history = [], customContext = {} } = payload;
    return this.request("/webhooks/facebook/admin/test-reply", {
      method: "POST",
      body: JSON.stringify({ pageId, message, history, customContext }),
    });
  }

  async getClientPagesByWorkspaceId(workspaceId) {
    const normalized = typeof workspaceId === "string" ? workspaceId.trim() : "";
    if (!normalized) {
      return { workspaceId: "", pages: [], count: 0 };
    }

    try {
      const result = await this.request(
        `/webhooks/facebook/client/pages?workspaceId=${encodeURIComponent(normalized)}`,
        { method: "GET" }
      );

      return {
        ...result,
        workspaceId: result?.workspaceId || normalized,
        pages: Array.isArray(result?.pages) ? result.pages : [],
        count: Array.isArray(result?.pages) ? result.pages.length : 0,
      };
    } catch (error) {
      return {
        workspaceId: normalized,
        pages: [],
        count: 0,
        error: error?.message || "Failed to load Facebook pages.",
      };
    }
  }

  async getClientInboxByWorkspaceId(workspaceId, pageId = "") {
    const normalizedWorkspaceId = typeof workspaceId === "string" ? workspaceId.trim() : "";
    const normalizedPageId = typeof pageId === "string" ? pageId.trim() : "";

    if (!normalizedWorkspaceId) {
      return { workspaceId: "", pageId: "", pages: [], threads: [], count: 0 };
    }

    const query = new URLSearchParams({ workspaceId: normalizedWorkspaceId });
    if (normalizedPageId) {
      query.set("pageId", normalizedPageId);
    }

    try {
      const result = await this.request(`/webhooks/facebook/client/inbox?${query.toString()}`, {
        method: "GET",
      });

      if (
        Array.isArray(result?.pages) &&
        result.pages.length > 0 &&
        (!result.matchMode || result.matchMode === "exact")
      ) {
        return result;
      }

      const pageResult = await this.getClientPagesFromSupabase(normalizedWorkspaceId);

      if (pageResult.count > 0) {
        const fallbackPageId = normalizedPageId || pageResult.pages[0]?.pageId || "";
        return {
          workspaceId: normalizedWorkspaceId,
          pageId: fallbackPageId,
          pages: pageResult.pages,
          threads: [],
          count: 0,
          source: pageResult.source,
          note:
            "Pages loaded from Supabase. Inbox messages require the backend Graph inbox endpoint.",
        };
      }

      return result;
    } catch (primaryError) {
      try {
        const result = await this.request("/integrations/facebook", {
          method: "POST",
          body: JSON.stringify({
            action: "clientInbox",
            workspaceId: normalizedWorkspaceId,
            pageId: normalizedPageId,
          }),
        });

        if (
          Array.isArray(result?.pages) &&
          result.pages.length > 0 &&
          (!result.matchMode || result.matchMode === "exact")
        ) {
          return result;
        }

        const pageResult = await this.getClientPagesFromSupabase(normalizedWorkspaceId);

        if (pageResult.count > 0) {
          const fallbackPageId = normalizedPageId || pageResult.pages[0]?.pageId || "";
          return {
            workspaceId: normalizedWorkspaceId,
            pageId: fallbackPageId,
            pages: pageResult.pages,
            threads: [],
            count: 0,
            source: pageResult.source,
            note:
              "Pages loaded from Supabase. Inbox messages require the backend Graph inbox endpoint.",
          };
        }

        return result;
      } catch (fallbackError) {
        const pageResult = await this.getClientPagesFromSupabase(normalizedWorkspaceId);

        if (pageResult.count > 0) {
          const fallbackPageId = normalizedPageId || pageResult.pages[0]?.pageId || "";
          return {
            workspaceId: normalizedWorkspaceId,
            pageId: fallbackPageId,
            pages: pageResult.pages,
            threads: [],
            count: 0,
            source: pageResult.source,
            note:
              "Pages loaded from Supabase. Inbox messages require the backend Graph inbox endpoint.",
          };
        }

        const primaryMessage = primaryError?.message || "Primary client inbox endpoint failed.";
        const fallbackMessage = fallbackError?.message || "Fallback client inbox endpoint failed.";
        throw new Error(`${primaryMessage} ${fallbackMessage}`.trim());
      }
    }
  }
}

export default new FacebookIntegrationService();
