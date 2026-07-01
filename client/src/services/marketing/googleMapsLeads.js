/**
 * Google Maps Lead Generator - Client API Service
 * 
 * Provides methods to interact with the backend Google Maps lead generation API.
 */

const API_ROOT = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_BASE = `${API_ROOT}/marketing/google-maps-leads`;
const HEALTH_CHECK_TIMEOUT = 15000;
const REQUEST_TIMEOUT = 30000;

/**
 * Get the auth token from Supabase session
 */
async function getAuthToken() {
  const { supabase } = await import('../../config/supabaseClient');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  if (!token && session) {
    await supabase.auth.signOut();
  }
  return token;
}

/**
 * Get the workspace ID from localStorage. Checks modern keys first, then fallbacks.
 */
function getWorkspaceId() {
  try {
    return (
      localStorage.getItem('workspace_id') ||
      localStorage.getItem('exponify_active_client_workspace_id') ||
      localStorage.getItem('workspaceId') ||
      ''
    );
  } catch {
    return '';
  }
}

// Component can set this once workspace is resolved so all calls carry the right header.
let _workspaceIdOverride = '';

export function setWorkspaceContext(id) {
  _workspaceIdOverride = id || '';
}

/**
 * Build headers with auth token and workspace ID
 */
async function buildHeaders(extraHeaders = {}) {
  const token = await getAuthToken();
  const workspaceId = _workspaceIdOverride || getWorkspaceId();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    ...extraHeaders,
  };
}

/**
 * Handle API response
 */
const CONTROLLER_TIMEOUT_MS = REQUEST_TIMEOUT;

function createFetchOptions(extra = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONTROLLER_TIMEOUT_MS);
  return {
    ...extra,
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data.error ||
      data.message ||
      (response.status === 404
        ? 'API endpoint not found. The backend may be starting up or misconfigured.'
        : response.status === 503
          ? 'Service temporarily unavailable. Please try again.'
          : `Request failed (HTTP ${response.status})`);
    throw new Error(message);
  }
  return data;
}

/**
 * Check if the Google Maps lead service is available/configured
 */
export async function checkHealth() {
  try {
    const headers = await buildHeaders();
    const options = createFetchOptions({ headers });
    try {
      const response = await fetch(`${API_BASE}/health`, options);
      options.cleanup();
      const result = await handleResponse(response);
      return result.data;
    } catch (err) {
      options.cleanup();
      if (err.name === 'AbortError') {
        return {
          service_available: false,
          serper_configured: false,
          llm_configured: false,
          error: 'Health check timed out',
        };
      }
      throw err;
    }
  } catch (err) {
    return {
      service_available: false,
      serper_configured: false,
      llm_configured: false,
      error: err.message || 'Health check failed',
    };
  }
}

/**
 * Get all search configs for the current workspace
 */
export async function getSearchConfigs() {
  const headers = await buildHeaders();
  const options = createFetchOptions({ headers });
  try {
    const response = await fetch(`${API_BASE}/configs`, options);
    options.cleanup();
    const result = await handleResponse(response);
    return result.data;
  } catch (err) {
    options.cleanup();
    if (err.name === 'AbortError') {
      throw new Error('Request timed out loading search configs');
    }
    throw err;
  }
}

/**
 * Start a new Google Maps search
 * 
 * @param {Object} params
 * @param {string} params.location - City/location to search in
 * @param {string} params.search_query - Business type to search for
 * @param {number} params.num_pages - Number of pages (20 results each), max 10
 * @param {string} params.search_label - Optional label for the search
 * @param {boolean} params.enrichment_enabled - Whether to run AI enrichment
 */
export async function startSearch(params) {
  const headers = await buildHeaders();
  const options = createFetchOptions({
    headers,
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
  try {
    const response = await fetch(`${API_BASE}/search`, options);
    options.cleanup();
    const result = await handleResponse(response);
    return result;
  } catch (err) {
    options.cleanup();
    if (err.name === 'AbortError') {
      throw new Error('Start search request timed out');
    }
    throw err;
  }
}

/**
 * Get all leads for a specific search config
 * 
 * @param {string} configId - Search config UUID
 * @param {Object} filters - Optional filters { enrichment_status, lead_status }
 */
export async function getLeads(configId, filters = {}) {
  const headers = await buildHeaders();
  const form = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
  });
  const qs = form.toString();
  const url = `${API_BASE}/configs/${encodeURIComponent(configId)}/leads${qs ? `?${qs}` : ''}`;
  const options = createFetchOptions({ headers });
  try {
    const response = await fetch(url, options);
    options.cleanup();
    const result = await handleResponse(response);
    return result.data;
  } catch (err) {
    options.cleanup();
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout: ${url}`);
    }
    throw err;
  }
}

/**
 * Update a lead's status, notes, or assignment
 * 
 * @param {string} leadId - Lead UUID
 * @param {Object} updates - { lead_status, notes, assigned_to }
 */
export async function updateLead(leadId, updates) {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE}/leads/${leadId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  const result = await handleResponse(response);
  return result.data;
}

/**
 * Delete a search config and all its leads
 * 
 * @param {string} configId - Search config UUID
 */
export async function deleteSearchConfig(configId) {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE}/configs/${configId}`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse(response);
}

/**
 * Trigger enrichment on pending leads for a search config
 * 
 * @param {string} configId - Search config UUID
 */
export async function runEnrichment(configId) {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE}/configs/${configId}/enrich`, {
    method: 'POST',
    headers,
  });
  return handleResponse(response);
}

export default {
  checkHealth,
  getSearchConfigs,
  startSearch,
  getLeads,
  updateLead,
  deleteSearchConfig,
  runEnrichment,
  setWorkspaceContext,
};