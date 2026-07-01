/**
 * Groq AI Service — proxy wrapper around the Express backend.
 *
 * All requests go through /api/ai/* so the API key never leaves the server.
 * This mirrors groqAI.js but exposes the legacy GroqService class shape
 * in case any consumer still imports it.
 */
import { supabase } from '../../config/supabaseClient';

const RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = RAW.endsWith('/api')
  ? RAW
  : RAW
    ? `${RAW}/api`
    : import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : '/api';

async function getBearerToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  } catch {
    return '';
  }
}

async function backendPost(path, body) {
  const token = await getBearerToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `AI backend error ${res.status}`);
  }
  return json;
}

class GroqService {
  constructor() {
    this.defaultModel = 'llama-3.1-8b-instant';
    this.premiumModel = 'llama-3.1-70b-versatile';
  }

  async chatCompletion(messages, model = this.defaultModel, options = {}) {
    return backendPost('/ai/chat', { messages, model, ...options });
  }

  async chat(message, options = {}) {
    const res = await backendPost('/ai/chat', {
      messages: [{ role: 'user', content: message }],
      model: options.model || this.defaultModel,
      max_tokens: options.maxTokens || 1024,
    });
    return res.data?.content || res.reply || '';
  }

  async generateCRMInsights(customerData, options = {}) {
    const prompt = `Analyze customer data and provide JSON with keys: sentiment, actions, risk, opportunities.\n\nData: ${JSON.stringify(customerData)}`;
    const text = await this.chat(prompt, { model: this.premiumModel });
    try { return JSON.parse(text); } catch { return { rawResponse: text }; }
  }

  async generateERPDocs(context, options = {}) {
    return this.chat(
      `Generate ERP documentation for:\n${JSON.stringify(context)}`,
      { model: this.premiumModel, maxTokens: 2048 }
    );
  }

  async generateAnalyticsInsights(data, options = {}) {
    const prompt = `Analyze business data and return JSON with keys: trends, metrics, recommendations, forecast.\n\nData: ${JSON.stringify(data)}`;
    const text = await this.chat(prompt);
    try { return JSON.parse(text); } catch { return { rawResponse: text }; }
  }

  async generateMarketResearch(topic, options = {}) {
    return this.chat(
      `Create a market research template for: ${topic}`,
      { model: this.premiumModel, maxTokens: 2048 }
    );
  }

  async health() {
    try {
      const token = await getBearerToken();
      const res = await fetch(`${API_BASE}/ai/health`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.ok ? { status: 'healthy' } : { status: 'unhealthy' };
    } catch (err) {
      return { status: 'unhealthy', error: err.message };
    }
  }
}

export default new GroqService();
