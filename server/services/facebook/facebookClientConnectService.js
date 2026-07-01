function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePageId(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return [];
}

function normalizeStatus(value, allowed, fallback) {
  const normalized = normalizeText(value).toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeFallbackMode(value) {
  return normalizeStatus(
    value,
    ["booking_only", "handoff_only", "booking_and_handoff", "safe_reply_only"],
    "booking_and_handoff"
  );
}

function normalizeFaqStatus(value) {
  return normalizeStatus(value, ["active", "draft", "archived"], "active");
}

function normalizeSuggestionStatus(value) {
  return normalizeStatus(
    value,
    ["pending", "approved", "rejected", "archived"],
    "pending"
  );
}

function requireWorkspaceId(workspaceId) {
  const normalized = normalizeText(workspaceId);

  if (!normalized) {
    throw new Error("workspaceId is required");
  }

  return normalized;
}

function requireId(id, label = "id") {
  const normalized = normalizeText(id);

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function mapFaq(record = {}) {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    question: record.question || "",
    answer: record.answer || "",
    category: record.category || "",
    keywords: Array.isArray(record.keywords) ? record.keywords : [],
    language: record.language || "auto",
    status: record.status || "active",
    usageCount: Number(record.usage_count || 0),
    lastUsedAt: record.last_used_at || null,
    createdBy: record.created_by || null,
    updatedBy: record.updated_by || null,
    archivedBy: record.archived_by || null,
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
    archivedAt: record.archived_at || null,
  };
}

function mapSuggestion(record = {}) {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    question: record.question || "",
    suggestedAnswer: record.suggested_answer || "",
    source: record.source || "facebook_ai",
    sourceConversationId: record.source_conversation_id || null,
    frequency: Number(record.frequency || 0),
    confidence: Number(record.confidence || 0),
    status: record.status || "pending",
    reviewedBy: record.reviewed_by || null,
    reviewedAt: record.reviewed_at || null,
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
    archivedAt: record.archived_at || null,
    archivedBy: record.archived_by || null,
  };
}

function mapPageSettings(record = {}) {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    pageId: record.page_id || "",
    pageName: record.page_name || "Facebook Page",
    businessType: record.business_type || "",
    businessDescription: record.business_description || "",
    productsServices: record.products_services || "",
    productServicePriceRanges: record.product_service_price_ranges || "",
    knowledgeBase: record.knowledge_base || "",
    websiteLink: record.website_link || "",
    bookingLink: record.booking_link || "",
    shoppeLink: record.shoppe_link || "",
    lazadaLink: record.lazada_link || "",
    fallbackMode: record.fallback_mode || "booking_and_handoff",
    aiEnabled: record.ai_enabled !== false,
    faqEnabled: record.faq_enabled !== false,
    suggestionsEnabled: record.suggestions_enabled !== false,
    humanHandoffEnabled: record.human_handoff_enabled !== false,
    ownerNotificationEnabled: record.owner_notification_enabled !== false,
    aiInstruction: record.ai_instruction || "",
    commentAutomationEnabled: record.comment_automation_enabled === true,
    commentReplyTemplate: record.comment_reply_template || "",
    commentKeywordFilter: record.comment_keyword_filter || "",
    welcomeMessage: record.welcome_message || "",
    welcomeEnabled: record.welcome_enabled ?? false,
    defaultReply: record.default_reply || "",
    conversationStarters: (() => {
      try {
        return Array.isArray(record.conversation_starters)
          ? record.conversation_starters
          : JSON.parse(record.conversation_starters || "[]");
      } catch {
        return [];
      }
    })(),
    businessHoursEnabled: record.business_hours_enabled ?? false,
    businessHoursStart: record.business_hours_start || "09:00",
    businessHoursEnd: record.business_hours_end || "18:00",
    businessHoursTimezone: record.business_hours_timezone || "Asia/Manila",
    businessHoursDays: (() => {
      try {
        return Array.isArray(record.business_hours_days)
          ? record.business_hours_days
          : JSON.parse(record.business_hours_days || "[1,2,3,4,5]");
      } catch {
        return [1, 2, 3, 4, 5];
      }
    })(),
    awayMessage: record.away_message || "",
    responseDelaySeconds: record.response_delay_seconds ?? 0,
    handoffEnabled: record.handoff_enabled ?? false,
    handoffMessage: record.handoff_message || "",
    handoffKeywords: (() => {
      try {
        return Array.isArray(record.handoff_keywords)
          ? record.handoff_keywords
          : JSON.parse(record.handoff_keywords || "[]");
      } catch {
        return [];
      }
    })(),
    aiModel: record.ai_model || "llama-3.3-70b-versatile",
    aiLanguage: record.ai_language || "en",
    aiTemperature: Number(record.ai_temperature ?? 0.7),
    autoTagConversations: record.auto_tag_conversations ?? true,
    sentimentAnalysis: record.sentiment_analysis ?? false,
    createdBy: record.created_by || null,
    updatedBy: record.updated_by || null,
    archivedBy: record.archived_by || null,
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
    archivedAt: record.archived_at || null,
  };
}

function hasConfiguredValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function scorePageSettings(record = {}, pageId = "") {
  const normalizedRecordPageId = normalizePageId(record.page_id);
  let score = normalizedRecordPageId && normalizedRecordPageId === pageId ? 40 : 0;

  if (record.ai_enabled === true) score += 35;
  if (record.welcome_enabled === true) score += 35;
  if (hasConfiguredValue(record.knowledge_base)) score += 30;
  if (hasConfiguredValue(record.ai_instruction)) score += 25;
  if (hasConfiguredValue(record.welcome_message)) score += 20;
  if (hasConfiguredValue(record.page_name)) score += 5;

  return score;
}

function selectBestPageSettings(records = [], pageId = "") {
  const normalizedPageId = normalizePageId(pageId);
  const exactRecords = records.filter(
    (record) => normalizePageId(record.page_id) === normalizedPageId
  );
  const candidates = exactRecords.length ? exactRecords : records;

  return candidates
    .slice()
    .sort((a, b) => {
      const scoreDelta =
        scorePageSettings(b, normalizedPageId) -
        scorePageSettings(a, normalizedPageId);

      if (scoreDelta !== 0) return scoreDelta;

      return (
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      );
    })[0] || null;
}

function mapAnalytics(record = {}) {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    pageId: record.page_id || "",
    snapshotDate: record.snapshot_date || null,
    totalConversations: Number(record.total_conversations || 0),
    qualifiedLeads: Number(record.qualified_leads || 0),
    contactsCreated: Number(record.contacts_created || 0),
    leadsCreated: Number(record.leads_created || 0),
    faqHits: Number(record.faq_hits || 0),
    knowledgeHits: Number(record.knowledge_hits || 0),
    unansweredQuestions: Number(record.unanswered_questions || 0),
    humanHandoffs: Number(record.human_handoffs || 0),
    bookingCtaSent: Number(record.booking_cta_sent || 0),
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
  };
}

function buildDashboardSummary({
  analytics = [],
  faqs = [],
  suggestions = [],
  conversations = [],
}) {
  const totals = analytics.reduce(
    (acc, item) => ({
      totalConversations:
        acc.totalConversations + Number(item.total_conversations || 0),
      qualifiedLeads: acc.qualifiedLeads + Number(item.qualified_leads || 0),
      contactsCreated: acc.contactsCreated + Number(item.contacts_created || 0),
      leadsCreated: acc.leadsCreated + Number(item.leads_created || 0),
      faqHits: acc.faqHits + Number(item.faq_hits || 0),
      knowledgeHits: acc.knowledgeHits + Number(item.knowledge_hits || 0),
      unansweredQuestions:
        acc.unansweredQuestions + Number(item.unanswered_questions || 0),
      humanHandoffs: acc.humanHandoffs + Number(item.human_handoffs || 0),
      bookingCtaSent: acc.bookingCtaSent + Number(item.booking_cta_sent || 0),
    }),
    {
      totalConversations: 0,
      qualifiedLeads: 0,
      contactsCreated: 0,
      leadsCreated: 0,
      faqHits: 0,
      knowledgeHits: 0,
      unansweredQuestions: 0,
      humanHandoffs: 0,
      bookingCtaSent: 0,
    }
  );

  const actualConversationCount = conversations.length;

  return {
    ...totals,
    totalConversations: Math.max(totals.totalConversations, actualConversationCount),
    activeFaqs: faqs.filter((faq) => faq.status === "active").length,
    draftFaqs: faqs.filter((faq) => faq.status === "draft").length,
    pendingSuggestions: suggestions.filter(
      (suggestion) => suggestion.status === "pending"
    ).length,
  };
}

function createFacebookClientConnectService({ supabaseClient }) {
  if (!supabaseClient) {
    throw new Error("supabaseClient is required for facebookClientConnectService.");
  }

  async function listFaqs({ workspaceId, status = "", search = "" }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedStatus = normalizeText(status);
    const normalizedSearch = normalizeText(search);

    let query = supabaseClient
      .from("client_faqs")
      .select("*")
      .eq("workspace_id", normalizedWorkspaceId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    if (normalizedStatus) {
      query = query.eq("status", normalizeFaqStatus(normalizedStatus));
    }

    if (normalizedSearch) {
      query = query.or(
        `question.ilike.%${normalizedSearch}%,answer.ilike.%${normalizedSearch}%,category.ilike.%${normalizedSearch}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to load Facebook FAQs.");
    }

    return Array.isArray(data) ? data.map(mapFaq) : [];
  }

  async function createFaq({ workspaceId, payload = {}, userId = null }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const question = normalizeText(payload.question);
    const answer = normalizeText(payload.answer);

    if (!question) {
      throw new Error("Question is required.");
    }

    if (!answer) {
      throw new Error("Answer is required.");
    }

    const { data, error } = await supabaseClient
      .from("client_faqs")
      .insert({
        workspace_id: normalizedWorkspaceId,
        question,
        answer,
        category: normalizeText(payload.category) || null,
        keywords: normalizeStringArray(payload.keywords),
        language: normalizeText(payload.language) || "auto",
        status: normalizeFaqStatus(payload.status),
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create Facebook FAQ.");
    }

    return mapFaq(data);
  }

  async function updateFaq({ workspaceId, faqId, payload = {}, userId = null }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedFaqId = requireId(faqId, "faqId");

    const updatePayload = {
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    };

    if (payload.question !== undefined) {
      const question = normalizeText(payload.question);
      if (!question) throw new Error("Question is required.");
      updatePayload.question = question;
    }

    if (payload.answer !== undefined) {
      const answer = normalizeText(payload.answer);
      if (!answer) throw new Error("Answer is required.");
      updatePayload.answer = answer;
    }

    if (payload.category !== undefined) {
      updatePayload.category = normalizeText(payload.category) || null;
    }

    if (payload.keywords !== undefined) {
      updatePayload.keywords = normalizeStringArray(payload.keywords);
    }

    if (payload.language !== undefined) {
      updatePayload.language = normalizeText(payload.language) || "auto";
    }

    if (payload.status !== undefined) {
      updatePayload.status = normalizeFaqStatus(payload.status);
    }

    const { data, error } = await supabaseClient
      .from("client_faqs")
      .update(updatePayload)
      .eq("id", normalizedFaqId)
      .eq("workspace_id", normalizedWorkspaceId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update Facebook FAQ.");
    }

    return mapFaq(data);
  }

  async function archiveFaq({ workspaceId, faqId, userId = null }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedFaqId = requireId(faqId, "faqId");

    const { data, error } = await supabaseClient
      .from("client_faqs")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
        archived_by: userId || null,
        updated_at: new Date().toISOString(),
        updated_by: userId || null,
      })
      .eq("id", normalizedFaqId)
      .eq("workspace_id", normalizedWorkspaceId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to archive Facebook FAQ.");
    }

    return mapFaq(data);
  }

  async function listSuggestions({ workspaceId, status = "pending" }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedStatus = normalizeText(status);

    let query = supabaseClient
      .from("client_faq_suggestions")
      .select("*")
      .eq("workspace_id", normalizedWorkspaceId)
      .is("archived_at", null)
      .order("frequency", { ascending: false })
      .order("updated_at", { ascending: false });

    if (normalizedStatus) {
      query = query.eq("status", normalizeSuggestionStatus(normalizedStatus));
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to load FAQ suggestions.");
    }

    return Array.isArray(data) ? data.map(mapSuggestion) : [];
  }

  async function approveSuggestion({
    workspaceId,
    suggestionId,
    answer = "",
    category = "",
    keywords = [],
    userId = null,
  }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedSuggestionId = requireId(suggestionId, "suggestionId");

    const { data: suggestion, error: suggestionError } = await supabaseClient
      .from("client_faq_suggestions")
      .select("*")
      .eq("id", normalizedSuggestionId)
      .eq("workspace_id", normalizedWorkspaceId)
      .maybeSingle();

    if (suggestionError || !suggestion?.id) {
      throw new Error(
        suggestionError?.message || "FAQ suggestion was not found."
      );
    }

    const finalAnswer =
      normalizeText(answer) || normalizeText(suggestion.suggested_answer);

    if (!finalAnswer) {
      throw new Error("Answer is required before approving a suggestion.");
    }

    const createdFaq = await createFaq({
      workspaceId: normalizedWorkspaceId,
      payload: {
        question: suggestion.question,
        answer: finalAnswer,
        category: normalizeText(category) || "Suggested FAQ",
        keywords,
        language: "auto",
        status: "active",
      },
      userId,
    });

    const { data: updatedSuggestion, error: updateError } = await supabaseClient
      .from("client_faq_suggestions")
      .update({
        suggested_answer: finalAnswer,
        status: "approved",
        reviewed_by: userId || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", normalizedSuggestionId)
      .eq("workspace_id", normalizedWorkspaceId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        updateError.message || "FAQ was created but suggestion approval failed."
      );
    }

    return {
      faq: createdFaq,
      suggestion: mapSuggestion(updatedSuggestion),
    };
  }

  async function rejectSuggestion({ workspaceId, suggestionId, userId = null }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedSuggestionId = requireId(suggestionId, "suggestionId");

    const { data, error } = await supabaseClient
      .from("client_faq_suggestions")
      .update({
        status: "rejected",
        reviewed_by: userId || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", normalizedSuggestionId)
      .eq("workspace_id", normalizedWorkspaceId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to reject FAQ suggestion.");
    }

    return mapSuggestion(data);
  }

  async function archiveSuggestion({
    workspaceId,
    suggestionId,
    userId = null,
  }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedSuggestionId = requireId(suggestionId, "suggestionId");

    const { data, error } = await supabaseClient
      .from("client_faq_suggestions")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
        archived_by: userId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", normalizedSuggestionId)
      .eq("workspace_id", normalizedWorkspaceId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Failed to archive FAQ suggestion.");
    }

    return mapSuggestion(data);
  }

  async function getPageSettings({ workspaceId, pageId }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);

    if (!normalizedPageId) {
      return null;
    }

    const { data, error } = await supabaseClient
      .from("client_facebook_page_settings")
      .select("*")
      .eq("workspace_id", normalizedWorkspaceId)
      .eq("page_id", normalizedPageId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(
        error.message || "Failed to load Facebook page knowledge settings."
      );
    }

    let records = Array.isArray(data) ? data : [];

    if (!records.length) {
      const { data: pageRecords, error: pageError } = await supabaseClient
        .from("client_facebook_page_settings")
        .select("*")
        .eq("page_id", normalizedPageId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (pageError) {
        throw new Error(
          pageError.message || "Failed to load Facebook page knowledge settings."
        );
      }

      records = Array.isArray(pageRecords) ? pageRecords : [];
    }

    if (!records.length) {
      return null;
    }

    const selected = selectBestPageSettings(records, normalizedPageId);

    return selected ? mapPageSettings(selected) : null;
  }

  async function upsertPageSettings({
    workspaceId,
    pageId,
    payload = {},
    userId = null,
  }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId || payload.pageId);

    if (!normalizedPageId) {
      throw new Error("pageId is required.");
    }

    const record = {
      workspace_id: normalizedWorkspaceId,
      page_id: normalizedPageId,
      page_name: normalizeText(payload.pageName) || "Facebook Page",
      business_type: normalizeText(payload.businessType) || null,
      business_description: normalizeText(payload.businessDescription) || null,
      products_services: normalizeText(payload.productsServices) || null,
      product_service_price_ranges:
        normalizeText(payload.productServicePriceRanges) || null,
      knowledge_base: normalizeText(payload.knowledgeBase) || null,
      website_link: normalizeText(payload.websiteLink) || null,
      booking_link: normalizeText(payload.bookingLink) || null,
      shoppe_link: normalizeText(payload.shoppeLink) || null,
      lazada_link: normalizeText(payload.lazadaLink) || null,
      fallback_mode: normalizeFallbackMode(payload.fallbackMode),
      ai_enabled: payload.aiEnabled !== false,
      faq_enabled: payload.faqEnabled !== false,
      suggestions_enabled: payload.suggestionsEnabled !== false,
      human_handoff_enabled: payload.humanHandoffEnabled !== false,
      owner_notification_enabled: payload.ownerNotificationEnabled !== false,
      ai_instruction: normalizeText(payload.aiInstruction) || null,
      comment_automation_enabled: payload.commentAutomationEnabled === true,
      comment_reply_template: normalizeText(payload.commentReplyTemplate) || null,
      comment_keyword_filter: normalizeText(payload.commentKeywordFilter) || null,
      welcome_message: normalizeText(payload.welcomeMessage) || null,
      welcome_enabled: payload.welcomeEnabled === true,
      default_reply: normalizeText(payload.defaultReply) || null,
      conversation_starters: Array.isArray(payload.conversationStarters)
        ? JSON.stringify(payload.conversationStarters)
        : normalizeText(payload.conversationStarters) || null,
      business_hours_enabled: payload.businessHoursEnabled === true,
      business_hours_start: normalizeText(payload.businessHoursStart) || "09:00",
      business_hours_end: normalizeText(payload.businessHoursEnd) || "18:00",
      business_hours_timezone: normalizeText(payload.businessHoursTimezone) || "Asia/Manila",
      business_hours_days: typeof payload.businessHoursDays === "object" && payload.businessHoursDays !== null
        ? JSON.stringify(payload.businessHoursDays)
        : null,
      away_message: normalizeText(payload.awayMessage) || null,
      response_delay_seconds: Number.isFinite(Number(payload.responseDelaySeconds))
        ? Math.max(0, Number(payload.responseDelaySeconds))
        : 0,
      handoff_enabled: payload.handoffEnabled === true,
      handoff_message: normalizeText(payload.handoffMessage) || null,
      handoff_keywords: Array.isArray(payload.handoffKeywords)
        ? JSON.stringify(payload.handoffKeywords)
        : null,
      ai_model: normalizeText(payload.aiModel) || "llama-3.3-70b-versatile",
      ai_language: normalizeText(payload.aiLanguage) || "en",
      ai_temperature: Number(payload.aiTemperature) || 0.7,
      auto_tag_conversations: payload.autoTagConversations !== false,
      sentiment_analysis: payload.sentimentAnalysis === true,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existingRecords, error: existingError } = await supabaseClient
      .from("client_facebook_page_settings")
      .select("*")
      .eq("page_id", normalizedPageId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(25);

    if (existingError) {
      throw new Error(
        existingError.message || "Failed to check Facebook page settings."
      );
    }

    const existing = Array.isArray(existingRecords) && existingRecords.length
      ? selectBestPageSettings(existingRecords, normalizedPageId)
      : null;

    if (existing?.id) {
      const { data, error } = await supabaseClient
        .from("client_facebook_page_settings")
        .update(record)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        throw new Error(
          error.message || "Failed to update Facebook page settings."
        );
      }

      return mapPageSettings(data);
    }

    const { data, error } = await supabaseClient
      .from("client_facebook_page_settings")
      .insert({
        ...record,
        created_by: userId || null,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(
        error.message || "Failed to create Facebook page settings."
      );
    }

    return mapPageSettings(data);
  }

  async function listAnalytics({ workspaceId, pageId = "", limit = 30 }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);
    const safeLimit = Math.min(365, Math.max(1, Number(limit) || 30));

    let query = supabaseClient
      .from("client_facebook_analytics")
      .select("*")
      .eq("workspace_id", normalizedWorkspaceId)
      .order("snapshot_date", { ascending: false })
      .limit(safeLimit);

    if (normalizedPageId) {
      query = query.eq("page_id", normalizedPageId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to load Facebook analytics.");
    }

    return Array.isArray(data) ? data.map(mapAnalytics) : [];
  }

  async function listConversations({
    workspaceId,
    pageId = "",
    limit = 50,
  }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

    let query = supabaseClient
      .from("facebook_conversations")
      .select("*")
      .eq("workspace_id", normalizedWorkspaceId)
      .order("updated_at", { ascending: false })
      .limit(safeLimit);

    if (normalizedPageId) {
      query = query.eq("page_id", normalizedPageId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to load Facebook conversations.");
    }

    return Array.isArray(data) ? data : [];
  }

  async function getDashboard({ workspaceId, pageId = "" }) {
    const normalizedWorkspaceId = requireWorkspaceId(workspaceId);
    const normalizedPageId = normalizePageId(pageId);

    const [faqs, suggestions, analytics, conversations, pageSettings] =
      await Promise.all([
        listFaqs({ workspaceId: normalizedWorkspaceId }),
        listSuggestions({ workspaceId: normalizedWorkspaceId, status: "" }),
        listAnalytics({
          workspaceId: normalizedWorkspaceId,
          pageId: normalizedPageId,
          limit: 30,
        }),
        listConversations({
          workspaceId: normalizedWorkspaceId,
          pageId: normalizedPageId,
          limit: 50,
        }),
        normalizedPageId
          ? getPageSettings({
              workspaceId: normalizedWorkspaceId,
              pageId: normalizedPageId,
            })
          : Promise.resolve(null),
      ]);

    return {
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
      summary: buildDashboardSummary({
        analytics: analytics.map((item) => ({
          total_conversations: item.totalConversations,
          qualified_leads: item.qualifiedLeads,
          contacts_created: item.contactsCreated,
          leads_created: item.leadsCreated,
          faq_hits: item.faqHits,
          knowledge_hits: item.knowledgeHits,
          unanswered_questions: item.unansweredQuestions,
          human_handoffs: item.humanHandoffs,
          booking_cta_sent: item.bookingCtaSent,
        })),
        faqs,
        suggestions,
        conversations,
      }),
      faqs,
      suggestions,
      analytics,
      conversations,
      pageSettings,
    };
  }

  return {
    archiveFaq,
    archiveSuggestion,
    approveSuggestion,
    createFaq,
    getDashboard,
    getPageSettings,
    listAnalytics,
    listConversations,
    listFaqs,
    listSuggestions,
    rejectSuggestion,
    updateFaq,
    upsertPageSettings,
  };
}

module.exports = {
  createFacebookClientConnectService,
};
