/**
 * BIR Tax Compliance Service
 * Covers: VAT, EWT, tax filings, ATC codes, dashboard
 */

import { withAuthHeaders } from '../apiAuth';

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiFetch(path, options = {}, workspaceId) {
  const wsId = workspaceId || localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(wsId ? { 'x-workspace-id': wsId } : {}),
      ...(await withAuthHeaders()),
      ...options.headers,
    },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `API error ${res.status}`);
  return json;
}

// ── ATC Codes ─────────────────────────────────────────────────────────────────

export async function getATCCodes(category) {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  const json = await apiFetch(`/bir/atc-codes${params}`);
  return json.data;
}

// ── VAT Records ───────────────────────────────────────────────────────────────

export async function getVATRecords(workspaceId, { month, year, type } = {}) {
  const p = new URLSearchParams();
  if (month) p.set('month', month);
  if (year)  p.set('year',  year);
  if (type)  p.set('type',  type);
  const json = await apiFetch(`/bir/vat${p.size ? '?' + p : ''}`, {}, workspaceId);
  return json;
}

export async function createVATRecord(workspaceId, payload) {
  const json = await apiFetch('/bir/vat', { method: 'POST', body: JSON.stringify(payload) }, workspaceId);
  return json.data;
}

export async function deleteVATRecord(workspaceId, id) {
  await apiFetch(`/bir/vat/${id}`, { method: 'DELETE' }, workspaceId);
}

// ── EWT Records ───────────────────────────────────────────────────────────────

export async function getEWTRecords(workspaceId, { month, year, remittance_status } = {}) {
  const p = new URLSearchParams();
  if (month)              p.set('month', month);
  if (year)               p.set('year',  year);
  if (remittance_status)  p.set('remittance_status', remittance_status);
  const json = await apiFetch(`/bir/ewt${p.size ? '?' + p : ''}`, {}, workspaceId);
  return json;
}

export async function createEWTRecord(workspaceId, payload) {
  const json = await apiFetch('/bir/ewt', { method: 'POST', body: JSON.stringify(payload) }, workspaceId);
  return json.data;
}

export async function updateEWTRecord(workspaceId, id, updates) {
  const json = await apiFetch(`/bir/ewt/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, workspaceId);
  return json.data;
}

// ── Tax Filings ───────────────────────────────────────────────────────────────

export async function getTaxFilings(workspaceId, { year, form_type } = {}) {
  const p = new URLSearchParams();
  if (year)       p.set('year', year);
  if (form_type)  p.set('form_type', form_type);
  const json = await apiFetch(`/bir/filings${p.size ? '?' + p : ''}`, {}, workspaceId);
  return json.data;
}

export async function createTaxFiling(workspaceId, payload) {
  const json = await apiFetch('/bir/filings', { method: 'POST', body: JSON.stringify(payload) }, workspaceId);
  return json.data;
}

export async function updateTaxFiling(workspaceId, id, updates) {
  const json = await apiFetch(`/bir/filings/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, workspaceId);
  return json.data;
}

export async function generateFilingCalendar(workspaceId, year) {
  const json = await apiFetch('/bir/filings/generate-calendar', { method: 'POST', body: JSON.stringify({ year }) }, workspaceId);
  return json;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getBIRDashboard(workspaceId, { year, month } = {}) {
  const p = new URLSearchParams();
  if (year)  p.set('year',  year);
  if (month) p.set('month', month);
  const json = await apiFetch(`/bir/dashboard${p.size ? '?' + p : ''}`, {}, workspaceId);
  return json.data;
}

// ── Reference Data ────────────────────────────────────────────────────────────

export const PH_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const FILING_STATUS_COLORS = {
  upcoming: 'bg-blue-100 text-blue-800',
  filed:    'bg-green-100 text-green-800',
  overdue:  'bg-red-100 text-red-800',
  exempt:   'bg-gray-100 text-gray-600',
};

export const BIR_FORM_LABELS = {
  '2550M':  'Monthly VAT (2550M)',
  '2550Q':  'Quarterly VAT (2550Q)',
  '1601C':  'WHT Compensation (1601-C)',
  '1601EQ': 'EWT Alphalist (1601-EQ)',
  '0619E':  'EWT Remittance (0619-E)',
  '1702RT': 'Annual ITR (1702-RT)',
  '1702Q':  'Quarterly ITR (1702-Q)',
};
