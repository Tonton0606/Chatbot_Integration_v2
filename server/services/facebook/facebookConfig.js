const logger = require('../../config/logger');
function normalizeAccessMode(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "disable"
    ? "disable"
    : "enable";
}

function normalizePageId(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWorkspaceId(payload = {}) {
  return normalizeText(payload.workspaceId || payload.connectedWorkspaceId);
}

function getNormalizedSupabaseRecord(record = {}) {
  const pageAccessToken =
    (typeof record.fb_token === "string" && record.fb_token.trim()) ||
    (typeof record.page_access_token === "string" &&
      record.page_access_token.trim()) ||
    "";

  const pageName =
    (typeof record.fb_name === "string" && record.fb_name.trim()) ||
    (typeof record.page_name === "string" && record.page_name.trim()) ||
    "";

  const businessType =
    (typeof record.business_type === "string" && record.business_type.trim()) ||
    (typeof record.businessType === "string" && record.businessType.trim()) ||
    "";

  const productServices =
    (typeof record.product_services === "string" &&
      record.product_services.trim()) ||
    (typeof record.productServices === "string" &&
      record.productServices.trim()) ||
    "";

  const productServicePriceRanges =
    (typeof record.product_service_price_ranges === "string" &&
      record.product_service_price_ranges.trim()) ||
    (typeof record.product_service_price_range === "string" &&
      record.product_service_price_range.trim()) ||
    (typeof record.productServicePriceRanges === "string" &&
      record.productServicePriceRanges.trim()) ||
    "";

  const websiteLink =
    (typeof record.website_link === "string" && record.website_link.trim()) ||
    (typeof record.websiteLink === "string" && record.websiteLink.trim()) ||
    "";

  const shoppeLink =
    (typeof record.shoppe_link === "string" && record.shoppe_link.trim()) ||
    (typeof record.shoppeLink === "string" && record.shoppeLink.trim()) ||
    "";

  const lazadaLink =
    (typeof record.lazada_link === "string" && record.lazada_link.trim()) ||
    (typeof record.lazadaLink === "string" && record.lazadaLink.trim()) ||
    "";

  const knowledge =
    (typeof record.knowledge === "string" && record.knowledge.trim()) ||
    (typeof record.knowledge_text === "string" &&
      record.knowledge_text.trim()) ||
    "";

  const connectedWorkspaceId =
    (typeof record.workspace_id === "string" && record.workspace_id.trim()) ||
    (typeof record.connected_workspace_id === "string" &&
      record.connected_workspace_id.trim()) ||
    (typeof record.connectedWorkspaceId === "string" &&
      record.connectedWorkspaceId.trim()) ||
    "";

  const aiInstruction =
    (typeof record.ai_instruction === "string" && record.ai_instruction.trim()) ||
    (typeof record.aiInstruction === "string" && record.aiInstruction.trim()) ||
    "";

  const welcomeMessage =
    (typeof record.welcome_message === "string" && record.welcome_message.trim()) ||
    (typeof record.welcomeMessage === "string" && record.welcomeMessage.trim()) ||
    "";

  const welcomeEnabled =
    record.welcome_enabled !== null && record.welcome_enabled !== undefined
      ? Boolean(record.welcome_enabled)
      : record.welcomeEnabled !== null && record.welcomeEnabled !== undefined
        ? Boolean(record.welcomeEnabled)
        : false;

  const defaultReply =
    (typeof record.default_reply === "string" && record.default_reply.trim()) ||
    (typeof record.defaultReply === "string" && record.defaultReply.trim()) ||
    "";

  const rawId = record.page_id ?? record.fb_page_id ?? record.id;
  const accessMode = normalizeAccessMode(record.access_mode ?? record.accessMode);

  return {
    fbPageRowId: record.id == null ? "" : String(record.id),
    pageId: rawId == null ? "" : String(rawId),
    pageName,
    pageAccessToken,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    aiInstruction,
    welcomeMessage,
    welcomeEnabled,
    defaultReply,
    connectedWorkspaceId,
    accessMode,
  };
}

function createFacebookConfigService({
  supabaseClient,
  runtimeConfig,
  env = process.env,
}) {
  if (!runtimeConfig) {
    throw new Error("runtimeConfig is required for facebookConfig service.");
  }

  async function getSupabaseFacebookConfig() {
    if (!supabaseClient) {
      return null;
    }

    logger.warn("getSupabaseFacebookConfig called without pageId — using unscoped fallback. This may return the wrong workspace's config in multi-tenant deployments.");

    const { data, error } = await supabaseClient
      .from("fb_pages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      logger.error({
        message: error.message,
      }, "Failed to read fb_pages from Supabase");
      return null;
    }

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    return getNormalizedSupabaseRecord(data[0]);
  }

  async function getSupabaseFacebookConfigByPageId(pageId) {
    if (!supabaseClient) {
      return null;
    }

    const normalizedPageId = normalizePageId(pageId);
    if (!normalizedPageId) {
      return null;
    }

    async function chooseBestPageRecord(records = []) {
      const normalizedRecords = Array.isArray(records)
        ? records.map((record) => ({
            raw: record,
            normalized: getNormalizedSupabaseRecord(record),
          }))
        : [];

      const workspaceIds = Array.from(
        new Set(
          normalizedRecords
            .map((entry) => entry.normalized.connectedWorkspaceId)
            .filter(Boolean)
        )
      );

      const faqWorkspaceIds = new Set();

      if (workspaceIds.length > 0) {
        const { data, error } = await supabaseClient
          .from("client_faqs")
          .select("workspace_id")
          .in("workspace_id", workspaceIds)
          .eq("status", "active")
          .is("archived_at", null);

        if (!error && Array.isArray(data)) {
          data.forEach((faq) => {
            const workspaceId = normalizeText(faq.workspace_id);
            if (workspaceId) faqWorkspaceIds.add(workspaceId);
          });
        }
      }

      normalizedRecords.sort((a, b) => {
        const aHasFaq = faqWorkspaceIds.has(a.normalized.connectedWorkspaceId);
        const bHasFaq = faqWorkspaceIds.has(b.normalized.connectedWorkspaceId);
        if (aHasFaq !== bHasFaq) return aHasFaq ? -1 : 1;

        const aEnabled = a.normalized.accessMode !== "disable";
        const bEnabled = b.normalized.accessMode !== "disable";
        if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;

        const aLinked = Boolean(a.normalized.connectedWorkspaceId);
        const bLinked = Boolean(b.normalized.connectedWorkspaceId);
        if (aLinked !== bLinked) return aLinked ? -1 : 1;

        const aHasKnowledge = Boolean(normalizeText(a.normalized.knowledge));
        const bHasKnowledge = Boolean(normalizeText(b.normalized.knowledge));
        if (aHasKnowledge !== bHasKnowledge) return aHasKnowledge ? -1 : 1;

        const aCreated = Date.parse(a.raw?.created_at || "") || 0;
        const bCreated = Date.parse(b.raw?.created_at || "") || 0;
        return bCreated - aCreated;
      });

      const selected = normalizedRecords[0]?.normalized || null;

      if (selected && normalizedRecords.length > 1) {
        logger.info("Selected Facebook page config from duplicate fb_pages rows", {
          pageId: selected.pageId,
          pageName: selected.pageName,
          workspaceId: selected.connectedWorkspaceId,
          hasActiveFaq: faqWorkspaceIds.has(selected.connectedWorkspaceId),
          duplicateCount: normalizedRecords.length,
        });
      }

      return selected;
    }

    const matchColumns = ["page_id", "fb_page_id", "id"];

    for (const column of matchColumns) {
      const { data, error } = await supabaseClient
        .from("fb_pages")
        .select("*")
        .eq(column, normalizedPageId)
        .order("created_at", { ascending: false });

      if (error) {
        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        return chooseBestPageRecord(data);
      }
    }

    return null;
  }

  async function getSupabaseFacebookPages() {
    if (!supabaseClient) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from("fb_pages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({
        message: error.message,
      }, "Failed to read fb_pages list from Supabase");
      return [];
    }

    return Array.isArray(data) ? data.map(getNormalizedSupabaseRecord) : [];
  }

  async function getSupabaseFacebookPagesByWorkspaceId(workspaceId) {
    if (!supabaseClient) {
      return [];
    }

    const normalizedId = normalizeText(workspaceId);
    if (!normalizedId) {
      return [];
    }

    const matchColumns = ["workspace_id", "connected_workspace_id"];
    let lastError = null;

    for (const column of matchColumns) {
      const { data, error } = await supabaseClient
        .from("fb_pages")
        .select("*")
        .eq(column, normalizedId)
        .order("created_at", { ascending: false });

      if (!error) {
        return Array.isArray(data) ? data.map(getNormalizedSupabaseRecord) : [];
      }

      lastError = error;

      const missingColumn = /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.test(
        error.message || ""
      );

      if (missingColumn) {
        continue;
      }

      break;
    }

    logger.error({
      message: lastError?.message,
    }, "Failed to read fb_pages by workspace");
    return [];
  }

  async function saveSupabasePageToken(payload = {}) {
    if (!supabaseClient) {
      throw new Error("Supabase credentials are missing on server.");
    }

    const normalizedPageId = normalizePageId(payload.pageId);
    const normalizedRowId = normalizePageId(payload.fbPageRowId || payload.id);

    const record = {
      page_id: normalizedPageId || null,
      fb_name: normalizeText(payload.pageName),
      fb_token: normalizeText(payload.pageAccessToken),
      business_type: normalizeText(payload.businessType),
      product_services: normalizeText(payload.productServices),
      product_service_price_ranges: normalizeText(
        payload.productServicePriceRanges
      ),
      website_link: normalizeText(payload.websiteLink),
      shoppe_link: normalizeText(payload.shoppeLink),
      lazada_link: normalizeText(payload.lazadaLink),
      knowledge: normalizeText(payload.knowledge),
      ai_instruction: normalizeText(payload.aiInstruction || payload.ai_instruction),
      workspace_id: normalizeWorkspaceId(payload),
      access_mode: normalizeAccessMode(payload.accessMode),
    };

    const matchers = [
      ...(normalizedRowId ? [{ column: "id", value: normalizedRowId }] : []),
      { column: "page_id", value: normalizedPageId },
      { column: "fb_page_id", value: normalizedPageId },
      { column: "id", value: normalizedPageId },
    ];

    for (const matcher of matchers) {
      let updatePayload = { ...record };

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { data, error } = await supabaseClient
          .from("fb_pages")
          .update(updatePayload)
          .eq(matcher.column, matcher.value)
          .select("*");

        if (!error) {
          if (Array.isArray(data) && data.length > 0) {
            const normalized = data.map(getNormalizedSupabaseRecord);
            const expectedWorkspaceId = normalizeWorkspaceId(payload);
            const matchingWorkspace = expectedWorkspaceId
              ? normalized.find(
                  (page) => page.connectedWorkspaceId === expectedWorkspaceId
                )
              : normalized[0];

            return matchingWorkspace || normalized[0];
          }

          break;
        }

        const missingColumnMatch =
          /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(
            error.message || ""
          );

        if (
          missingColumnMatch?.[1] &&
          Object.prototype.hasOwnProperty.call(
            updatePayload,
            missingColumnMatch[1]
          )
        ) {
          delete updatePayload[missingColumnMatch[1]];
          continue;
        }

        break;
      }
    }

    let insertPayload = { ...record };
    let insertError = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await supabaseClient
        .from("fb_pages")
        .insert(insertPayload)
        .select("*")
        .single();

      if (!error) {
        insertError = null;
        return data ? getNormalizedSupabaseRecord(data) : null;
      }

      insertError = error;

      const missingColumnMatch =
        /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(
          error.message || ""
        );

      if (
        missingColumnMatch?.[1] &&
        Object.prototype.hasOwnProperty.call(
          insertPayload,
          missingColumnMatch[1]
        )
      ) {
        delete insertPayload[missingColumnMatch[1]];
        continue;
      }

      break;
    }

    if (insertError) {
      throw new Error(`Failed to insert fb_pages token: ${insertError.message}`);
    }

    throw new Error("Failed to save fb_pages token.");
  }

  async function updateSupabasePageAccessMode(pageId, accessMode) {
    if (!supabaseClient) {
      throw new Error("Supabase credentials are missing on server.");
    }

    const normalizedPageId = normalizePageId(pageId);
    if (!normalizedPageId) {
      throw new Error("pageId is required");
    }

    const nextAccessMode = normalizeAccessMode(accessMode);
    const matchColumns = ["id", "page_id", "fb_page_id"];

    for (const column of matchColumns) {
      const { data, error } = await supabaseClient
        .from("fb_pages")
        .update({ access_mode: nextAccessMode })
        .eq(column, normalizedPageId)
        .select("*")
        .limit(1);

      if (error) {
        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        return getNormalizedSupabaseRecord(data[0]);
      }
    }

    throw new Error("Failed to update access mode. Page not found.");
  }

  async function updateSupabasePageDetails(pageId, payload = {}) {
    if (!supabaseClient) {
      throw new Error("Supabase credentials are missing on server.");
    }

    const normalizedPageId = normalizePageId(pageId);
    const normalizedRowId = normalizePageId(payload.fbPageRowId || payload.id);
    if (!normalizedPageId) {
      throw new Error("pageId is required");
    }

    const updatePayload = {
      fb_name: normalizeText(payload.pageName),
      business_type: normalizeText(payload.businessType),
      product_services: normalizeText(payload.productServices),
      product_service_price_ranges: normalizeText(
        payload.productServicePriceRanges
      ),
      website_link: normalizeText(payload.websiteLink),
      shoppe_link: normalizeText(payload.shoppeLink),
      lazada_link: normalizeText(payload.lazadaLink),
      knowledge: normalizeText(payload.knowledge),
      ai_instruction: normalizeText(payload.aiInstruction || payload.ai_instruction),
      workspace_id: normalizeWorkspaceId(payload),
    };

    const matchers = [
      ...(normalizedRowId ? [{ column: "id", value: normalizedRowId }] : []),
      { column: "page_id", value: normalizedPageId },
      { column: "fb_page_id", value: normalizedPageId },
      { column: "id", value: normalizedPageId },
    ];
    let lastError = null;
    const updatedRecordsByPageId = new Map();
    const expectedWorkspaceId = normalizeWorkspaceId(payload);

    for (const matcher of matchers) {
      let patch = { ...updatePayload };

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { data, error } = await supabaseClient
          .from("fb_pages")
          .update(patch)
          .eq(matcher.column, matcher.value)
          .select("*");

        if (!error) {
          if (Array.isArray(data) && data.length > 0) {
            data.forEach((record) => {
              const normalized = getNormalizedSupabaseRecord(record);
              if (normalized.pageId) {
                updatedRecordsByPageId.set(normalized.pageId, normalized);
              }
            });
          }

          break;
        }

        lastError = error;

        const missingColumnMatch =
          /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(
            error.message || ""
          );

        if (
          missingColumnMatch?.[1] &&
          Object.prototype.hasOwnProperty.call(patch, missingColumnMatch[1])
        ) {
          delete patch[missingColumnMatch[1]];
          continue;
        }

        break;
      }
    }

    if (updatedRecordsByPageId.size > 0) {
      const updatedRecords = Array.from(updatedRecordsByPageId.values());
      const matchingWorkspace = expectedWorkspaceId
        ? updatedRecords.find(
            (page) => page.connectedWorkspaceId === expectedWorkspaceId
          )
        : updatedRecords[0];

      return matchingWorkspace || updatedRecords[0];
    }

    const current = await getSupabaseFacebookConfigByPageId(normalizedPageId);

    if (!current?.pageAccessToken) {
      if (lastError?.message) {
        throw new Error(`Failed to update page details: ${lastError.message}`);
      }

      throw new Error("Failed to update page details. Page not found.");
    }

    await saveSupabasePageToken({
      pageId: normalizedPageId,
      pageName: normalizeText(payload.pageName) || current.pageName,
      pageAccessToken: current.pageAccessToken,
      businessType: normalizeText(payload.businessType) || current.businessType,
      productServices:
        normalizeText(payload.productServices) || current.productServices,
      productServicePriceRanges:
        normalizeText(payload.productServicePriceRanges) ||
        current.productServicePriceRanges,
      websiteLink: normalizeText(payload.websiteLink) || current.websiteLink,
      shoppeLink: normalizeText(payload.shoppeLink) || current.shoppeLink,
      lazadaLink: normalizeText(payload.lazadaLink) || current.lazadaLink,
      knowledge: normalizeText(payload.knowledge) || current.knowledge,
      connectedWorkspaceId:
        typeof payload.workspaceId === "string" ||
        typeof payload.connectedWorkspaceId === "string"
          ? normalizeWorkspaceId(payload)
          : current.connectedWorkspaceId,
      accessMode: current.accessMode,
    });

    const updated = await getSupabaseFacebookConfigByPageId(normalizedPageId);
    return updated || current;
  }

  async function deleteSupabasePage(pageId) {
    if (!supabaseClient) {
      throw new Error("Supabase credentials are missing on server.");
    }

    const normalizedPageId = normalizePageId(pageId);
    if (!normalizedPageId) {
      throw new Error("pageId is required");
    }

    const matchColumns = ["id", "page_id", "fb_page_id"];
    let lastError = null;

    for (const column of matchColumns) {
      const { data, error } = await supabaseClient
        .from("fb_pages")
        .delete()
        .eq(column, normalizedPageId)
        .select("*")
        .limit(1);

      if (error) {
        lastError = error;
        continue;
      }

      if (Array.isArray(data) && data.length > 0) {
        return getNormalizedSupabaseRecord(data[0]);
      }
    }

    if (lastError?.message) {
      throw new Error(`Failed to delete page: ${lastError.message}`);
    }

    throw new Error("Failed to delete page. Page not found.");
  }

  async function getFacebookConfig(options = {}) {
    const requestedPageId = normalizePageId(options.pageId);
    const supabaseConfig = requestedPageId
      ? await getSupabaseFacebookConfigByPageId(requestedPageId)
      : await getSupabaseFacebookConfig();
    const isPageSpecificLookup = Boolean(requestedPageId);

    const config = {
      pageId:
        supabaseConfig?.pageId ||
        requestedPageId ||
        runtimeConfig.pageId ||
        env.FB_PAGE_ID ||
        "",
      pageName:
        supabaseConfig?.pageName ||
        (!isPageSpecificLookup
          ? runtimeConfig.pageName || env.FB_PAGE_NAME || ""
          : ""),
      pageAccessToken:
        supabaseConfig?.pageAccessToken ||
        (!isPageSpecificLookup
          ? runtimeConfig.pageAccessToken || env.FB_PAGE_ACCESS_TOKEN || ""
          : ""),
      businessType:
        supabaseConfig?.businessType ||
        (!isPageSpecificLookup
          ? runtimeConfig.businessType || env.FB_BUSINESS_TYPE || ""
          : ""),
      productServices:
        supabaseConfig?.productServices ||
        (!isPageSpecificLookup
          ? runtimeConfig.productServices || env.FB_PRODUCT_SERVICES || ""
          : ""),
      productServicePriceRanges:
        supabaseConfig?.productServicePriceRanges ||
        (!isPageSpecificLookup
          ? runtimeConfig.productServicePriceRanges ||
            env.FB_PRODUCT_SERVICE_PRICE_RANGES ||
            ""
          : ""),
      websiteLink:
        supabaseConfig?.websiteLink ||
        (!isPageSpecificLookup
          ? runtimeConfig.websiteLink || env.FB_WEBSITE_LINK || ""
          : ""),
      shoppeLink:
        supabaseConfig?.shoppeLink ||
        (!isPageSpecificLookup
          ? runtimeConfig.shoppeLink || env.FB_SHOPPE_LINK || ""
          : ""),
      lazadaLink:
        supabaseConfig?.lazadaLink ||
        (!isPageSpecificLookup
          ? runtimeConfig.lazadaLink || env.FB_LAZADA_LINK || ""
          : ""),
      knowledge:
        supabaseConfig?.knowledge ||
        (!isPageSpecificLookup
          ? runtimeConfig.knowledge || env.FB_KNOWLEDGE || ""
          : ""),
      aiInstruction:
        supabaseConfig?.aiInstruction ||
        (!isPageSpecificLookup
          ? runtimeConfig.aiInstruction || env.FB_AI_INSTRUCTION || ""
          : ""),
      connectedWorkspaceId:
        supabaseConfig?.connectedWorkspaceId ||
        (!isPageSpecificLookup ? runtimeConfig.connectedWorkspaceId || "" : ""),
      accessMode: normalizeAccessMode(supabaseConfig?.accessMode),
      verifyToken: runtimeConfig.verifyToken || env.FB_VERIFY_TOKEN || "",
      appSecret: runtimeConfig.appSecret || env.FB_APP_SECRET || "",
      welcomeMessage: supabaseConfig?.welcomeMessage || "",
      welcomeEnabled: supabaseConfig?.welcomeEnabled ?? false,
      defaultReply: supabaseConfig?.defaultReply || "",
    };

    // Load business logic settings from client_facebook_page_settings
    if (supabaseClient && config.connectedWorkspaceId && config.pageId) {
      const { data: settings, error: settingsError } = await supabaseClient
        .from("client_facebook_page_settings")
        .select("*")
        .eq("workspace_id", config.connectedWorkspaceId)
        .eq("page_id", config.pageId)
        .is("archived_at", null)
        .maybeSingle();

      if (!settingsError && settings) {
        config.businessLogicSettings = {
          discoveryFieldMappings: settings.discovery_field_mappings,
          behavioralSignalWeights: settings.behavioral_signal_weights,
          engagementThresholds: settings.engagement_thresholds,
          followUpSequences: settings.follow_up_sequences,
          objectionPatterns: settings.objection_patterns,
          languageDetectionKeywords: settings.language_detection_keywords,
        };

        if (settings.welcome_message && !config.welcomeMessage) {
          config.welcomeMessage = settings.welcome_message;
        }
        if (settings.welcome_enabled !== null && settings.welcome_enabled !== undefined) {
          config.welcomeEnabled = settings.welcome_enabled;
        }
        if (settings.default_reply && !config.defaultReply) {
          config.defaultReply = settings.default_reply;
        }
        if (settings.ai_instruction && !config.aiInstruction) {
          config.aiInstruction = settings.ai_instruction;
        }
        if (settings.knowledge_base) {
          config.knowledge = settings.knowledge_base;
          config.knowledgeBase = settings.knowledge_base;
        }
        if (settings.ai_enabled !== null && settings.ai_enabled !== undefined) {
          config.aiEnabled = settings.ai_enabled !== false;
        }
        if (settings.ai_model) {
          config.aiModel = settings.ai_model;
        }
        if (settings.ai_language) {
          config.aiLanguage = settings.ai_language;
        }
        if (settings.ai_temperature !== null && settings.ai_temperature !== undefined) {
          config.aiTemperature = settings.ai_temperature;
        }
        if (settings.business_hours_enabled !== null && settings.business_hours_enabled !== undefined) {
          config.businessHoursEnabled = settings.business_hours_enabled;
        }
        if (settings.response_delay_seconds !== null && settings.response_delay_seconds !== undefined) {
          config.responseDelaySeconds = settings.response_delay_seconds;
        }
        if (settings.handoff_enabled !== null && settings.handoff_enabled !== undefined) {
          config.handoffEnabled = settings.handoff_enabled;
        }
        if (settings.handoff_keywords) {
          config.handoffKeywords = settings.handoff_keywords;
        }
        if (settings.handoff_message) {
          config.handoffMessage = settings.handoff_message;
        }
        if (settings.auto_tag_conversations !== null && settings.auto_tag_conversations !== undefined) {
          config.autoTagConversations = settings.auto_tag_conversations;
        }
        if (settings.sentiment_analysis !== null && settings.sentiment_analysis !== undefined) {
          config.sentimentAnalysis = settings.sentiment_analysis;
        }
        if (settings.away_message) {
          config.awayMessage = settings.away_message;
        }
        if (settings.page_name) {
          config.pageName = settings.page_name;
        }
        if (settings.business_type) {
          config.businessType = settings.business_type;
        }
        if (settings.products_services) {
          config.productServices = settings.products_services;
        }
        if (settings.product_service_price_ranges) {
          config.productServicePriceRanges = settings.product_service_price_ranges;
        }
        if (settings.website_link) {
          config.websiteLink = settings.website_link;
        }
        if (settings.shoppe_link) {
          config.shoppeLink = settings.shoppe_link;
        }
        if (settings.lazada_link) {
          config.lazadaLink = settings.lazada_link;
        }
        
        if (settings.business_hours_days) {
          try {
            config.businessHoursDays = typeof settings.business_hours_days === "string" 
              ? JSON.parse(settings.business_hours_days) 
              : settings.business_hours_days;
          } catch {
            config.businessHoursDays = {};
          }
        }
        if (settings.business_hours_start) {
          config.businessHoursStart = settings.business_hours_start;
        }
        if (settings.business_hours_end) {
          config.businessHoursEnd = settings.business_hours_end;
        }
        if (settings.business_hours_timezone) {
          config.businessHoursTimezone = settings.business_hours_timezone;
        }
        
        if (settings.conversation_starters) {
          try {
            config.conversationStarters = Array.isArray(settings.conversation_starters)
              ? settings.conversation_starters
              : JSON.parse(settings.conversation_starters);
          } catch {
            config.conversationStarters = [];
          }
        }
      }
    }

    return config;
  }

  function saveRuntimeConfig(payload = {}) {
    const normalizedPageId = normalizePageId(payload.pageId);

    if (normalizedPageId) runtimeConfig.pageId = normalizedPageId;
    if (typeof payload.pageName === "string") {
      runtimeConfig.pageName = normalizeText(payload.pageName);
    }
    if (typeof payload.pageAccessToken === "string") {
      runtimeConfig.pageAccessToken = normalizeText(payload.pageAccessToken);
    }
    if (typeof payload.businessType === "string") {
      runtimeConfig.businessType = normalizeText(payload.businessType);
    }
    if (typeof payload.productServices === "string") {
      runtimeConfig.productServices = normalizeText(payload.productServices);
    }
    if (typeof payload.productServicePriceRanges === "string") {
      runtimeConfig.productServicePriceRanges = normalizeText(
        payload.productServicePriceRanges
      );
    }
    if (typeof payload.websiteLink === "string") {
      runtimeConfig.websiteLink = normalizeText(payload.websiteLink);
    }
    if (typeof payload.shoppeLink === "string") {
      runtimeConfig.shoppeLink = normalizeText(payload.shoppeLink);
    }
    if (typeof payload.lazadaLink === "string") {
      runtimeConfig.lazadaLink = normalizeText(payload.lazadaLink);
    }
    if (typeof payload.knowledge === "string") {
      runtimeConfig.knowledge = normalizeText(payload.knowledge);
    }
    if (typeof payload.aiInstruction === "string") {
      runtimeConfig.aiInstruction = normalizeText(payload.aiInstruction);
    } else if (typeof payload.ai_instruction === "string") {
      runtimeConfig.aiInstruction = normalizeText(payload.ai_instruction);
    }
    if (
      typeof payload.workspaceId === "string" ||
      typeof payload.connectedWorkspaceId === "string"
    ) {
      runtimeConfig.connectedWorkspaceId = normalizeWorkspaceId(payload);
    }
    if (typeof payload.verifyToken === "string") {
      runtimeConfig.verifyToken = normalizeText(payload.verifyToken);
    }
    if (typeof payload.appSecret === "string") {
      runtimeConfig.appSecret = normalizeText(payload.appSecret);
    }
  }

  return {
    getSupabaseFacebookConfig,
    getSupabaseFacebookConfigByPageId,
    getSupabaseFacebookPages,
    getSupabaseFacebookPagesByWorkspaceId,
    saveSupabasePageToken,
    updateSupabasePageAccessMode,
    updateSupabasePageDetails,
    deleteSupabasePage,
    getFacebookConfig,
    saveRuntimeConfig,
  };
}

module.exports = {
  createFacebookConfigService,
  normalizeAccessMode,
  normalizePageId,
  normalizeText,
};
