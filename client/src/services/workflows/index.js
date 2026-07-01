/**
 * Workflow Automation — Client API Service
 * CRUD for workflow rules + trigger execution + execution history
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  // Attach auth token
  try {
    const { supabase } = await import('../../config/supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

    // Attach workspace ID
    const wsId = localStorage.getItem('workspace_id') || localStorage.getItem('exponify_active_client_workspace_id') || '';
    if (wsId) headers['x-workspace-id'] = wsId;
  } catch { /* optional */ }

  const config = { ...options, headers };
  if (config.body && typeof config.body === 'object') config.body = JSON.stringify(config.body);

  const response = await fetch(url, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `API Error: ${response.status}`);
  return data;
}

// ── Rules ───────────────────────────────────────────────────

export async function getWorkflowRules() {
  return apiRequest('/workflows');
}

export async function getWorkflowRule(id) {
  return apiRequest(`/workflows/${id}`);
}

export async function createWorkflowRule(ruleData) {
  return apiRequest('/workflows', { method: 'POST', body: ruleData });
}

export async function updateWorkflowRule(id, updates) {
  return apiRequest(`/workflows/${id}`, { method: 'PATCH', body: updates });
}

export async function deleteWorkflowRule(id) {
  return apiRequest(`/workflows/${id}`, { method: 'DELETE' });
}

// ── Trigger ─────────────────────────────────────────────────

export async function triggerWorkflow({ trigger_module, trigger_event, trigger_data }) {
  return apiRequest('/workflows/trigger', {
    method: 'POST',
    body: { trigger_module, trigger_event, trigger_data },
  });
}

// ── Execution History ───────────────────────────────────────

export async function getWorkflowExecutions({ limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  return apiRequest(`/workflows/executions?${params}`);
}

// ── Templates ───────────────────────────────────────────────

export async function getWorkflowTemplates() {
  return apiRequest('/workflows/templates');
}

export default {
  getWorkflowRules,
  getWorkflowRule,
  createWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
  triggerWorkflow,
  getWorkflowExecutions,
  getWorkflowTemplates,
};