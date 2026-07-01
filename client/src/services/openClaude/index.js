/**
 * OpenClaude Service - Intelligence Layer
 * Provides AI-powered features for chatbot, CRM, ERP, and analytics
 */

import { supabase } from '../../config/supabaseClient';

const envApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
const rawApiBase = import.meta.env.DEV
  ? (envApiBase && envApiBase !== "/api" ? envApiBase : "http://localhost:5000/api")
  : (envApiBase || "/api");
const RAW_API_BASE = rawApiBase.replace(/\/$/, "");
const API_BASE_URL = RAW_API_BASE === "/api" || /\/api$/i.test(RAW_API_BASE)
  ? RAW_API_BASE
  : `${RAW_API_BASE}/api`;

async function getAuthHeaders() {
  const headers = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {
    // continue without auth header
  }
  try {
    const wsId = localStorage.getItem('exponify_active_client_workspace_id') || localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id');
    if (wsId) headers['x-workspace-id'] = wsId;
  } catch {
    // storage may throw in private browsing
  }
  return headers;
}

class OpenClaudeService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = new Error(`API error (${response.status}): ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async chatCompletion(messages, model = "claude-3-sonnet-20240229", options = {}) {
    try {
      return await this.request("/openclaude/chat", {
        method: "POST",
        body: JSON.stringify({
          messages,
          model,
          options: {
            maxTokens: options.maxTokens || 2048,
            temperature: options.temperature || 0.7,
            ...options,
          },
        }),
      });
    } catch (error) {
      if (error.status === 404) {
        return this.request("/services/openClaude", {
          method: "POST",
          body: JSON.stringify({
            endpoint: "/messages",
            model,
            max_tokens: options.maxTokens || 1024,
            messages,
            temperature: options.temperature || 0.7,
          }),
        });
      }
      throw error;
    }
  }

  async generateCRMInsights(customerData, options = {}) {
    const prompt = `Analyze the following customer data and provide insights:\n${JSON.stringify(customerData)}\n\nProvide:\n1. Customer sentiment analysis\n2. Recommended actions\n3. Risk assessment\n4. Opportunity identification`;

    return this.chatCompletion([{ role: "user", content: prompt }], "claude-3-sonnet-20240229", options);
  }

  async generateERPDocs(context, options = {}) {
    const prompt = `Generate comprehensive documentation for the following ERP context:\n${JSON.stringify(context)}\n\nInclude:\n1. Process overview\n2. Step-by-step procedures\n3. Best practices\n4. Common issues and solutions`;

    return this.chatCompletion([{ role: "user", content: prompt }], "claude-3-opus-20240229", options);
  }

  async generateAnalyticsInsights(data, options = {}) {
    const prompt = `Analyze the following business data and provide actionable insights:\n${JSON.stringify(data)}\n\nProvide:\n1. Key trends\n2. Performance metrics\n3. Recommendations\n4. Forecast predictions`;

    return this.chatCompletion([{ role: "user", content: prompt }], "claude-3-sonnet-20240229", options);
  }

  async generateMarketResearch(topic, options = {}) {
    const prompt = `Create a comprehensive market research template for: ${topic}\n\nInclude:\n1. Research objectives\n2. Target audience analysis\n3. Competitor analysis framework\n4. Data collection methods\n5. Analysis templates`;

    return this.chatCompletion([{ role: "user", content: prompt }], "claude-3-opus-20240229", options);
  }

  async streamChat(messages, onChunk, model = "claude-3-sonnet-20240229") {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/openclaude/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          messages,
          model,
          options: {
            maxTokens: 2048,
            stream: true,
          },
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        onChunk(chunk);
      }
    } catch (error) {
      throw error;
    }
  }
}

export default new OpenClaudeService();
