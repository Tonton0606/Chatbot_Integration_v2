/**
 * Campaign Email Delivery — Client API Service
 * Full pipeline: create campaign → schedule → send → track analytics
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  try {
    const { supabase } = await import('../../config/supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
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

// ── List campaigns ──────────────────────────────────────────

export async function getCampaigns({ limit = 50 } = {}) {
  return apiRequest(`/campaigns?limit=${limit}`);
}

// ── Get single campaign ─────────────────────────────────────

export async function getCampaign(id) {
  return apiRequest(`/campaigns/${id}`);
}

// ── Create campaign ─────────────────────────────────────────

export async function createCampaign(campaignData) {
  return apiRequest('/campaigns', {
    method: 'POST',
    body: campaignData,
  });
}

// ── Update campaign ─────────────────────────────────────────

export async function updateCampaign(id, updates) {
  return apiRequest(`/campaigns/${id}`, {
    method: 'PATCH',
    body: updates,
  });
}

// ── Delete campaign ─────────────────────────────────────────

export async function deleteCampaign(id) {
  return apiRequest(`/campaigns/${id}`, { method: 'DELETE' });
}

// ── Send campaign now ───────────────────────────────────────

export async function sendCampaign(id) {
  return apiRequest(`/campaigns/${id}/send`, { method: 'POST' });
}

// ── Campaign analytics ──────────────────────────────────────

export async function getCampaignAnalytics(id) {
  return apiRequest(`/campaigns/${id}/analytics`);
}

// ── Status Constants ────────────────────────────────────────

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'failed'];

export const CAMPAIGN_STATUS_COLORS = {
  draft: '#6b7280',
  scheduled: '#f59e0b',
  sending: '#3b82f6',
  sent: '#10b981',
  failed: '#ef4444',
};

export const CAMPAIGN_STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};

export default {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  getCampaignAnalytics,
};