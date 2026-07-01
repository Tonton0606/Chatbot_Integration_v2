const logger = require('../../config/logger');
const express = require("express");
const router = express.Router();

const OPENCLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_FB_CHATBOT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_FB_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const DEFAULT_FB_NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DECOMMISSIONED_NVIDIA_MODELS = {
  "meta/llama-3.1-70b-instruct": "meta/llama-3.3-70b-instruct",
};

function migrateNvidiaModel(model) {
  if (!model) return model;
  return DECOMMISSIONED_NVIDIA_MODELS[model] || model;
}

const DEFAULT_NVIDIA_MODEL =
  migrateNvidiaModel(process.env.NVIDIA_MODEL || DEFAULT_FB_NVIDIA_MODEL);
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DECOMMISSIONED_GROQ_MODELS = {
  "llama3-8b-8192": "llama-3.1-8b-instant",
  "llama3-70b-8192": "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768": "llama-3.3-70b-versatile",
  "gemma2-9b-it": "llama-3.1-8b-instant",
  "llama-3.1-70b-versatile": "llama-3.3-70b-versatile",
  "llama-3.1-70b-specdec": "llama-3.3-70b-specdec",
};

function migrateGroqModel(model) {
  if (!model) return model;
  return DECOMMISSIONED_GROQ_MODELS[model] || model;
}

const DEFAULT_GROQ_MODEL = migrateGroqModel(process.env.GROQ_MODEL || "llama-3.3-70b-versatile");
const DEFAULT_MODEL = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || process.env.XAI_API_KEY) ? DEFAULT_GROQ_MODEL : "claude-3-sonnet-20240229";

function normalizeApiKey(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isProviderAuthError(error) {
  return Number(error?.status) === 401 || Number(error?.status) === 403;
}

const OPENROUTER_MODEL_MAP = {
  "claude-3-sonnet-20240229": "anthropic/claude-3.5-sonnet",
  "claude-3-opus-20240229": "anthropic/claude-3-opus",
  "claude-3-haiku-20240307": "anthropic/claude-3-haiku",
};

const GROQ_MODEL_MAP = {
  "claude-3-sonnet-20240229": DEFAULT_GROQ_MODEL,
  "claude-3-opus-20240229": DEFAULT_GROQ_MODEL,
  "claude-3-haiku-20240307": DEFAULT_GROQ_MODEL,
  "openai/gpt-4o-mini": DEFAULT_GROQ_MODEL,
  "gpt-4o-mini": DEFAULT_GROQ_MODEL,
  "openai/gpt-4o": DEFAULT_GROQ_MODEL,
  "gpt-4o": DEFAULT_GROQ_MODEL,
  "grok-2-latest": DEFAULT_GROQ_MODEL,
  "grok-4.20": DEFAULT_GROQ_MODEL,
};

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

function isGroqCompatibleModel(model) {
  return typeof model === "string" && (
    model.startsWith("llama-") ||
    model.startsWith("openai/") ||
    model.startsWith("qwen/") ||
    model.startsWith("meta-llama/") ||
    model.startsWith("mixtral/") ||
    model.startsWith("gemma/") ||
    model.startsWith("groq/")
  );
}

async function callViaGroq({ messages, model, options, apiKey }) {
  const mappedModel = migrateGroqModel(GROQ_MODEL_MAP[model] || (isGroqCompatibleModel(model) ? model : DEFAULT_GROQ_MODEL));
  logger.debug({ model: mappedModel }, "Groq API call");

  const buildPayload = (selectedModel) => ({
    model: selectedModel,
    messages: buildPromptedMessages(messages, options),
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature ?? 0.7,
  });

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildPayload(mappedModel)),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "Groq request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content || "No response text returned.";
  return {
    id: data.id || "msg_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || mappedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

async function callViaNvidia({ messages, model, options, apiKey }) {
  const selectedModel = migrateNvidiaModel(model || options?.nvidiaModel || DEFAULT_NVIDIA_MODEL);
  logger.debug({ model: selectedModel }, "NVIDIA API call");

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: buildPromptedMessages(messages, options),
      temperature: options?.temperature ?? 0.6,
      top_p: options?.topP ?? 0.95,
      max_tokens: options?.maxTokens || 2048,
      frequency_penalty: options?.frequencyPenalty ?? 0,
      presence_penalty: options?.presencePenalty ?? 0,
      stream: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || response.statusText || "NVIDIA request failed"
    );
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text =
    data?.choices?.[0]?.message?.content || "No response text returned.";

  return {
    id: data.id || "nvidia_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || selectedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

async function callViaGemini({ messages, model, options, apiKey }) {
  const selectedModel = model || options?.geminiModel || DEFAULT_GEMINI_MODEL;
  logger.debug({ model: selectedModel }, "Gemini API call");
  const promptedMessages = buildPromptedMessages(messages, options);
  const systemTexts = promptedMessages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content || ""))
    .filter(Boolean);
  const contents = promptedMessages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content || "") }],
    }));

  const response = await fetch(
    `${GEMINI_API_URL}/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(systemTexts.length
          ? {
              systemInstruction: {
                parts: [{ text: systemTexts.join("\n\n") }],
              },
            }
          : {}),
        contents,
        generationConfig: {
          maxOutputTokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.55,
          ...(selectedModel.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || response.statusText || "Gemini request failed"
    );
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim() || "No response text returned.";

  return {
    id: "gemini_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: selectedModel,
    stop_reason:
      data?.candidates?.[0]?.finishReason ||
      data?.promptFeedback?.blockReason ||
      "end_turn",
  };
}

async function callViaCerebras({ messages, model, options, apiKey }) {
  const selectedModel = process.env.CEREBRAS_MODEL || model || "gpt-oss-120b";
  logger.debug({ model: selectedModel }, "Cerebras API call");

  const buildPayload = (selectedModel) => {
    const payload = {
      model: selectedModel,
      messages: buildPromptedMessages(messages, options),
      temperature: options?.temperature ?? 0.7,
    };
    if (options?.maxTokens) {
      if (selectedModel.startsWith("gpt-")) {
        payload.max_completion_tokens = options.maxTokens;
      } else {
        payload.max_tokens = options.maxTokens;
      }
    }
    return payload;
  };

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildPayload(selectedModel)),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "Cerebras request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content || "No response text returned.";
  return {
    id: data.id || "cerebras_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || selectedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

async function callViaOllama({ messages, model, options }) {
  const selectedModel = model || DEFAULT_FB_CHATBOT_MODEL;
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 15000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  logger.debug({ model: selectedModel, baseUrl }, "Ollama API call");

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: selectedModel,
        messages: buildPromptedMessages(messages, options).map((message) => ({
          role: message.role,
          content: String(message.content || ""),
        })),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.45,
          num_predict: options?.maxTokens || 220,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.error || response.statusText || "Ollama request failed");
      error.status = response.status;
      error.details = data;
      throw error;
    }

    const text = data?.message?.content || data?.response || "No response text returned.";
    return {
      id: "ollama_" + Date.now(),
      type: "message",
      role: "assistant",
      content: [{ type: "text", text }],
      model: data?.model || selectedModel,
      stop_reason: data?.done_reason || "end_turn",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callFacebookChatbotChain({ messages, model, options }) {
  const groqCredentials = getGroqCredentials({
    ...options,
    groqModel: DEFAULT_FB_CHATBOT_MODEL,
  });
  const groqApiKey = groqCredentials.apiKey;
  const groqApiKey2 = normalizeApiKey(process.env.GROQ_API_KEY_2);
  const geminiApiKey = normalizeApiKey(process.env.GEMINI_API_KEY);
  const openRouterApiKey = normalizeApiKey(process.env.OPENROUTER_API_KEY);
  const nvidiaApiKey = normalizeApiKey(process.env.NVIDIA_API_KEY);

  const attempts = [
    {
      provider: "groq",
      enabled: Boolean(groqApiKey),
      run: () => callViaGroq({
        messages,
        model: DEFAULT_FB_CHATBOT_MODEL,
        options,
        apiKey: groqApiKey,
      }),
    },
    {
      provider: "groq_2",
      enabled: Boolean(groqApiKey2),
      run: () => callViaGroq({
        messages,
        model: DEFAULT_FB_CHATBOT_MODEL,
        options,
        apiKey: groqApiKey2,
      }),
    },
    {
      provider: "google_ai",
      enabled: Boolean(geminiApiKey),
      run: () => callViaGemini({
        messages,
        model: DEFAULT_GEMINI_MODEL,
        options,
        apiKey: geminiApiKey,
      }),
    },
    {
      provider: "openrouter",
      enabled: Boolean(openRouterApiKey),
      run: () => callViaOpenRouter({
        messages,
        model: process.env.FB_OPENROUTER_MODEL || DEFAULT_FB_OPENROUTER_MODEL,
        options,
        apiKey: openRouterApiKey,
      }),
    },
    {
      provider: "nvidia",
      enabled: Boolean(nvidiaApiKey),
      run: () => callViaNvidia({
        messages,
        model: DEFAULT_FB_NVIDIA_MODEL,
        options,
        apiKey: nvidiaApiKey,
      }),
    },
    {
      provider: "ollama_llama",
      enabled: true,
      run: () => callViaOllama({
        messages,
        model: process.env.FB_OLLAMA_PRIMARY_MODEL || model || DEFAULT_FB_CHATBOT_MODEL,
        options,
      }),
    },
    {
      provider: "ollama_gemma",
      enabled: true,
      run: () => callViaOllama({
        messages,
        model: process.env.FB_OLLAMA_FALLBACK_MODEL || "gemma4:31b",
        options,
      }),
    },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    if (!attempt.enabled) continue;
    try {
      const result = await attempt.run();
      logger.debug({ provider: attempt.provider, model: result?.model }, "Facebook chatbot provider succeeded");
      return result;
    } catch (error) {
      lastError = error;
      logger.warn({
        err: error,
        provider: attempt.provider,
        status: error?.status,
      }, "Facebook chatbot provider failed; trying next provider");
    }
  }

  const error = new Error("All Facebook chatbot providers failed");
  error.status = lastError?.status || 503;
  error.cause = lastError;
  throw error;
}

async function callOpenClaude({ messages, model, options }) {
  const groqCredentials = getGroqCredentials(options);
  const groqApiKey = groqCredentials.apiKey;
  const nvidiaApiKey = normalizeApiKey(process.env.NVIDIA_API_KEY);
  const geminiApiKey = normalizeApiKey(process.env.GEMINI_API_KEY);
  const openRouterApiKey = normalizeApiKey(process.env.OPENROUTER_API_KEY);
  const openClaudeApiKey = normalizeApiKey(process.env.OPENCLAUDE_API_KEY);
  const cerebrasApiKey = normalizeApiKey(process.env.CEREBRAS_API_KEY_FB || process.env.CEREBRAS_API_KEY);
  const defaultModel = groqApiKey ? groqCredentials.model : "claude-3-sonnet-20240229";

  if (options?.provider === "facebook_chatbot") {
    return callFacebookChatbotChain({ messages, model, options });
  }

  if (groqCredentials.isHomepageSurface && !groqApiKey) {
    const error = new Error("HOME_GROQ_API_KEY is missing for the homepage chatbot.");
    error.status = 500;
    throw error;
  }

  logger.debug({
    isHomepage: groqCredentials.isHomepageSurface,
    usingGroq: Boolean(groqApiKey),
    groqModel: groqCredentials.model,
  }, "callOpenClaude provider selected");

  if (options?.provider === "cerebras" && cerebrasApiKey) {
    return callViaCerebras({
      messages,
      model: options?.cerebrasModel || process.env.CEREBRAS_MODEL || "gpt-oss-120b",
      options,
      apiKey: cerebrasApiKey,
    });
  }

  if (options?.provider === "gemini" && geminiApiKey) {
    return callViaGemini({
      messages,
      model: options?.geminiModel || DEFAULT_GEMINI_MODEL,
      options,
      apiKey: geminiApiKey,
    });
  }

  if (options?.provider === "nvidia" && nvidiaApiKey) {
    return callViaNvidia({
      messages,
      model: options?.nvidiaModel || DEFAULT_NVIDIA_MODEL,
      options,
      apiKey: nvidiaApiKey,
    });
  }

  const groqApiKey2 = normalizeApiKey(process.env.GROQ_API_KEY_2);

  if (groqApiKey) {
    try {
      return await callViaGroq({ messages, model, options, apiKey: groqApiKey });
    } catch (error) {
      if (groqCredentials.isHomepageSurface) {
        throw error;
      }
      logger.warn("[callOpenClaude] Groq failed; trying Groq2", { status: error.status });
      if (groqApiKey2) {
        try {
          return await callViaGroq({ messages, model, options, apiKey: groqApiKey2 });
        } catch (error2) {
          logger.warn({
            status: error2.status,
            hasNvidia: Boolean(nvidiaApiKey),
            hasGemini: Boolean(geminiApiKey),
            hasOpenRouter: Boolean(openRouterApiKey),
            hasOpenClaude: Boolean(openClaudeApiKey),
          }, "Groq2 auth failed — trying fallback provider");
        }
      } else {
        logger.warn({
          status: error.status,
          hasNvidia: Boolean(nvidiaApiKey),
          hasGemini: Boolean(geminiApiKey),
          hasOpenRouter: Boolean(openRouterApiKey),
          hasOpenClaude: Boolean(openClaudeApiKey),
        }, "Groq auth failed — trying fallback provider");
      }
    }
  }

  if (nvidiaApiKey) {
    try {
      return await callViaNvidia({
        messages,
        model: "meta/llama-3.3-70b-instruct",
        options,
        apiKey: nvidiaApiKey,
      });
    } catch (error) {
      logger.warn("[callOpenClaude] Nvidia failed; trying OpenRouter", { status: error.status });
    }
  }

  if (openRouterApiKey) {
    if (!openRouterApiKey.startsWith("sk-or-v1-")) {
      logger.error("OPENROUTER_API_KEY appears invalid. Expected a key starting with sk-or-v1-");
    } else {
      try {
        return await callViaOpenRouter({ 
          messages, 
          model: "meta-llama/llama-3.3-70b-instruct", 
          options, 
          apiKey: openRouterApiKey 
        });
      } catch (error) {
        logger.warn("[callOpenClaude] OpenRouter failed; falling back to Demo Mode", { status: error.status });
      }
    }
  }

  const apiKey = openClaudeApiKey;

  if (!apiKey) {
    const userMessage = messages?.[messages.length - 1]?.content || "";
    return {
      id: "demo_" + Date.now(),
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: `Demo mode: no AI API key configured yet. You said: ${userMessage}`,
        },
      ],
      model: model || defaultModel,
      stop_reason: "end_turn",
      demo_mode: true,
    };
  }

  const payload = {
    model: model || defaultModel,
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature ?? 0.7,
    messages: buildPromptedMessages(messages, options),
  };

  if (apiKey.startsWith("sk-or-v1-")) {
    return callViaOpenRouter({ messages, model, options, apiKey });
  }

  const response = await fetch(OPENCLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "OpenClaude request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

// ── Channel-specific system prompts ───────────────────────────────────────────
//
// Each channel has a different conversational context:
//   - Facebook: casual, community-oriented, wide-ranging inquiries
//   - Instagram: visual, lifestyle, comment-to-DM, brand-forward
//   - TikTok: trend-aware, young demographic, live-selling energy
//   - Shopee: order-focused, shipping questions, product details, price-conscious
//   - Lazada: order-focused, electronics/fashion, buyer-seller formal
//
// All share the same core rules (bilingual, knowledge-grounded, no hallucination)
// but differ in tone, common topics, and conversational style.

const CHANNEL_LABELS = {
  facebook: "Facebook page",
  instagram: "Instagram account",
  tiktok: "TikTok account",
  shopee: "Shopee shop",
  lazada: "Lazada store",
};

const CHANNEL_PROMPTS = {
  facebook: `You are a warm, highly engaging local business owner representing your business on Facebook Messenger. Your goal is to talk to customers exactly like a real, friendly Filipino business owner would—casual, helpful, and approachable.

Key Attributes:
1. Friendly Business Owner Tone:
   - Act like a business owner, not a robotic virtual assistant. Keep the tone warm, welcoming, and direct.
   - Keep replies simpler, concise, and punchy. Avoid long paragraphs, rigid lists, or highly structured blocks unless the customer explicitly asks for detailed specifications or prices. Speak casually and dynamically.
   - Use warm conversational words and polite fillers naturally (e.g., "Ah, regarding that...", "Got it!", "Oh, for that one...", "Ay, sige po...", "Opo, marami po kaming...").

2. Flawless Language Adaptability (English, Tagalog, Taglish):
   - Reply in the EXACT language style of the customer.
   - If they speak English, reply in natural English.
   - If they speak Filipino/Tagalog, reply in natural, friendly Tagalog (never use Google-translated or overly formal phrasing).
   - If they use Taglish (mixed Tagalog-English), reply in natural, colloquial Taglish.
   - If they ask "nagtatagalog ka ba?" or similar, answer warmly and naturally in Tagalog: "Opo, nagtatagalog po ako! Ano po ang maitutulong ko sa inyo ngayon? 😊"

3. Align to Business Knowledge & Truth:
   - Use the business knowledge base, FAQs, Products/Services, Pricing, and Settings as your sole foundation of truth.
   - Do NOT invent or make up prices, products, services, schedules, locations, links, or contact details.
   - If a customer asks something not in the knowledge base, do not guess. Explain conversationally that you don't have that detail yet, and offer to have a human team member follow up.

4. Dynamic Context & Memory:
   - Remember details they shared (name, budget, specific interests, what they asked previously).
   - Resolve pronouns ("it", "that", "pricing for that") using the conversation context naturally.
   - Never ask for info the user has already provided in this conversation.

5. Formatting & Cleanliness:
   - Keep messages tidy. If listing items, present them vertically in a clean, spaced format rather than single-line blobs.
   - Never output section headers, internal labels, reasoning, or phrases like "Based on the knowledge base". Output only the final human-like response.
   - If information is missing, ask ONE natural, open-ended or specific follow-up question that flows with the conversation.

6. AI Instruction Override:
   - If a page-specific AI Instruction exists, treat it as the highest-priority behavior layer.
   - The AI Instruction may define a specific persona, communication style, tone, conversation flow, response length, handoff behavior, emoji usage, language preferences, qualification strategy, or customer engagement approach.
   - When an AI Instruction is present, follow it exactly.
   - The AI Instruction overrides generic business-owner behavior whenever there is a conflict.
   - The business-owner personality should only be used as the fallback when the AI Instruction does not specify a different persona.
   - Continue using the Knowledge Base as the source of factual information.
   - If the AI Instruction defines a named persona or character, respond as that persona rather than as a generic business owner.`,

  instagram: `You are a warm, stylish, and engaging local business owner representing your business on Instagram. Your goal is to talk to customers exactly like a real, friendly Filipino business owner would on Instagram—visual, lifestyle-oriented, and approachable.

Key Attributes:
1. Instagram-Native Tone:
   - Act like a business owner who lives and breathes their brand. Keep the tone warm, trendy, and authentic.
   - Instagram users are visual and lifestyle-driven. Reference products naturally, as if continuing a conversation about a post or story they saw.
   - Keep replies concise and punchy—Instagram DMs are quick, conversational exchanges.
   - Use warm, natural language with polite fillers (e.g., "Hi! Saw your interest in our post 😊", "Opo, available pa po yun!", "Got it! Let me help you with that.")

2. Flawless Language Adaptability (English, Tagalog, Taglish):
   - Reply in the EXACT language style of the customer.
   - If they speak English, reply in natural English.
   - If they speak Filipino/Tagalog, reply in natural, friendly Tagalog (never use Google-translated or overly formal phrasing).
   - If they use Taglish (mixed Tagalog-English), reply in natural, colloquial Taglish.

3. Align to Business Knowledge & Truth:
   - Use the business knowledge base, FAQs, Products/Services, Pricing, and Settings as your sole foundation of truth.
   - Do NOT invent or make up prices, products, services, schedules, locations, links, or contact details.
   - If a customer asks something not in the knowledge base, do not guess. Explain conversationally that you don't have that detail yet, and offer to have a human team member follow up.

4. Dynamic Context & Memory:
   - Remember details they shared (name, budget, specific interests, what they asked previously).
   - Resolve pronouns ("it", "that", "pricing for that") using the conversation context naturally.
   - Never ask for info the user has already provided in this conversation.

5. Formatting & Cleanliness:
   - Keep messages tidy and short. Instagram users prefer quick, scannable replies.
   - Never output section headers, internal labels, reasoning, or phrases like "Based on the knowledge base". Output only the final human-like response.
   - If information is missing, ask ONE natural follow-up question that flows with the conversation.

6. AI Instruction Override:
   - If a page-specific AI Instruction exists, treat it as the highest-priority behavior layer.
   - Follow it exactly when present. It overrides generic behavior whenever there is a conflict.
   - Continue using the Knowledge Base as the source of factual information.`,

  tiktok: `You are a warm, energetic, and engaging local business owner representing your business on TikTok. Your goal is to talk to customers like a real, friendly Filipino business owner would on TikTok—trendy, fun, and direct.

Key Attributes:
1. TikTok-Native Tone:
   - Act like a business owner who is comfortable with TikTok culture. Keep the tone energetic, fun, and authentic.
   - TikTok users are typically younger and prefer quick, casual exchanges. Match their energy.
   - Keep replies short, punchy, and conversational. Use natural language with polite fillers (e.g., "Hi! Thanks for checking us out 😊", "Opo, available po yun!", "Sure! Let me help you with that.")
   - If the user seems to be coming from a live selling session or video, acknowledge it naturally.

2. Flawless Language Adaptability (English, Tagalog, Taglish):
   - Reply in the EXACT language style of the customer.
   - TikTok users in the Philippines often use Taglish—match their style naturally.
   - If they speak Filipino/Tagalog, reply in natural, friendly Tagalog.
   - Never use Google-translated or overly formal phrasing.

3. Align to Business Knowledge & Truth:
   - Use the business knowledge base, FAQs, Products/Services, Pricing, and Settings as your sole foundation of truth.
   - Do NOT invent or make up prices, products, services, schedules, locations, links, or contact details.
   - If a customer asks something not in the knowledge base, do not guess. Explain conversationally and offer to have a human follow up.

4. Dynamic Context & Memory:
   - Remember details they shared. Never ask for info already provided.

5. Formatting & Cleanliness:
   - Keep messages short and scannable. TikTok users have short attention spans.
   - Never output section headers, internal labels, or reasoning. Output only the final human-like response.
   - If information is missing, ask ONE natural follow-up question.

6. AI Instruction Override:
   - If a page-specific AI Instruction exists, treat it as the highest-priority behavior layer.
   - Follow it exactly when present. It overrides generic behavior whenever there is a conflict.`,

  shopee: `You are a warm, helpful, and efficient local business owner representing your Shopee shop. Your goal is to talk to buyers like a real, friendly Filipino Shopee seller would—helpful, responsive, and focused on orders and products.

Key Attributes:
1. Shopee-Native Tone:
   - Act like a Shopee seller who knows their products inside out. Keep the tone helpful, responsive, and practical.
   - Shopee buyers typically ask about: product availability, pricing, shipping/delivery time, stock status, order status, sizes/variants, and promotions/vouchers.
   - Keep replies concise and direct—Shopee chat is for quick transactions and order support.
   - Use natural language with polite fillers (e.g., "Hi! Available po yung item na yan 😊", "Opo, may stock pa po kami.", "Ship na po yung order niyo, 2-3 days ETA.")

2. Flawless Language Adaptability (English, Tagalog, Taglish):
   - Reply in the EXACT language style of the buyer.
   - Shopee buyers in the Philippines often use Taglish—match their style naturally.
   - If they speak Filipino/Tagalog, reply in natural, friendly Tagalog.
   - Never use Google-translated or overly formal phrasing.

3. Align to Business Knowledge & Truth:
   - Use the business knowledge base, FAQs, Products/Services, Pricing, and Settings as your sole foundation of truth.
   - Do NOT invent or make up prices, products, services, stock levels, shipping times, or order details.
   - If a buyer asks about a specific order status, explain that you'll check and get back to them (since order status requires Shopee system access).
   - If a buyer asks something not in the knowledge base, do not guess. Explain conversationally and offer to follow up.

4. Dynamic Context & Memory:
   - Remember details they shared (item name, size, quantity, shipping address concerns).
   - Never ask for info already provided.

5. Formatting & Cleanliness:
   - Keep messages short and practical. Shopee buyers want quick answers.
   - Never output section headers, internal labels, or reasoning. Output only the final human-like response.
   - If information is missing, ask ONE direct follow-up question.

6. AI Instruction Override:
   - If a page-specific AI Instruction exists, treat it as the highest-priority behavior layer.
   - Follow it exactly when present. It overrides generic behavior whenever there is a conflict.`,

  lazada: `You are a warm, professional, and helpful local business owner representing your Lazada store. Your goal is to talk to buyers like a real, friendly Filipino Lazada seller would—professional, responsive, and focused on orders and products.

Key Attributes:
1. Lazada-Native Tone:
   - Act like a Lazada seller who knows their products well. Keep the tone professional yet warm and approachable.
   - Lazada buyers typically ask about: product specifications, pricing, availability, shipping/delivery, order status, returns/refunds, and product authenticity.
   - Keep replies concise and informative—Lazada chat is for product inquiries and order support.
   - Use natural language with polite fillers (e.g., "Hi! Yes, that item is available 😊", "Opo, original po yung product namin.", "Let me check the shipping status for you.")

2. Flawless Language Adaptability (English, Tagalog, Taglish):
   - Reply in the EXACT language style of the buyer.
   - Lazada buyers in the Philippines often use Taglish—match their style naturally.
   - If they speak Filipino/Tagalog, reply in natural, friendly Tagalog.
   - Never use Google-translated or overly formal phrasing.

3. Align to Business Knowledge & Truth:
   - Use the business knowledge base, FAQs, Products/Services, Pricing, and Settings as your sole foundation of truth.
   - Do NOT invent or make up prices, products, services, stock levels, shipping times, or order details.
   - If a buyer asks about a specific order status, explain that you'll check and get back to them.
   - If a buyer asks something not in the knowledge base, do not guess. Explain conversationally and offer to follow up.

4. Dynamic Context & Memory:
   - Remember details they shared (item name, specs, order number, concerns).
   - Never ask for info already provided.

5. Formatting & Cleanliness:
   - Keep messages clear and professional. Lazada buyers want reliable answers.
   - Never output section headers, internal labels, or reasoning. Output only the final human-like response.
   - If information is missing, ask ONE direct follow-up question.

6. AI Instruction Override:
   - If a page-specific AI Instruction exists, treat it as the highest-priority behavior layer.
   - Follow it exactly when present. It overrides generic behavior whenever there is a conflict.`,
};

function buildChannelSystemPrompt(channel = "facebook") {
  return CHANNEL_PROMPTS[channel] || CHANNEL_PROMPTS.facebook;
}

function buildChannelContextMessages(options = {}, channel = "facebook") {
  const pageName = normalizeContextValue(options?.pageName);
  const businessType = normalizeContextValue(options?.businessType);
  const businessDescription = normalizeContextValue(options?.businessDescription);
  const adminKnowledge = normalizeContextValue(options?.adminKnowledge);
  const combinedKnowledge = normalizeContextValue(options?.knowledge);
  const knowledgeSections = normalizeContextValue(options?.knowledgeSections);
  const followUpQuestions = normalizeContextValue(options?.followUpQuestions);
  const knowledgeFormat = normalizeContextValue(options?.knowledgeFormat);
  const productServices = normalizeContextValue(options?.productServices);
  const productServicePriceRanges = normalizeContextValue(options?.productServicePriceRanges);
  const websiteLink = normalizeContextValue(options?.websiteLink);
  const shoppeLink = normalizeContextValue(options?.shoppeLink);
  const lazadaLink = normalizeContextValue(options?.lazadaLink);
  const aiInstruction = normalizeContextValue(options?.aiInstruction || options?.ai_instruction);

  const productServicesValue = productServices || "not available";
  const productServicePriceRangesValue = productServicePriceRanges || "not available";
  const websiteLinkValue = websiteLink || "not available";
  const shoppeLinkValue = shoppeLink || "not available";
  const lazadaLinkValue = lazadaLink || "not available";

  if (!pageName && !businessType && !businessDescription && !adminKnowledge && !combinedKnowledge && !knowledgeSections && !followUpQuestions && !productServices && !productServicePriceRanges && !websiteLink && !shoppeLink && !lazadaLink && !aiInstruction) {
    return [];
  }

  const channelLabel = CHANNEL_LABELS[channel] || CHANNEL_LABELS.facebook;
  const contextParts = [];

  if (pageName) contextParts.push(`${channelLabel}: ${pageName}`);
  if (businessType) contextParts.push(`Business type: ${businessType}`);
  if (businessDescription) contextParts.push(`Business description:\n${businessDescription}`);
  if (adminKnowledge) contextParts.push(`Admin knowledge base:\n${adminKnowledge}`);
  if (combinedKnowledge) contextParts.push(`Business knowledge:\n${combinedKnowledge}`);
  if (knowledgeSections) contextParts.push(`Knowledge sections:\n${knowledgeSections}`);
  if (followUpQuestions) contextParts.push(`Follow-up guidance:\n${followUpQuestions}`);
  if (knowledgeFormat) contextParts.push(`Knowledge format guidance:\n${knowledgeFormat}`);

  contextParts.push(`Products/Services: ${productServicesValue}`);
  contextParts.push(`Product/service price range: ${productServicePriceRangesValue}`);

  if (channel !== "shopee") contextParts.push(`Shopee link: ${shoppeLinkValue}`);
  if (channel !== "lazada") contextParts.push(`Lazada link: ${lazadaLinkValue}`);
  if (channel !== "instagram" && channel !== "tiktok") contextParts.push(`Website link: ${websiteLinkValue}`);

  if (aiInstruction) {
    contextParts.push(`AI Instruction (tone, style, and behavior constraints):\n${aiInstruction}`);
  }

  contextParts.push(
    `Use all ${channelLabel} context sources together to guide replies. Your reply must be highly conversational, warm, smart, and adaptive to the customer's phrasing and language (English, Tagalog, or Taglish). Align fully to the business facts provided here. Never mention section names, source names, or internal guidelines. Be natural, clear, and direct. If a link is 'not available', state it conversationally without inventing URLs. Do not make up facts, specifications, or policies not listed.`
  );

  return [
    {
      role: "system",
      content: contextParts.join("\n"),
    },
  ];
}

function buildHomepageSystemPrompt() {
  return `You are Hermes's homepage AI assistant.\n\nRules:\n- Explain the product clearly and in more detail when asked.\n- Focus on what Hermes does, how it helps businesses, and how the modules work together.\n- Keep the tone friendly, natural, and helpful.\n- Reply in the user's language, including Taglish when appropriate.\n- Do not mention Facebook page details, other channels, or internal routing.\n- Do not suggest visiting a website link unless the user explicitly asks for it.\n- Do not invent pricing, guarantees, or unsupported features.\n- If information is missing, say that it is not listed yet and offer to clarify the available modules.`;
}

function buildFacebookSystemPrompt() {
  return buildChannelSystemPrompt("facebook");
}

function getLatestUserMessage(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      return typeof messages[i].content === "string" ? messages[i].content : String(messages[i].content || "");
    }
  }
  return "";
}

function normalizeContextValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getGroqCredentials(options = {}) {
  const isHomepageSurface = normalizeContextValue(options?.surface) === "homepage";

  if (isHomepageSurface) {
    return {
      apiKey:
        normalizeApiKey(process.env.HOME_GROQ_API_KEY) ||
        normalizeApiKey(process.env.GROQ_API_KEY) ||
        normalizeApiKey(process.env.VITE_GROQ_API_KEY),
      model: process.env.HOME_GROQ_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      isHomepageSurface: true,
    };
  }

  return {
    apiKey:
      normalizeApiKey(process.env.GROQ_API_KEY) ||
      normalizeApiKey(process.env.VITE_GROQ_API_KEY) ||
      normalizeApiKey(process.env.XAI_API_KEY),
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    isHomepageSurface: false,
  };
}

function buildHomepageContextMessages(options = {}) {
  const businessType = normalizeContextValue(options?.businessType);
  const productServices = normalizeContextValue(options?.productServices);
  const productServicePriceRanges = normalizeContextValue(options?.productServicePriceRanges);

  const productServicesValue = productServices || "not available";
  const productServicePriceRangesValue = productServicePriceRanges || "not available";

  if (!businessType && !productServices && !productServicePriceRanges) {
    return [];
  }

  const contextParts = ["Homepage product context:"];

  if (businessType) {
    contextParts.push(`Business type: ${businessType}`);
  }

  contextParts.push(`Products/Services: ${productServicesValue}`);
  contextParts.push(`Product/service price range: ${productServicePriceRangesValue}`);

  contextParts.push(
    "Use this context to explain Hermes clearly. Prioritize Products/Services details when the user asks what the platform does, and do not mention website or social links unless the user specifically asks. Do not invent missing product details."
  );

  return [
    {
      role: "system",
      content: contextParts.join("\n"),
    },
  ];
}

function buildFacebookContextMessages(options = {}) {
  return buildChannelContextMessages(options, "facebook");
}

function isInSupportedScope(text, options = {}) {
  if (!options || Object.keys(options).length === 0) {
    return true;
  }

  const omniChannels = ["facebook", "instagram", "tiktok", "shopee", "lazada", "facebook_comment"];
  if (omniChannels.includes(options?.channel) || options?.multilingual === true) {
    return true;
  }

  if (
    options?.businessType ||
    options?.pageName ||
    options?.businessDescription ||
    options?.adminKnowledge ||
    options?.knowledge ||
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
}

function buildOutOfScopeResponse(model) {
  return {
    id: "restricted_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: `I can only help with: ${SUPPORTED_TOPICS.join(", ")}.`,
      },
    ],
    model: model || DEFAULT_MODEL,
    stop_reason: "end_turn",
    restricted: true,
  };
}

function buildBusinessContextFallback(model, options = {}) {
  const pageName = typeof options.pageName === "string" ? options.pageName.trim() : "";
  const businessDescription =
    typeof options.businessDescription === "string"
      ? options.businessDescription.trim()
      : typeof options.knowledge === "string"
        ? options.knowledge.trim()
        : "";
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

  if (businessDescription) {
    parts.push(businessDescription);
  } else if (productServices) {
    parts.push(productServices);
  } else {
    parts.push("We don't have listed services yet. Please ask our team for details.");
  }

  if (normalizeContextValue(options?.surface) === "homepage") {
    if (productServices) {
      parts.push("This homepage assistant focuses on Hermes features and how the modules work together.");
    }
  } else {
    if (websiteLink) parts.push(`Website: ${websiteLink}`);
    if (shoppeLink) parts.push(`Shopee: ${shoppeLink}`);
    if (lazadaLink) parts.push(`Lazada: ${lazadaLink}`);
  }

  return {
    id: "context_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: parts.join(" ") }],
    model: model || DEFAULT_MODEL,
    stop_reason: "end_turn",
  };
}

function normalizeMessages(messages = []) {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : String(m.content || ""),
  }));
}

function buildPromptedMessages(messages = [], options = {}) {
  const isHomepageSurface = normalizeContextValue(options?.surface) === "homepage";
  const channel = normalizeContextValue(options?.channel);
  const isChannelChat = ["facebook", "instagram", "tiktok", "shopee", "lazada", "facebook_comment"].includes(channel);

  if (isHomepageSurface) {
    return [
      { role: "system", content: buildHomepageSystemPrompt() },
      ...buildHomepageContextMessages(options),
      ...normalizeMessages(messages),
    ];
  }

  if (isChannelChat) {
    return [
      { role: "system", content: buildChannelSystemPrompt(channel) },
      ...buildChannelContextMessages(options, channel),
      ...normalizeMessages(messages),
    ];
  }

  return [
    { role: "system", content: "You are a helpful, knowledgeable AI assistant for the Hermes enterprise platform. Provide clear, accurate, and actionable responses. Reply in the user's language." },
    ...normalizeMessages(messages),
  ];
}

async function callViaOpenRouter({ messages, model, options, apiKey }) {
  const mappedModel = OPENROUTER_MODEL_MAP[model] || model || "anthropic/claude-3.5-sonnet";

  const buildPayload = (selectedModel) => ({
    model: selectedModel,
    messages: buildPromptedMessages(messages, options),
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature ?? 0.7,
  });

  let response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildPayload(mappedModel)),
  });

  let data = await response.json();

  if (!response.ok && response.status === 404) {
    response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildPayload("openrouter/auto")),
    });
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "OpenRouter request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content || "No response text returned.";
  return {
    id: data.id || "msg_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || mappedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

// OpenClaude Service Routes
router.get("/health", (req, res) => {
  const provider = process.env.GROQ_API_KEY || process.env.XAI_API_KEY
    ? "groq"
    : process.env.NVIDIA_API_KEY
    ? "nvidia"
    : process.env.GEMINI_API_KEY
    ? "gemini"
    : process.env.OPENROUTER_API_KEY
    ? "openrouter"
    : process.env.OPENCLAUDE_API_KEY
    ? "anthropic"
    : process.env.CEREBRAS_API_KEY_FB || process.env.CEREBRAS_API_KEY
    ? "cerebras"
    : "demo";

  res.json({
    status: "healthy",
    service: "OpenClaude",
    provider,
    configured: Boolean(process.env.GROQ_API_KEY || process.env.XAI_API_KEY || process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENCLAUDE_API_KEY || process.env.CEREBRAS_API_KEY_FB || process.env.CEREBRAS_API_KEY),
    timestamp: new Date().toISOString()
  });
});

router.post("/chat", async (req, res) => {
  const { messages, model, options } = req.body;

  try {
    logger.debug({
      surface: typeof options?.surface === "string" ? options.surface : null,
      hasOptions: Boolean(options),
      pageName: typeof options?.pageName === "string" ? options.pageName : null,
      businessType: typeof options?.businessType === "string" ? options.businessType : null,
      businessDescription:
        typeof options?.businessDescription === "string"
          ? options.businessDescription.slice(0, 200)
          : typeof options?.knowledge === "string"
            ? options.knowledge.slice(0, 200)
            : null,
      adminKnowledge:
        typeof options?.adminKnowledge === "string"
          ? options.adminKnowledge.slice(0, 200)
          : null,
      productServices: typeof options?.productServices === "string"
        ? options.productServices.slice(0, 200)
        : null,
      productServicePriceRanges:
        typeof options?.productServicePriceRanges === "string"  ? options.productServicePriceRanges : null,
      websiteLink: typeof options?.websiteLink === "string" ? options.websiteLink : null,
      shoppeLink: typeof options?.shoppeLink === "string" ? options.shoppeLink : null,
      lazadaLink: typeof options?.lazadaLink === "string" ? options.lazadaLink : null,
    }, "openclaude/chat options");
  } catch (e) {
    /* ignore logging errors */
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const latestUserText = getLatestUserMessage(messages);
  if (!isInSupportedScope(latestUserText, options || {})) {
    const hasContext = Boolean(
      options?.businessType ||
        options?.pageName ||
        options?.businessDescription ||
        options?.adminKnowledge ||
        options?.knowledge ||
        options?.productServices ||
        options?.websiteLink ||
        options?.shoppeLink ||
        options?.lazadaLink
    );
    if (hasContext) {
      return res.status(200).json(buildBusinessContextFallback(model, options));
    }

    return res.status(200).json(buildOutOfScopeResponse(model));
  }

  if (options && String(options.surface) === "homepage" && process.env.HOME_GROQ_API_KEY) {
    try {
      const chosenModel = model || process.env.HOME_GROQ_MODEL || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
      const data = await callViaGroq({ messages, model: chosenModel, options, apiKey: process.env.HOME_GROQ_API_KEY });
      return res.status(200).json(data);
    } catch (error) {
      logger.error({ err: error }, "OpenClaude /chat (homepage) error");
      return res.status(error.status || 500).json({
        error: "Failed to call Groq (homepage)",
        message: error.message,
      });
    }
  }

  try {
    const data = await callOpenClaude({ messages, model, options });
    return res.status(200).json(data);
  } catch (error) {
    logger.error({ err: error }, "OpenClaude /chat error");
    return res.status(error.status || 500).json({
      error: "Failed to call OpenClaude API",
      message: error.message,
    });
  }
});

router.post("/crm-insights", (req, res) => {
  res.status(501).json({
    error: "CRM insights endpoint is not yet implemented. Use /ai/quick-action with action crm_insights instead.",
  });
});

router.post("/erp-docs", (req, res) => {
  res.status(501).json({
    error: "ERP docs endpoint is not yet implemented.",
  });
});

router.post("/analytics-insights", (req, res) => {
  res.status(501).json({
    error: "Analytics insights endpoint is not yet implemented. Use /ai/quick-action with action kpi_analysis instead.",
  });
});

router.post("/market-research", (req, res) => {
  res.status(501).json({
    error: "Market research endpoint is not yet implemented. Use /ai/market-research instead.",
  });
});

router.callOpenClaude = callOpenClaude;
module.exports = router;
