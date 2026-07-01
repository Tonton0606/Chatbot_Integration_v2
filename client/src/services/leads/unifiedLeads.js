/**
 * Unified Leads Service
 * Wraps /api/leads REST endpoints (unified ingest table — facebook, google_maps, web_form, csv_import, manual).
 * Distinct from the CRM leads pipeline (crm_leads table / sales_crm/leads.js).
 */

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

export const UNIFIED_SOURCES = ['facebook', 'google_maps', 'web_form', 'manual', 'csv_import'];
export const UNIFIED_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost', 'archived'];

export const SOURCE_LABELS = {
  facebook:    'Facebook',
  google_maps: 'Google Maps',
  web_form:    'Web Form',
  manual:      'Manual',
  csv_import:  'CSV Import',
};

export const STATUS_COLORS = {
  new:       'var(--brand-gold)',
  contacted: 'var(--info)',
  qualified: 'var(--success)',
  converted: 'var(--success)',
  lost:      'var(--danger)',
  archived:  'var(--text-muted)',
};

function getHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  const workspaceId = localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';
  return {
    'Content-Type': 'application/json',
    'x-workspace-id': workspaceId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}/leads${path}`, {
    headers: getHeaders(),
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Leads API error ${res.status}`);
  return json;
}

/**
 * List leads from the unified ingest table.
 * @param {object} filters - { source, status, assigned_to, search, limit, offset }
 * @returns {{ data: Lead[], total: number }}
 */
export async function getUnifiedLeads(filters = {}) {
  const params = new URLSearchParams();
  if (filters.source && UNIFIED_SOURCES.includes(filters.source)) params.set('source', filters.source);
  if (filters.status && UNIFIED_STATUSES.includes(filters.status)) params.set('status', filters.status);
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const qs = params.toString();
  return apiFetch(qs ? `?${qs}` : '/');
}

/**
 * Get a single lead by ID.
 * @returns {{ data: Lead }}
 */
export async function getUnifiedLead(id) {
  return apiFetch(`/${id}`);
}

/**
 * Update a lead's status, assignment, score, or notes.
 * @param {string} id
 * @param {{ status?, assigned_to?, score?, notes? }} updates
 * @returns {{ data: Lead }}
 */
export async function updateUnifiedLead(id, updates) {
  return apiFetch(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Ingest a lead manually from the frontend.
 * @param {{ source, name?, email?, phone?, companyName?, notes?, rawData? }} payload
 * @returns {{ data: Lead }}
 */
export async function ingestLead(payload) {
  return apiFetch('/ingest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Upload a CSV file for bulk lead import.
 * Sends multipart/form-data — do NOT set Content-Type manually.
 * @param {File} file
 * @returns {{ imported: number, updated: number, errors: Array }}
 */
export async function importLeadsCSV(file) {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  const workspaceId = localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/leads/import`, {
    method: 'POST',
    headers: {
      'x-workspace-id': workspaceId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Import error ${res.status}`);
  return json;
}

/**
 * Compute source breakdown counts from a lead list (client-side, no extra fetch).
 * @param {Lead[]} leads
 * @returns {{ [source]: number }}
 */
export function groupBySource(leads) {
  return leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Compute status breakdown counts from a lead list (client-side).
 * @param {Lead[]} leads
 * @returns {{ [status]: number }}
 */
export function groupByStatus(leads) {
  return leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Aggregate service object — consumed by AdminUnifiedLeads as a namespace.
 * Mirrors the notificationService/kpiService export convention.
 */
export const unifiedLeadsService = {
  UNIFIED_SOURCES,
  UNIFIED_STATUSES,
  SOURCE_LABELS,
  STATUS_COLORS,
  getUnifiedLeads,
  getUnifiedLead,
  updateUnifiedLead,
  ingestLead,
  importLeadsCSV,
  groupBySource,
  groupByStatus,
};
