const DEFAULT_FLOW_TTL_MS = 30 * 60 * 1000;

function createFacebookFlowStateService({
  ttlMs = DEFAULT_FLOW_TTL_MS,
  memory = new Map(),
} = {}) {
  function getFlowKey(pageId, senderId) {
    return `${pageId || "default"}:${senderId || "unknown"}`;
  }

  function getFlowState(pageId, senderId) {
    const key = getFlowKey(pageId, senderId);
    const cached = memory.get(key);

    if (!cached) {
      return {
        stage: "new",
        data: {},
      };
    }

    if (Date.now() - cached.updatedAt > ttlMs) {
      memory.delete(key);

      return {
        stage: "new",
        data: {},
      };
    }

    return {
      stage: cached.stage || "new",
      data: cached.data || {},
    };
  }

  function setFlowState(pageId, senderId, state = {}) {
    const key = getFlowKey(pageId, senderId);

    memory.set(key, {
      updatedAt: Date.now(),
      stage: state.stage || "new",
      data: state.data || {},
    });

    return getFlowState(pageId, senderId);
  }

  function clearFlowState(pageId, senderId) {
    memory.delete(getFlowKey(pageId, senderId));
  }

  function hydrateFlowStateFromConversation(pageId, senderId, conversation) {
    if (!conversation?.id) {
      return getFlowState(pageId, senderId);
    }

    const metadata =
      conversation.metadata && typeof conversation.metadata === "object"
        ? conversation.metadata
        : {};

    const flowData =
      metadata.flowData && typeof metadata.flowData === "object"
        ? metadata.flowData
        : {};

    const state = {
      stage: conversation.current_state || "new",
      data: {
        ...flowData,
        ...(conversation.business_type
          ? { businessType: conversation.business_type }
          : {}),
        ...(conversation.daily_inquiries
          ? { dailyVolume: conversation.daily_inquiries }
          : {}),
        ...(Array.isArray(conversation.interested_features) &&
        conversation.interested_features.length
          ? { interestedFeatures: conversation.interested_features }
          : {}),
      },
    };

    return setFlowState(pageId, senderId, state);
  }

  return {
    clearFlowState,
    getFlowKey,
    getFlowState,
    hydrateFlowStateFromConversation,
    setFlowState,
  };
}

module.exports = {
  createFacebookFlowStateService,
};
