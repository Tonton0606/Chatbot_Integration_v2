const logger = require('../../config/logger');
const DEFAULT_CONVERSATION_STATE = "new";
const DEFAULT_CONVERSATION_STATUS = "active";
const DEFAULT_LEAD_STAGE = "new";
const DEFAULT_INTENT = "unknown";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePageId(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function normalizeConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(1, number));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function buildConversationMetadata(existing = {}, patch = {}) {
  const base = existing && typeof existing === "object" ? existing : {};
  const next = patch && typeof patch === "object" ? patch : {};

  return {
    ...base,
    ...next,
  };
}

function createFacebookConversationStateService({ supabaseClient }) {
  if (!supabaseClient) {
    throw new Error("supabaseClient is required for facebookConversationState service.");
  }

  async function getConversation({ workspaceId, pageId, customerPsid }) {
    const normalizedWorkspaceId = normalizeText(workspaceId);
    const normalizedPageId = normalizePageId(pageId);
    const normalizedCustomerPsid = normalizeText(customerPsid);

    if (!normalizedWorkspaceId || !normalizedPageId || !normalizedCustomerPsid) {
      return null;
    }

    const { data, error } = await supabaseClient
      .from("facebook_conversations")
      .select("*")
      .eq("workspace_id", normalizedWorkspaceId)
      .eq("page_id", normalizedPageId)
      .eq("customer_psid", normalizedCustomerPsid)
      .maybeSingle();

    if (error) {
      logger.error({
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        customerPsid: normalizedCustomerPsid,
        message: error.message,
      }, "Failed to get Facebook conversation");
      return null;
    }

    return data || null;
  }

  async function createConversation({
    workspaceId,
    pageId,
    customerPsid,
    customerName = "",
    currentState = DEFAULT_CONVERSATION_STATE,
    leadStage = DEFAULT_LEAD_STAGE,
    intent = DEFAULT_INTENT,
    intentConfidence = 0,
    metadata = {},
  }) {
    const normalizedWorkspaceId = normalizeText(workspaceId);
    const normalizedPageId = normalizePageId(pageId);
    const normalizedCustomerPsid = normalizeText(customerPsid);

    if (!normalizedWorkspaceId || !normalizedPageId || !normalizedCustomerPsid) {
      return null;
    }

    const payload = {
      workspace_id: normalizedWorkspaceId,
      page_id: normalizedPageId,
      customer_psid: normalizedCustomerPsid,
      customer_name: normalizeText(customerName) || null,
      conversation_status: DEFAULT_CONVERSATION_STATUS,
      current_state: normalizeText(currentState) || DEFAULT_CONVERSATION_STATE,
      lead_stage: normalizeText(leadStage) || DEFAULT_LEAD_STAGE,
      intent: normalizeText(intent) || DEFAULT_INTENT,
      intent_confidence: normalizeConfidence(intentConfidence),
      interested_features: [],
      metadata: buildConversationMetadata({}, metadata),
      last_message_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from("facebook_conversations")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return getConversation({
          workspaceId: normalizedWorkspaceId,
          pageId: normalizedPageId,
          customerPsid: normalizedCustomerPsid,
        });
      }

      logger.error({
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        customerPsid: normalizedCustomerPsid,
        message: error.message,
      }, "Failed to create Facebook conversation");
      return null;
    }

    return data;
  }

  async function getOrCreateConversation({
    workspaceId,
    pageId,
    customerPsid,
    customerName = "",
    currentState = DEFAULT_CONVERSATION_STATE,
    leadStage = DEFAULT_LEAD_STAGE,
    intent = DEFAULT_INTENT,
    intentConfidence = 0,
    metadata = {},
  }) {
    const existing = await getConversation({
      workspaceId,
      pageId,
      customerPsid,
    });

    if (existing?.id) {
      return existing;
    }

    return createConversation({
      workspaceId,
      pageId,
      customerPsid,
      customerName,
      currentState,
      leadStage,
      intent,
      intentConfidence,
      metadata,
    });
  }

  async function updateConversation(conversationId, patch = {}) {
    const normalizedConversationId = normalizeText(conversationId);

    if (!normalizedConversationId) {
      return null;
    }

    const updatePayload = {};

    if (patch.conversationStatus !== undefined) {
      updatePayload.conversation_status =
        normalizeText(patch.conversationStatus) || DEFAULT_CONVERSATION_STATUS;
    }

    if (patch.currentState !== undefined) {
      updatePayload.current_state =
        normalizeText(patch.currentState) || DEFAULT_CONVERSATION_STATE;
    }

    if (patch.leadStage !== undefined) {
      updatePayload.lead_stage =
        normalizeText(patch.leadStage) || DEFAULT_LEAD_STAGE;
    }

    if (patch.intent !== undefined) {
      updatePayload.intent = normalizeText(patch.intent) || DEFAULT_INTENT;
    }

    if (patch.intentConfidence !== undefined) {
      updatePayload.intent_confidence = normalizeConfidence(patch.intentConfidence);
    }

    if (patch.businessType !== undefined) {
      updatePayload.business_type = normalizeText(patch.businessType) || null;
    }

    if (patch.dailyInquiries !== undefined) {
      updatePayload.daily_inquiries = normalizeText(patch.dailyInquiries) || null;
    }

    if (patch.interestedFeatures !== undefined) {
      updatePayload.interested_features = normalizeStringArray(patch.interestedFeatures);
    }

    if (patch.clientContactId !== undefined) {
      updatePayload.client_contact_id = normalizeText(patch.clientContactId) || null;
    }

    if (patch.clientLeadId !== undefined) {
      updatePayload.client_lead_id = normalizeText(patch.clientLeadId) || null;
    }

    if (patch.lastCustomerMessage !== undefined) {
      updatePayload.last_customer_message =
        normalizeText(patch.lastCustomerMessage) || null;
    }

    if (patch.lastAiResponse !== undefined) {
      updatePayload.last_ai_response = normalizeText(patch.lastAiResponse) || null;
    }

    if (patch.conversationSummary !== undefined) {
      updatePayload.conversation_summary =
        normalizeText(patch.conversationSummary) || null;
    }

    if (patch.assignedHumanAgent !== undefined) {
      updatePayload.assigned_human_agent =
        normalizeText(patch.assignedHumanAgent) || null;
    }

    if (patch.humanTakeover !== undefined) {
      updatePayload.human_takeover = Boolean(patch.humanTakeover);
    }

    if (patch.metadata !== undefined) {
      updatePayload.metadata = buildConversationMetadata({}, patch.metadata);
    }

    if (patch.lastMessageAt !== undefined) {
      updatePayload.last_message_at =
        normalizeText(patch.lastMessageAt) || new Date().toISOString();
    }

    if (Object.keys(updatePayload).length === 0) {
      return null;
    }

    const { data, error } = await supabaseClient
      .from("facebook_conversations")
      .update(updatePayload)
      .eq("id", normalizedConversationId)
      .select("*")
      .single();

    if (error) {
      logger.error({
        conversationId: normalizedConversationId,
        message: error.message,
      }, "Failed to update Facebook conversation");
      return null;
    }

    return data;
  }

  async function appendConversationMessage({
    conversationId,
    workspaceId,
    pageId,
    customerPsid,
    senderType,
    messageText,
    messageType = "text",
    aiGenerated = false,
    intent = "",
    metadata = {},
  }) {
    const normalizedConversationId = normalizeText(conversationId);
    const normalizedWorkspaceId = normalizeText(workspaceId);
    const normalizedPageId = normalizePageId(pageId);
    const normalizedCustomerPsid = normalizeText(customerPsid);
    const normalizedMessageText = normalizeText(messageText);

    if (
      !normalizedConversationId ||
      !normalizedWorkspaceId ||
      !normalizedPageId ||
      !normalizedCustomerPsid ||
      !normalizedMessageText
    ) {
      return null;
    }

    const payload = {
      conversation_id: normalizedConversationId,
      workspace_id: normalizedWorkspaceId,
      page_id: normalizedPageId,
      customer_psid: normalizedCustomerPsid,
      sender_type: normalizeText(senderType) || "system",
      message_text: normalizedMessageText,
      message_type: normalizeText(messageType) || "text",
      ai_generated: Boolean(aiGenerated),
      intent: normalizeText(intent) || null,
      metadata: buildConversationMetadata({}, metadata),
    };

    const { data, error } = await supabaseClient
      .from("facebook_conversation_messages")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      logger.error({
        conversationId: normalizedConversationId,
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        customerPsid: normalizedCustomerPsid,
        message: error.message,
      }, "Failed to append Facebook conversation message");
      return null;
    }

    return data;
  }

  async function getRecentConversationMessages(conversationId, limit = 12) {
    const normalizedConversationId = normalizeText(conversationId);

    if (!normalizedConversationId) {
      return [];
    }

    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));

    const { data, error } = await supabaseClient
      .from("facebook_conversation_messages")
      .select("*")
      .eq("conversation_id", normalizedConversationId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      logger.error({
        conversationId: normalizedConversationId,
        message: error.message,
      }, "Failed to get recent Facebook conversation messages");
      return [];
    }

    return Array.isArray(data) ? data.reverse() : [];
  }

  function toChatMessages(messages = []) {
    return (Array.isArray(messages) ? messages : [])
      .map((message) => {
        if (!message?.message_text) return null;

        if (message.sender_type === "customer") {
          return {
            role: "user",
            content: message.message_text,
          };
        }

        if (message.sender_type === "ai" || message.sender_type === "page") {
          return {
            role: "assistant",
            content: message.message_text,
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  return {
    appendConversationMessage,
    createConversation,
    getConversation,
    getOrCreateConversation,
    getRecentConversationMessages,
    toChatMessages,
    updateConversation,
  };
}

module.exports = {
  createFacebookConversationStateService,
};
