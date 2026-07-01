function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getPageName(pageConfig = {}) {
  return normalizeText(pageConfig.pageName) || "this page";
}

function getPageOfferSummary(pageConfig = {}, pageIntelligence = {}) {
  return (
    normalizeText(pageIntelligence.businessSummary) ||
    normalizeText(pageConfig.productServices) ||
    normalizeText(pageConfig.knowledge) ||
    normalizeText(pageConfig.businessType) ||
    getPageName(pageConfig)
  );
}

function getPageProductsOrServices(pageConfig = {}) {
  return normalizeText(pageConfig.productServices);
}

function getPagePriceRanges(pageConfig = {}) {
  return normalizeText(pageConfig.productServicePriceRanges);
}

function getPageLinks(pageConfig = {}) {
  return [
    pageConfig.websiteLink
      ? `Website: ${normalizeText(pageConfig.websiteLink)}`
      : "",
    pageConfig.shoppeLink
      ? `Shopee: ${normalizeText(pageConfig.shoppeLink)}`
      : "",
    pageConfig.lazadaLink
      ? `Lazada: ${normalizeText(pageConfig.lazadaLink)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const { getEffectiveLeadData } = require("./facebookLeadConfirmation");

function buildKnownCustomerContext(data = {}) {
  const lead = getEffectiveLeadData(data);

  return [
    lead.productOrServiceWanted
      ? `Interest: ${lead.productOrServiceWanted}`
      : "",
    lead.businessType ? `Business/Need: ${lead.businessType}` : "",
    lead.problemEncountered ? `Concern: ${lead.problemEncountered}` : "",
    lead.desiredSolution ? `Desired result: ${lead.desiredSolution}` : "",
    lead.dailyVolume ? `Volume: ${lead.dailyVolume}` : "",
    lead.budgetOrQuantity ? `Budget/Quantity: ${lead.budgetOrQuantity}` : "",
    lead.preferredSchedule
      ? `Preferred schedule: ${lead.preferredSchedule}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const { isFilipinoStyle } = require("./facebookReplyUtils");

function getNextQuestion({
  field,
  pageConfig = {},
  pageIntelligence = {},
  qualification = {},
}) {
  const qualificationQuestion = normalizeText(qualification.nextBestQuestion);
  if (qualificationQuestion) return qualificationQuestion;

  const pageName = getPageName(pageConfig);
  const offeringType = normalizeText(pageIntelligence.offeringType);
  const userText = pageIntelligence?.rawCustomerMessage || "";
  const isFilipino = isFilipinoStyle(userText);

  if (field === "productOrServiceWanted") {
    if (isFilipino) {
      if (offeringType === "product") {
        return `Ano pong product ng ${pageName} ang trip niyo or gusto ninyong malaman? 😊`;
      }
      if (offeringType === "service") {
        return `Anong service po sa ${pageName} ang hinahanap niyo ngayon? Para ma-explain ko po. 😊`;
      }
      return `Ano pong product or service ng ${pageName} ang interesado kayong malaman? 😊`;
    } else {
      if (offeringType === "product") {
        return `Which product from ${pageName} are you interested in? I'd love to share the details! 😊`;
      }
      if (offeringType === "service") {
        return `What service from ${pageName} are you looking for today? 😊`;
      }
      return `What product or service from ${pageName} are you interested in? 😊`;
    }
  }

  if (field === "businessType") {
    return isFilipino
      ? "May I ask po kung ano ang business niyo or saan niyo balak gamitin? Para ma-guide ko po kayo nang maayos. 😊"
      : "May I know what type of business or specific need you have? So I can tailor my recommendations for you. 😊";
  }

  if (field === "problemEncountered") {
    return isFilipino
      ? "Ano po palang challenges or concerns ang kinakaharap niyo ngayon na gusto nating masolusyunan? 😊"
      : "What specific challenge or problem are you trying to solve right now? 😊";
  }

  if (field === "desiredSolution") {
    return isFilipino
      ? "Ano pong specific result or goals ang gusto ninyong ma-achieve? 😊"
      : "What kind of outcome or goal would you like to achieve? 😊";
  }

  if (field === "dailyVolume") {
    return isFilipino
      ? "Mga ilan po palang inquiries, orders, or customer messages ang natatanggap ninyo sa isang araw? Para tantya natin ang setup. 😊"
      : "Around how many inquiries, orders, bookings, or messages do you usually receive per day? This helps us estimate the best setup for you. 😊";
  }

  if (field === "customerName") {
    return isFilipino
      ? "Puwede ko po bang makuha ang pangalan niyo para mas maging personalized ang usapan natin at ma-assist kayo nang maayos? 😊"
      : "May I get your name so I know who I'm talking to and how to address you properly? 😊";
  }

  if (field === "phone") {
    return isFilipino
      ? "Ano pong contact number ang puwedeng gamitin ng team namin para matawagan or ma-text kayo para sa follow-up? 😊"
      : "What contact number can our team use to call or text you for follow-up? 😊";
  }

  if (field === "email") {
    return isFilipino
      ? "Hingi na rin po sana ako ng email address niyo kung okay lang? Pero puwede niyo rin po itong laktawan kung phone number lang ay sapat na. 😊"
      : "Do you have an email address for follow-up? You can skip this if your phone number is already enough. 😊";
  }

  return isFilipino
    ? "Puwede po ba kayong magbahagi ng kaunti pang detalye para mas matulungan ko po kayo? 😊"
    : "Could you share a little more detail so I can guide you properly? 😊";
}

function buildDiscoveryQuestionOnly({
  nextField = "",
  pageConfig = {},
  pageIntelligence = {},
  qualification = {},
}) {
  return nextField
    ? getNextQuestion({
        field: nextField,
        pageConfig,
        pageIntelligence,
        qualification,
      })
    : "Can you share a little more detail so I can guide you properly?";
}

function buildPageAwareAnswer({
  intentResult = {},
  pageConfig = {},
  pageIntelligence = {},
  includeLinks = false,
}) {
  const pageName = getPageName(pageConfig);
  const offerSummary = getPageOfferSummary(pageConfig, pageIntelligence);
  const productsOrServices = getPageProductsOrServices(pageConfig);
  const priceRanges = getPagePriceRanges(pageConfig);
  const links = includeLinks ? getPageLinks(pageConfig) : "";
  const userText = pageIntelligence?.rawCustomerMessage || "";
  const isFilipino = isFilipinoStyle(userText);

  if (intentResult.intent === "pricing_inquiry") {
    return isFilipino
      ? [
          `Opo, siyempre! Matutulungan kayo ng ${pageName} pagdating sa pricing at packages.`,
          productsOrServices ? `Ito po ang aming mga alok:\n${productsOrServices}` : "",
          priceRanges ? `Price range:\n${priceRanges}` : "",
          links,
        ]
          .filter(Boolean)
          .join("\n\n")
      : [
          `Yes, absolutely! ${pageName} can help you with pricing and package details.`,
          productsOrServices ? `Here are our available offers:\n${productsOrServices}` : "",
          priceRanges ? `Price range:\n${priceRanges}` : "",
          links,
        ]
          .filter(Boolean)
          .join("\n\n");
  }

  if (intentResult.intent === "demo_request") {
    return isFilipino
      ? [
          `Walang problema! Matutulungan kayo ng ${pageName} para makapag-book ng demo, consultation, or meeting.`,
          offerSummary,
          links,
        ]
          .filter(Boolean)
          .join("\n\n")
      : [
          `Sure! ${pageName} can assist with scheduling a demo, consultation, or meeting.`,
          offerSummary,
          links,
        ]
          .filter(Boolean)
          .join("\n\n");
  }

  if (intentResult.intent === "human_request") {
    return isFilipino
      ? [
          "Sige po, ipapasa ko po ang chat na ito sa aming team para makausap niyo ang isang tao.",
          links,
        ]
          .filter(Boolean)
          .join("\n\n")
      : [
          "Sure! I'll route this conversation to our team so you can speak with a representative.",
          links,
        ]
          .filter(Boolean)
          .join("\n\n");
  }

  return isFilipino
    ? [
        `Matutulungan kayo ng ${pageName} sa inyong inquiry.`,
        offerSummary,
        productsOrServices ? `Mga Alok:\n${productsOrServices}` : "",
        links,
      ]
        .filter(Boolean)
        .join("\n\n")
    : [
        `${pageName} can assist with your inquiry.`,
        offerSummary,
        productsOrServices ? `Offers:\n${productsOrServices}` : "",
        links,
      ]
        .filter(Boolean)
        .join("\n\n");
}

function buildRecommendationReply({
  data = {},
  pageConfig = {},
  pageIntelligence = {},
}) {
  const pageName = getPageName(pageConfig);
  const offerSummary = getPageOfferSummary(pageConfig, pageIntelligence);
  const knownContext = buildKnownCustomerContext(data);
  const links = getPageLinks(pageConfig);
  const userText = pageIntelligence?.rawCustomerMessage || "";
  const isFilipino = isFilipinoStyle(userText);

  return isFilipino
    ? [
        `Maraming salamat po! Matutulungan kayo ng ${pageName} sa inquiry na ito.`,
        offerSummary,
        knownContext ? `Ito po ang mga detalye na naitabi ko:\n${knownContext}` : "",
        links,
        "Gusto niyo po bang magpatuloy sa pricing, booking/consultation, o kumonekta sa isang tao?",
      ]
        .filter(Boolean)
        .join("\n\n")
    : [
        `Thank you! ${pageName} can assist with this inquiry.`,
        offerSummary,
        knownContext ? `Here is what I've noted so far:\n${knownContext}` : "",
        links,
        "Would you like to continue with pricing, booking/consultation, or human assistance?",
      ]
        .filter(Boolean)
        .join("\n\n");
}

function buildCardCarousel(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const elements = items.slice(0, 10).map((item) => {
    const title = normalizeText(item.title || "");
    const subtitle = normalizeText(item.subtitle || "");
    const imageUrl = normalizeText(item.imageUrl || item.image || "");
    const buttons = Array.isArray(item.buttons) ? item.buttons : [];

    const element = {
      title: title || "Option",
      ...(subtitle ? { subtitle } : {}),
      ...(imageUrl ? { image_url: imageUrl } : {}),
    };

    if (buttons.length > 0) {
      element.buttons = buttons.map((btn) => {
        const btnTitle = normalizeText(btn.title || btn.label || "");
        const btnType = normalizeText(btn.type || "postback");
        const btnPayload = normalizeText(btn.payload || btn.value || "");
        const btnUrl = normalizeText(btn.url || "");

        const button = {
          type: btnType,
          title: btnTitle || "Select",
        };

        if (btnType === "web_url" && btnUrl) {
          button.url = btnUrl;
        } else {
          button.payload = btnPayload || btnTitle;
        }

        return button;
      });
    }

    return element;
  });

  return {
    type: "template",
    payload: {
      template_type: "generic",
      elements,
    },
  };
}

function buildButtonTemplate(text, buttons = []) {
  const messageText = normalizeText(text) || "Please select an option:";
  const buttonList = Array.isArray(buttons) ? buttons : [];

  const formattedButtons = buttonList.slice(0, 3).map((btn) => {
    const title = normalizeText(btn.title || btn.label || "");
    const btnType = normalizeText(btn.type || "postback");
    const payload = normalizeText(btn.payload || btn.value || "");
    const url = normalizeText(btn.url || "");

    const button = {
      type: btnType,
      title: title || "Select",
    };

    if (btnType === "web_url" && url) {
      button.url = url;
    } else if (btnType === "phone_number" && payload) {
      button.payload = payload;
    } else {
      button.payload = payload || title;
    }

    return button;
  });

  return {
    type: "template",
    payload: {
      template_type: "button",
      text: messageText,
      buttons: formattedButtons,
    },
  };
}

function buildQuickReplies(text, choices = []) {
  const messageText = normalizeText(text) || "Please choose:";
  const quickReplies = Array.isArray(choices) ? choices : [];

  return {
    text: messageText,
    quick_replies: quickReplies.slice(0, 13).map((choice) => {
      const title = normalizeText(choice.label || choice.title || "");
      const payload = normalizeText(choice.value || choice.payload || title);
      const imageUrl = normalizeText(choice.imageUrl || "");

      const reply = {
        content_type: "text",
        title: title || "Option",
        payload,
      };

      if (imageUrl) {
        reply.image_url = imageUrl;
      }

      return reply;
    }),
  };
}

function buildMediaAttachment(type, url, text = "") {
  const mediaType = normalizeText(type).toLowerCase();
  const mediaUrl = normalizeText(url);

  if (!mediaUrl) {
    return null;
  }

  if (mediaType === "image" || mediaType === "photo") {
    return {
      type: "image",
      payload: {
        url: mediaUrl,
        is_reusable: true,
      },
    };
  }

  if (mediaType === "video") {
    return {
      type: "video",
      payload: {
        url: mediaUrl,
        is_reusable: true,
      },
    };
  }

  if (mediaType === "file" || mediaType === "document") {
    return {
      type: "file",
      payload: {
        url: mediaUrl,
        is_reusable: true,
      },
    };
  }

  return null;
}

function buildProductShowcase(pageConfig = {}) {
  const products = normalizeText(pageConfig.productServices);
  const priceRanges = normalizeText(pageConfig.productServicePriceRanges);
  const pageName = getPageName(pageConfig);

  if (!products) {
    return null;
  }

  const productLines = products
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (productLines.length === 0) {
    return null;
  }

  const items = productLines.map((product, index) => {
    const parts = product.split(/[-–]/);
    const title = parts[0]?.trim() || `Product ${index + 1}`;
    const subtitle = parts[1]?.trim() || priceRanges || "";

    return {
      title,
      subtitle: subtitle ? `Price: ${subtitle}` : "",
      buttons: [
        {
          type: "postback",
          title: "Learn More",
          payload: `product_${index + 1}`,
        },
        {
          type: "postback",
          title: "Get Pricing",
          payload: "pricing_inquiry",
        },
      ],
    };
  });

  return buildCardCarousel(items);
}

function buildCtaButtons(options = {}) {
  const buttons = [];
  const includePricing = options.includePricing !== false;
  const includeDemo = options.includeDemo !== false;
  const includeHuman = options.includeHuman !== false;
  const maxButtons = options.maxButtons || 3;

  if (includePricing && maxButtons > 0) {
    buttons.push({
      type: "postback",
      title: "💰 Get Pricing",
      payload: "pricing_inquiry",
    });
  }

  if (includeDemo && maxButtons > 1) {
    buttons.push({
      type: "postback",
      title: "📅 Book Demo",
      payload: "demo_request",
    });
  }

  if (includeHuman && maxButtons > 2) {
    buttons.push({
      type: "postback",
      title: "👤 Talk to Human",
      payload: "human_request",
    });
  }

  return buttons.slice(0, maxButtons);
}

function buildAdaptiveSalesReply({
  intentResult = {},
  data = {},
  nextField = "",
  pageConfig = {},
  pageIntelligence = {},
  qualification = {},
  discoveryOnly = false,
  includeLinks = false,
}) {
  if (discoveryOnly) {
    return buildDiscoveryQuestionOnly({
      nextField,
      pageConfig,
      pageIntelligence,
      qualification,
    });
  }

  const answer = buildPageAwareAnswer({
    intentResult,
    pageConfig,
    pageIntelligence,
    includeLinks,
  });

  const nextQuestion = nextField
    ? getNextQuestion({
        field: nextField,
        pageConfig,
        pageIntelligence,
        qualification,
      })
    : "";

  return [answer, nextQuestion].filter(Boolean).join("\n\n");
}

module.exports = {
  buildAdaptiveSalesReply,
  buildButtonTemplate,
  buildCardCarousel,
  buildCtaButtons,
  buildDiscoveryQuestionOnly,
  buildKnownCustomerContext,
  buildMediaAttachment,
  buildPageAwareAnswer,
  buildProductShowcase,
  buildQuickReplies,
  buildRecommendationReply,
  getEffectiveLeadData,
  getNextQuestion,
};
