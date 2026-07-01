/**
 * Unified AI Service — client-side SDK for all Groq AI endpoints
 * Admin, Client Workspace, and Landing Page contexts
 */

// Re-export legacy modules so existing components don't break
export { default as aiModules } from './modules.js';
export { default as groqAI }    from './groqAI.js';

import { supabase } from '../../config/supabaseClient';

const RAW  = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const BASE = RAW.endsWith("/api") ? RAW : `${RAW}/api`;

function getStoredWorkspaceId() {
  try {
    return (
      localStorage.getItem('exponify_active_client_workspace_id') ||
      localStorage.getItem('workspaceId') ||
      localStorage.getItem('workspace_id') ||
      null
    );
  } catch {
    return null;
  }
}

async function getAuthHeaders() {
  const headers = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {
    // continue without auth header
  }
  const wsId = getStoredWorkspaceId();
  if (wsId) headers['x-workspace-id'] = wsId;
  return headers;
}

async function post(path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) throw new Error(json.error || `AI API error ${res.status}`);
  return json;
}

async function get(path) {
  const res  = await fetch(`${BASE}${path}`, { headers: await getAuthHeaders() });
  return res.json();
}

// ── Health ─────────────────────────────────────────────────────────────────────
export const getAIHealth = () => get("/ai/health");
export const getAIModels = () => get("/ai/models");

// ── Unified Chatbot (admin + client) ─────────────────────────────────────────
export async function askExponifyAI({ query, history = [], moduleContext = "", contextData = {}, model, role = "admin" }) {
  return post("/ai/chat/ask", { query, history, moduleContext, contextData, model, role });
}

// ── Legacy aliases (backward compat) ───────────────────────────────────────────
export async function askAdminAI({ query, history = [], moduleContext = "", contextData = {}, model }) {
  return post("/ai/chat/ask", { query, history, moduleContext, contextData, model, role: "admin" });
}

export async function askClientAI({ query, history = [], moduleContext = "", model }) {
  return post("/ai/chat/ask", { query, history, moduleContext, model, role: "client" });
}

// ── Quick Actions ──────────────────────────────────────────────────────────────
export async function runQuickAction({ action, contextData = {}, role = "admin", model, customPrompt }) {
  return post("/ai/quick-action", { action, contextData, role, model, customPrompt });
}

export const budgetStatusAI    = (d) => runQuickAction({ action: "budget_status",     contextData: d });
export const crmInsightsAI     = (d) => runQuickAction({ action: "crm_insights",      contextData: d });
export const leadScoreAI       = (d) => runQuickAction({ action: "lead_score",        contextData: d });
export const kpiAnalysisAI     = (d) => runQuickAction({ action: "kpi_analysis",      contextData: d });
export const revenueInsightsAI = (d) => runQuickAction({ action: "revenue_insights",  contextData: d });
export const taskPrioritizeAI  = (d) => runQuickAction({ action: "task_prioritize",   contextData: d });
export const fraudSummaryAI    = (d) => runQuickAction({ action: "fraud_summary",     contextData: d });
export const cashFlowAI        = (d) => runQuickAction({ action: "cash_flow_insight", contextData: d });
export const draftEmailAI      = (d) => runQuickAction({ action: "email_draft",       contextData: d });
export const journalEntryAI    = (d) => runQuickAction({ action: "journal_entry",     contextData: d });
export const invoiceFollowUpAI = (d) => runQuickAction({ action: "invoice_follow_up", contextData: d });

// ── AI Write ───────────────────────────────────────────────────────────────────
export async function aiWrite({ type, context = {}, tone = "professional", language = "English", model }) {
  return post("/ai/write", { type, context, tone, language, model });
}

export const writeEmail        = (ctx, tone) => aiWrite({ type: "email",         context: ctx, tone });
export const writeProposal     = (ctx)       => aiWrite({ type: "proposal",      context: ctx });
export const writeSummary      = (ctx)       => aiWrite({ type: "summary",       context: ctx });
export const writeJobPost      = (ctx)       => aiWrite({ type: "job_post",      context: ctx });
export const writeMeetingNotes = (ctx)       => aiWrite({ type: "meeting_notes", context: ctx });
export const writeSOP          = (ctx)       => aiWrite({ type: "sop",           context: ctx });
export const writeReport       = (ctx)       => aiWrite({ type: "report",        context: ctx });

// ── Generic Chat ───────────────────────────────────────────────────────────────
export async function genericChat({ messages, systemPrompt, model, temperature, maxTokens }) {
  return post("/ai/chat", { messages, systemPrompt, model, temperature, maxTokens });
}

// ── Domain-specific ────────────────────────────────────────────────────────────
export const getCRMInsights    = (data, q) => post("/ai/crm-insights", { crmData: data, query: q });
export const getMarketResearch = (params)  => post("/ai/market-research", params);

// ── KB Refresh ─────────────────────────────────────────────────────────────────
export const refreshAIKnowledge = () => post("/ai/kb/refresh", {});
