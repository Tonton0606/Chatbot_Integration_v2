function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAffirmativeReply(text = "") {
  const message = normalizeText(text).toLowerCase();

  return /^(yes|yep|yeah|sure|ok|okay|sige|go|proceed|interested|oo|opo|pwede|please|g|tara)$/i.test(
    message
  );
}

function isNegativeReply(text = "") {
  const message = normalizeText(text).toLowerCase();

  return /^(no|nope|not now|later|hindi|di muna|ayaw|cancel)$/i.test(message);
}

function resolveCtaChoice(text = "") {
  const message = normalizeText(text).toLowerCase();

  if (/^(1|one|demo)$/i.test(message)) return "demo";

  if (/^(2|two|pricing|price|presyo|magkano)$/i.test(message)) {
    return "pricing";
  }

  if (/^(3|three|human|agent|representative|tao|staff)$/i.test(message)) {
    return "human";
  }

  if (
    message.includes("demo") ||
    message.includes("schedule") ||
    message.includes("appointment") ||
    message.includes("meeting")
  ) {
    return "demo";
  }

  if (
    message.includes("price") ||
    message.includes("pricing") ||
    message.includes("presyo") ||
    message.includes("magkano") ||
    message.includes("package") ||
    message.includes("plan")
  ) {
    return "pricing";
  }

  if (
    message.includes("human") ||
    message.includes("agent") ||
    message.includes("representative") ||
    message.includes("tao") ||
    message.includes("staff") ||
    message.includes("kausap")
  ) {
    return "human";
  }

  if (isAffirmativeReply(message)) return "needs_choice";
  if (isNegativeReply(message)) return "not_now";

  return "";
}

function buildLeadContextSentence(data = {}) {
  const parts = [];

  const businessType = normalizeText(data.businessType);
  const productOrServiceWanted = normalizeText(data.productOrServiceWanted);
  const dailyVolume = normalizeText(data.dailyVolume);

  if (businessType) {
    parts.push(`business/need: ${businessType}`);
  }

  if (productOrServiceWanted) {
    parts.push(`interest: ${productOrServiceWanted}`);
  }

  if (dailyVolume) {
    parts.push(`volume: ${dailyVolume}`);
  }

  if (parts.length === 0) {
    return "";
  }

  return `Based on what you shared so far (${parts.join(", ")}), `;
}

function buildCtaChoiceReply({ choice, data = {}, compactFacebookReply }) {
  const contextSentence = buildLeadContextSentence(data);

  if (choice === "demo") {
    return {
      stage: "awaiting_demo_schedule",
      data: {
        ...data,
        ctaChoice: "demo",
      },
      reply: compactFacebookReply(
        `${contextSentence}a demo or consultation is a good next step so the team can recommend the right setup.\n\nPlease send your preferred date/time and contact number so our team can arrange it.`
      ),
    };
  }

  if (choice === "pricing") {
    return {
      stage: "pricing_overview",
      data: {
        ...data,
        ctaChoice: "pricing",
      },
      reply: compactFacebookReply(
        `${contextSentence}pricing depends on the exact product, service, package, quantity, or automation setup needed.\n\nWould you like a demo/consultation first, or would you prefer a human representative to assist you?`
      ),
    };
  }

  if (choice === "human") {
    return {
      stage: "human_handoff",
      data: {
        ...data,
        ctaChoice: "human",
        requestedHuman: true,
      },
      reply: compactFacebookReply(
        "Sure po. I’ll mark this conversation for human assistance. Please send your name, contact number, and main concern so our team can assist you properly."
      ),
    };
  }

  if (choice === "not_now") {
    return {
      stage: "nurture",
      data: {
        ...data,
        ctaChoice: "not_now",
      },
      reply: compactFacebookReply(
        "No problem po. I noted your inquiry. You can message anytime if you want pricing, a demo/consultation, or human assistance."
      ),
    };
  }

  return {
    stage: "awaiting_cta_choice",
    data,
    reply: compactFacebookReply(
      "Sure po. Which would you prefer first?\n\n1. Demo / consultation\n2. Pricing overview\n3. Human representative"
    ),
  };
}

function buildDynamicQuickReplies(options = {}) {
  const {
    question = "What would you like to do?",
    choices = [],
    maxChoices = 4,
  } = options;

  const normalizedQuestion = normalizeText(question);
  const normalizedChoices = Array.isArray(choices) ? choices : [];

  const quickReplies = normalizedChoices.slice(0, maxChoices).map((choice) => {
    const title = normalizeText(choice.label || choice.title || choice.text || "");
    const payload = normalizeText(choice.value || choice.payload || title);
    const imageUrl = normalizeText(choice.imageUrl || choice.image || "");

    const reply = {
      content_type: "text",
      title: title || "Option",
      payload,
    };

    if (imageUrl) {
      reply.image_url = imageUrl;
    }

    return reply;
  });

  return {
    text: normalizedQuestion || "Please choose:",
    quick_replies: quickReplies,
  };
}

function buildContextAwareQuickReplies(data = {}, pageConfig = {}) {
  const choices = [];
  const leadData = data.pendingLeadData || data.confirmedLeadData || {};
  const hasInterest = !!normalizeText(leadData.productOrServiceWanted);
  const hasContact = !!normalizeText(leadData.phone) || !!normalizeText(leadData.email);
  const leadScore = data.leadScore || 0;
  const isHotLead = leadScore >= 70;

  if (isHotLead && !hasContact) {
    choices.push({
      label: "📞 Share Contact",
      value: "share_contact",
    });
  }

  if (hasInterest) {
    choices.push({
      label: "💰 Get Pricing",
      value: "pricing_inquiry",
    });
    choices.push({
      label: "📅 Book Demo",
      value: "demo_request",
    });
  }

  choices.push({
    label: "💬 More Info",
    value: "more_info",
  });

  if (!hasContact) {
    choices.push({
      label: "👤 Talk to Human",
      value: "human_request",
    });
  }

  return buildDynamicQuickReplies({
    question: "What would you like to do next?",
    choices,
    maxChoices: 4,
  });
}

function buildFollowUpQuickReplies(stage = "", data = {}) {
  const choices = [];

  switch (stage) {
    case "awaiting_demo_schedule":
      choices.push(
        {
          label: "📅 Tomorrow",
          value: "schedule_tomorrow",
        },
        {
          label: "📅 This Week",
          value: "schedule_this_week",
        },
        {
          label: "📅 Next Week",
          value: "schedule_next_week",
        }
      );
      break;

    case "pricing_overview":
      choices.push(
        {
          label: "📅 Book Demo",
          value: "demo_request",
        },
        {
          label: "👤 Talk to Sales",
          value: "human_request",
        },
        {
          label: "📧 Email Me Details",
          value: "email_details",
        }
      );
      break;

    case "awaiting_cta_choice":
    default:
      choices.push(
        {
          label: "💰 Get Pricing",
          value: "pricing_inquiry",
        },
        {
          label: "📅 Book Demo",
          value: "demo_request",
        },
        {
          label: "👤 Talk to Human",
          value: "human_request",
        }
      );
      break;
  }

  return buildDynamicQuickReplies({
    question: "How would you like to proceed?",
    choices,
    maxChoices: 3,
  });
}

function buildObjectionQuickReplies(objectionType = "") {
  const choices = [];

  switch (objectionType) {
    case "price_objection":
      choices.push(
        {
          label: "💳 See Payment Plans",
          value: "payment_plans",
        },
        {
          label: "📅 Book Free Consultation",
          value: "demo_request",
        },
        {
          label: "📧 Send Detailed Quote",
          value: "send_quote",
        }
      );
      break;

    case "trust_objection":
      choices.push(
        {
          label: "⭐ See Testimonials",
          value: "testimonials",
        },
        {
          label: "📅 Book Demo",
          value: "demo_request",
        },
        {
          label: "👤 Talk to Existing Client",
          value: "client_reference",
        }
      );
      break;

    case "stall_objection":
      choices.push(
        {
          label: "⏰ Remind Me Later",
          value: "remind_later",
        },
        {
          label: "📅 Quick Demo",
          value: "demo_request",
        },
        {
          label: "📧 Send Info",
          value: "send_details",
        }
      );
      break;

    default:
      choices.push(
        {
          label: "📅 Book Demo",
          value: "demo_request",
        },
        {
          label: "💰 Get Pricing",
          value: "pricing_inquiry",
        },
        {
          label: "👤 Talk to Human",
          value: "human_request",
        }
      );
      break;
  }

  return buildDynamicQuickReplies({
    question: "How can I help?",
    choices,
    maxChoices: 3,
  });
}

module.exports = {
  buildCtaChoiceReply,
  buildContextAwareQuickReplies,
  buildDynamicQuickReplies,
  buildFollowUpQuickReplies,
  buildObjectionQuickReplies,
  isAffirmativeReply,
  isNegativeReply,
  resolveCtaChoice,
};
