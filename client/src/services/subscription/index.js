/**
 * Subscription Management — Client API Service
 * Stripe-based subscription billing for workspace plans
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

// ── Current Subscription ────────────────────────────────────

export async function getCurrentSubscription() {
  return apiRequest('/subscription/current');
}

// ── Available Plans ─────────────────────────────────────────

export async function getPlans() {
  return apiRequest('/subscription/plans');
}

// ── Checkout ────────────────────────────────────────────────

export async function createCheckoutSession(plan) {
  return apiRequest('/subscription/checkout', {
    method: 'POST',
    body: { plan },
  });
}

// ── Cancel ──────────────────────────────────────────────────

export async function cancelSubscription() {
  return apiRequest('/subscription/cancel', { method: 'POST' });
}

// ── Usage Stats ─────────────────────────────────────────────

export async function getUsageStats() {
  return apiRequest('/subscription/usage');
}

// ── Constants ───────────────────────────────────────────────

export const PLAN_COLORS = {
  free: '#6b7280',
  starter: '#3b82f6',
  professional: '#8b5cf6',
  enterprise: '#d4a017',
};

export const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter — ₱499/mo',
  professional: 'Professional — ₱1,499/mo',
  enterprise: 'Enterprise — ₱4,999/mo',
};

export default {
  getCurrentSubscription,
  getPlans,
  createCheckoutSession,
  cancelSubscription,
  getUsageStats,
};