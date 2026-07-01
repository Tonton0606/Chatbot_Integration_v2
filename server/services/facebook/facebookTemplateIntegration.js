/**
 * Template Integration Utilities
 * Helper functions to integrate rich templates and quick replies into the main sales flow
 */

const logger = require('../../config/logger');

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Determines if rich template should be used based on context
 */
function shouldUseRichTemplate({
  stage = "",
  intentResult = {},
  data = {},
  pageConfig = {},
}) {
  const hasProducts = !!normalizeText(pageConfig.productServices);
  const hasInterest = !!normalizeText(data.pendingLeadData?.productOrServiceWanted);
  const isRecommendation = stage === "recommendation" || stage === "awaiting_cta_choice";

  // Use carousel for product showcase
  if (hasProducts && hasInterest && isRecommendation) {
    return { useTemplate: true, type: "carousel" };
  }

  // Use button template for CTAs
  if (intentResult.intent === "pricing_inquiry" || intentResult.intent === "demo_request") {
    return { useTemplate: true, type: "buttons" };
  }

  return { useTemplate: false, type: "text" };
}

/**
 * Builds the appropriate response format (text, template, or quick replies)
 */
function buildIntegratedResponse({
  textResponse = "",
  template = null,
  quickReplies = null,
  stage = "",
  data = {},
  pageConfig = {},
  compactFacebookReply,
}) {
  const templateDecision = shouldUseRichTemplate({
    stage,
    data,
    pageConfig,
  });

  // If we have a template and should use it
  if (template && templateDecision.useTemplate) {
    return {
      type: "template",
      payload: template,
      text: textResponse || "",
      quickReplies: quickReplies || null,
    };
  }

  // If we have quick replies
  if (quickReplies && quickReplies.quick_replies?.length > 0) {
    return {
      type: "quick_replies",
      text: textResponse || quickReplies.text,
      quickReplies: quickReplies.quick_replies,
    };
  }

  // Default: plain text
  return {
    type: "text",
    text: textResponse,
  };
}

/**
 * Wraps response for Facebook API with proper formatting
 */
function formatForFacebookApi(response = {}) {
  if (!response || !response.type) {
    return { message: response.text || "" };
  }

  switch (response.type) {
    case "template":
      return {
        message: response.text || "",
        attachment: {
          type: "template",
          payload: response.payload,
        },
      };

    case "quick_replies":
      return {
        text: response.text,
        quick_replies: response.quickReplies,
      };

    case "media":
      return {
        attachment: response.attachment,
      };

    default:
      return { message: response.text || "" };
  }
}

/**
 * Determines which quick reply builder to use based on context
 */
function selectQuickReplyStrategy({
  stage = "",
  intentResult = {},
  data = {},
  objectionType = null,
}) {
  // If we just handled an objection, use objection-specific quick replies
  if (objectionType) {
    return { strategy: "objection", objectionType };
  }

  // If in a specific stage, use stage-specific quick replies
  if (stage && ["awaiting_demo_schedule", "pricing_overview", "awaiting_cta_choice"].includes(stage)) {
    return { strategy: "followup", stage };
  }

  // Otherwise, use context-aware quick replies
  return { strategy: "context", data };
}

/**
 * Main integration function - decides what to send based on context
 */
function buildFacebookResponse({
  textResponse = "",
  pageConfig = {},
  data = {},
  stage = "",
  intentResult = {},
  objectionType = null,
  compactFacebookReply,
  buildCardCarousel,
  buildButtonTemplate,
  buildQuickReplies,
  buildContextAwareQuickReplies,
  buildFollowUpQuickReplies,
  buildObjectionQuickReplies,
}) {
  try {
    // Step 1: Determine if we should use rich template
    const templateDecision = shouldUseRichTemplate({
      stage,
      intentResult,
      data,
      pageConfig,
    });

    let template = null;
    let quickReplies = null;

    // Step 2: Build template if needed
    if (templateDecision.useTemplate && buildProductShowcase) {
      if (templateDecision.type === "carousel") {
        // This would need buildProductShowcase to be passed in
        // For now, we'll skip and use quick replies
      } else if (templateDecision.type === "buttons" && buildCtaButtons) {
        const buttons = buildCtaButtons({
          includePricing: true,
          includeDemo: true,
          includeHuman: true,
          maxButtons: 3,
        });
        template = buildButtonTemplate(textResponse, buttons);
      }
    }

    // Step 3: Build quick replies
    const quickReplyStrategy = selectQuickReplyStrategy({
      stage,
      intentResult,
      data,
      objectionType,
    });

    switch (quickReplyStrategy.strategy) {
      case "objection":
        if (buildObjectionQuickReplies) {
          quickReplies = buildObjectionQuickReplies(quickReplyStrategy.objectionType);
        }
        break;

      case "followup":
        if (buildFollowUpQuickReplies) {
          quickReplies = buildFollowUpQuickReplies(quickReplyStrategy.stage, data);
        }
        break;

      case "context":
      default:
        if (buildContextAwareQuickReplies) {
          quickReplies = buildContextAwareQuickReplies(data, pageConfig);
        }
        break;
    }

    // Step 4: Build integrated response
    const response = buildIntegratedResponse({
      textResponse,
      template,
      quickReplies,
      stage,
      data,
      pageConfig,
      compactFacebookReply,
    });

    // Step 5: Format for Facebook API
    return formatForFacebookApi(response);

  } catch (error) {
    logger.error({
      error: error.message,
      stage,
      intent: intentResult?.intent,
    }, "Error building Facebook response");

    // Fallback to plain text
    return { message: textResponse || "" };
  }
}

/**
 * Example integration into sales flow
 */
function integrateIntoSalesFlow({
  incomingText,
  intentResult,
  data,
  stage,
  pageConfig,
  objectionType,
  textResponse,
  compactFacebookReply,
  // Template builders
  buildCardCarousel,
  buildButtonTemplate,
  buildQuickReplies,
  buildContextAwareQuickReplies,
  buildFollowUpQuickReplies,
  buildObjectionQuickReplies,
}) {
  const facebookResponse = buildFacebookResponse({
    textResponse,
    pageConfig,
    data,
    stage,
    intentResult,
    objectionType,
    compactFacebookReply,
    buildCardCarousel,
    buildButtonTemplate,
    buildQuickReplies,
    buildContextAwareQuickReplies,
    buildFollowUpQuickReplies,
    buildObjectionQuickReplies,
  });

  return facebookResponse;
}

/**
 * Build a Facebook Messenger generic template (card carousel)
 * @param {Array} items - Array of { title, subtitle, image_url, buttons }
 * @returns {Object} Facebook API template payload
 */
function buildCardCarousel(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    template_type: "generic",
    elements: items.slice(0, 10).map((item) => ({
      title: item.title || "",
      subtitle: item.subtitle || "",
      image_url: item.image_url || "",
      buttons: Array.isArray(item.buttons)
        ? item.buttons.map((btn) => ({
            type: btn.type || "postback",
            title: btn.title || "",
            payload: btn.payload || "",
            url: btn.url || undefined,
          }))
        : [],
    })),
  };
}

/**
 * Build a Facebook Messenger button template
 * @param {string} text - Message text
 * @param {Array} buttons - Array of { type, title, payload, url }
 * @returns {Object} Facebook API template payload
 */
function buildButtonTemplate(text = "", buttons = []) {
  if (!text && buttons.length === 0) return null;
  return {
    template_type: "button",
    text: text,
    buttons: buttons.slice(0, 3).map((btn) => ({
      type: btn.type || "postback",
      title: btn.title || "",
      payload: btn.payload || "",
      url: btn.url || undefined,
    })),
  };
}

/**
 * Build a Facebook Messenger quick replies payload
 * @param {string} question - The text prompt
 * @param {Array} choices - Array of { label, value }
 * @returns {Object} { text, quick_replies }
 */
function buildQuickReplies(question = "", choices = []) {
  return {
    text: question,
    quick_replies: Array.isArray(choices)
      ? choices.slice(0, 11).map((choice) => ({
          content_type: "text",
          title: choice.label || "",
          payload: choice.value || "",
        }))
      : [],
  };
}

module.exports = {
  buildButtonTemplate,
  buildCardCarousel,
  buildFacebookResponse,
  buildIntegratedResponse,
  buildQuickReplies,
  formatForFacebookApi,
  integrateIntoSalesFlow,
  selectQuickReplyStrategy,
  shouldUseRichTemplate,
};
