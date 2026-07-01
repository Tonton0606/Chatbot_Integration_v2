const ALLOWED_ORIGINS = [
  "https://exponify.ph",
  "https://www.exponify.ph",
  "https://hermesv2-frontend.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SUPPORTED_TOPICS = [
    "CRM",
    "ERP",
    "Appointment Booking",
    "Data Analytics & Market Research",
    "Email Marketing",
    "Sales",
    "Customer Service",
  ];

  const TOPIC_KEYWORDS = [
    "crm",
    "customer relationship",
    "lead",
    "sales pipeline",
    "sales",
    "selling",
    "upsell",
    "cross-sell",
    "proposal",
    "quotation",
    "quote",
    "pricing",
    "negotiation",
    "deal",
    "conversion",
    "erp",
    "enterprise resource planning",
    "inventory",
    "procurement",
    "appointment",
    "booking",
    "schedule",
    "calendar",
    "data analytics",
    "analytics",
    "market research",
    "market analysis",
    "email marketing",
    "newsletter",
    "campaign",
    "email campaign",
    "customer support",
    "customer service",
    "service request",
    "complaint",
    "ticket",
    "refund",
    "billing",
    "subscription",
    "onboarding",
    "retention",
    "csr",
    "suporta",
    "serbisyo",
    "benta",
    "kliyente",
    "customer",
    "order",
    "bayad",
    "tanong",
  ];

  const buildSalesCsrSystemPrompt = (options = {}) => {
    if (options?.promptMode === "lite") {
      return `You are a helpful business assistant.\nRules:\n- Answer directly and briefly.\n- Use the business Products/Services when asked about offers.\n- If link is missing, say it is not available.\n- Do not invent details.\n- Match the user's language.`;
    }

    return `You are a human-like business assistant trained for two primary roles:\n1) Sales Agent\n2) Customer Service Representative (CSR)\n\nCore behavior:\n- Be clear, concise, and professional.\n- Ask focused follow-up questions when context is missing.\n- If the request is ambiguous, first clarify objective, audience, and urgency.\n- Use practical, action-oriented outputs (scripts, templates, checklists, next steps).\n\nLanguage and tone:\n- Detect the user's language and reply in the same language by default.\n- Support multilingual conversations naturally, including mixed English/Tagalog and other languages.\n- Sound human, warm, and conversational, especially for chat and Facebook messages.\n- Avoid robotic or repetitive phrasing.\n- Do not introduce yourself with a fixed bot name unless the user explicitly asks for your name.\n\nWhen acting as Sales Agent:\n- Help with lead qualification, discovery questions, objection handling, pricing communication, proposal messaging, and deal progression.\n- Recommend upsell/cross-sell options only when they genuinely fit customer needs.\n- Prioritize value, trust, and long-term relationships over aggressive tactics.\n\nWhen acting as CSR:\n- Show empathy and acknowledge customer concerns.\n- De-escalate frustration, apologize when appropriate, and provide clear resolution steps.\n- Collect required details efficiently and provide realistic timelines.\n- Offer alternatives or escalation paths when immediate resolution is not possible.\n\nResponse format preference:\n- Start with a direct answer.\n- Follow with short bullets for steps/actions.\n- End with one concise follow-up question when needed.\n\nIdentity handling:\n- If asked whether you are AI or human, reply naturally: you are the page's support assistant helping with inquiries.\n- Keep identity answers short, friendly, and non-technical.\n\nKnowledge usage priority:\n- Prioritize the business Products/Services context when users ask what the business offers.\n- For product-related questions, answer from listed products/services first before giving generic suggestions.\n- If products/services are missing, say that there is no listed product information yet and offer to connect the user with a staff member.\n\nMissing link handling:\n- If website link is unavailable, say: "Sa ngayon, wala pa kaming website link."\n- If Shopee link is unavailable, say: "Sa ngayon, wala pa kaming Shopee link."\n- If Lazada link is unavailable, say: "Sa ngayon, wala pa kaming Lazada link."\n\nNever invent company policies, pricing, or guarantees. If data is missing, say what is needed.`;
  };

  const getLatestUserMessage = (messages = []) => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return typeof messages[i].content === "string" ? messages[i].content : String(messages[i].content || "");
      }
    }
    return "";
  };

  const isInSupportedScope = (text, options = {}) => {
    if (!options || Object.keys(options).length === 0) {
      return true;
    }

    if (options?.channel === "facebook" || options?.multilingual === true) {
      return true;
    }

    if (
      options?.businessType ||
      options?.pageName ||
      options?.productServices ||
      options?.productServicePriceRanges ||
      options?.websiteLink ||
      options?.shoppeLink ||
      options?.lazadaLink
    ) {
      return true;
    }

    const value = (text || "").toLowerCase();
    return TOPIC_KEYWORDS.some((keyword) => value.includes(keyword));
  };

  const normalizeContextValue = (value) => (typeof value === "string" ? value.trim() : "");

  const buildBusinessContextMessages = (options = {}) => {
    const businessType = normalizeContextValue(options?.businessType);
    const pageName = normalizeContextValue(options?.pageName);
    const productServices = normalizeContextValue(options?.productServices);
    const productServicePriceRanges = normalizeContextValue(options?.productServicePriceRanges);
    const websiteLink = normalizeContextValue(options?.websiteLink);
    const shoppeLink = normalizeContextValue(options?.shoppeLink);
    const lazadaLink = normalizeContextValue(options?.lazadaLink);

    const productServicesValue = productServices || "not available";
    const productServicePriceRangesValue = productServicePriceRanges || "not available";
    const websiteLinkValue = websiteLink || "not available";
    const shoppeLinkValue = shoppeLink || "not available";
    const lazadaLinkValue = lazadaLink || "not available";

    if (!businessType && !pageName && !productServices && !productServicePriceRanges && !websiteLink && !shoppeLink && !lazadaLink) {
      return [];
    }

    const contextParts = [];

    if (pageName) {
      contextParts.push(`Facebook page: ${pageName}`);
    }

    if (businessType) {
      contextParts.push(`Business type: ${businessType}`);
    }

    contextParts.push(`Products/Services: ${productServicesValue}`);
    contextParts.push(`Product/service price range: ${productServicePriceRangesValue}`);
    contextParts.push(`Website link: ${websiteLinkValue}`);
    contextParts.push(`Shopee link: ${shoppeLinkValue}`);
    contextParts.push(`Lazada link: ${lazadaLinkValue}`);

    contextParts.push("Use this business context to guide replies. Prioritize Products/Services details for offer/product questions. If Website/Shopee/Lazada value is \"not available\", clearly say the page currently has no link for that channel. Do not invent missing links or product details.");

    return [{
      role: "system",
      content: contextParts.join("\n"),
    }];
  };

  const buildChannelStyleMessages = (options = {}) => {
    if (options?.channel !== "facebook") {
      return [];
    }

    return [{
      role: "system",
      content: `Channel style for Facebook Messenger:\n- Reply like a real person in chat: natural, warm, and direct.\n- Keep replies short by default: 1-3 sentences, max 80 words.\n- Mirror the user's language style (Tagalog, English, or Taglish).\n- Do not use meta phrases like \"Based on the context provided\", \"Here's a possible response\", or \"As an AI\".\n- Do not output long templates, numbered lists, or formal scripts unless the user asks for detailed format.\n- Give one clear answer, then ask one short follow-up question only when needed.`,
    }];
  };

  const buildOutOfScopeResponse = (model) => ({
    id: "restricted_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: `I can only help with: ${SUPPORTED_TOPICS.join(", ")}.`,
      },
    ],
    model: model || (process.env.XAI_API_KEY ? "grok-2-latest" : "claude-3-sonnet-20240229"),
    stop_reason: "end_turn",
    restricted: true,
  });

  const buildBusinessContextFallback = (model, options = {}) => {
    const pageName = typeof options.pageName === "string" ? options.pageName.trim() : "";
    const productServices = typeof options.productServices === "string" ? options.productServices.trim() : "";
    const websiteLink = typeof options.websiteLink === "string" ? options.websiteLink.trim() : "";
    const shoppeLink = typeof options.shoppeLink === "string" ? options.shoppeLink.trim() : "";
    const lazadaLink = typeof options.lazadaLink === "string" ? options.lazadaLink.trim() : "";

    const parts = [];
    if (pageName) {
      parts.push(`Here is what ${pageName} offers:`);
    } else {
      parts.push("Here are our services:");
    }

    if (productServices) {
      parts.push(productServices);
    } else {
      parts.push("We don't have listed services yet. Please ask our team for details.");
    }

    if (websiteLink) parts.push(`Website: ${websiteLink}`);
    if (shoppeLink) parts.push(`Shopee: ${shoppeLink}`);
    if (lazadaLink) parts.push(`Lazada: ${lazadaLink}`);

    return {
      id: "context_" + Date.now(),
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: parts.join(" ") }],
      model: model || (process.env.XAI_API_KEY ? "grok-2-latest" : "claude-3-sonnet-20240229"),
      stop_reason: "end_turn",
    };
  };

  const { endpoint, ...body } = req.body;

  const options = body?.options || {};

  const normalizeMessages = (messages = []) => messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : String(m.content || ""),
  }));

  const buildPromptedMessages = (messages = [], options = {}) => [
    { role: "system", content: buildSalesCsrSystemPrompt(options) },
    ...buildBusinessContextMessages(options),
    ...buildChannelStyleMessages(options),
    ...normalizeMessages(messages),
  ];

  const latestUserText = getLatestUserMessage(body?.messages || []);
  if (!isInSupportedScope(latestUserText, body?.options || {})) {
    const hasContext = Boolean(
      body?.options?.businessType ||
        body?.options?.pageName ||
        body?.options?.productServices ||
        body?.options?.websiteLink ||
        body?.options?.shoppeLink ||
        body?.options?.lazadaLink
    );
    if (hasContext) {
      return res.status(200).json(buildBusinessContextFallback(body?.model, body?.options || {}));
    }

    return res.status(200).json(buildOutOfScopeResponse(body?.model));
  }

  const isHomepageSurface = normalizeContextValue(body?.options?.surface) === "homepage";
  const groqApiKey = isHomepageSurface ? (process.env.HOME_GROQ_API_KEY || "") : (process.env.GROQ_API_KEY || process.env.XAI_API_KEY);
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const anthropicApiKey = process.env.OPENCLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  const defaultGroqModel = isHomepageSurface
    ? (process.env.HOME_GROQ_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile")
    : (process.env.GROQ_MODEL || "llama-3.3-70b-versatile");
  const defaultModel = groqApiKey ? defaultGroqModel : "claude-3-sonnet-20240229";

  if (isHomepageSurface && !groqApiKey) {
    return res.status(500).json({ error: "HOME_GROQ_API_KEY is missing for the homepage chatbot." });
  }

  if (!groqApiKey && !openRouterApiKey && !anthropicApiKey) {
    const userMessage = body?.messages?.[body.messages.length - 1]?.content || "";
    return res.status(200).json({
      id: "demo_" + Date.now(),
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: `Demo mode: no AI API key configured yet. You said: ${userMessage}`,
        },
      ],
      model: body?.model || defaultModel,
      stop_reason: "end_turn",
      demo_mode: true,
    });
  }

  const provider = groqApiKey ? "groq" : openRouterApiKey ? "openrouter" : "anthropic";

  try {
    const targetUrl = provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : `https://api.anthropic.com/v1${endpoint}`;

    const mappedModel = provider === "groq"
      ? {
          "claude-3-sonnet-20240229": defaultGroqModel,
          "claude-3-opus-20240229": defaultGroqModel,
          "claude-3-haiku-20240307": defaultGroqModel,
          "openai/gpt-4o-mini": defaultGroqModel,
          "gpt-4o-mini": defaultGroqModel,
          "openai/gpt-4o": defaultGroqModel,
          "gpt-4o": defaultGroqModel,
          "grok-2-latest": defaultGroqModel,
          "grok-4.20": defaultGroqModel,
        }[body?.model] || body?.model || defaultGroqModel
      : provider === "openrouter"
      ? {
          "claude-3-sonnet-20240229": "anthropic/claude-3.5-sonnet",
          "claude-3-opus-20240229": "anthropic/claude-3-opus",
          "claude-3-haiku-20240307": "anthropic/claude-3-haiku",
        }[body?.model] || body?.model || "anthropic/claude-3.5-sonnet"
      : body?.model || defaultModel;

    const sharedPayload = {
      model: mappedModel,
      messages: buildPromptedMessages(body?.messages || [], body?.options || {}),
      max_tokens: body?.max_tokens || 2048,
      temperature: body?.temperature ?? 0.7,
    };

    const headers = {
      "Content-Type": "application/json",
    };

    if (provider === "groq") {
      headers.Authorization = `Bearer ${groqApiKey}`;
    } else if (provider === "openrouter") {
      headers.Authorization = `Bearer ${openRouterApiKey}`;
    } else {
      headers["x-api-key"] = anthropicApiKey;
      headers["anthropic-version"] = "2023-06-01";
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(sharedPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || response.statusText });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to call AI provider",
      message: error.message,
    });
  }
}
