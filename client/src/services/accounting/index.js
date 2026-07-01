/**
 * Accounting Service — Chart of Accounts, Journal Entries, GL, Trial Balance
 */

import { withAuthHeaders } from '../apiAuth';

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(await withAuthHeaders(options.headers)), ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || `API error ${res.status}`);
  return json;
}

function getWsId() {
  try { return localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || null; }
  catch { return null; }
}

// ── Chart of Accounts ─────────────────────────────────────────────────────────

export async function getAccounts(workspaceId, filters = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  const params = new URLSearchParams({ workspaceId: wsId, ...filters });
  const json = await apiFetch(`/accounting/accounts?${params}`);
  return json.data;
}

export async function createAccount(workspaceId, payload) {
  const json = await apiFetch('/accounting/accounts', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  return json.data;
}

export async function updateAccount(id, updates) {
  const json = await apiFetch(`/accounting/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return json.data;
}

export async function deleteAccount(id) {
  const json = await apiFetch(`/accounting/accounts/${id}`, { method: 'DELETE' });
  return json.data;
}

export async function seedDefaultAccounts(workspaceId) {
  const json = await apiFetch('/accounting/accounts/seed', {
    method: 'POST',
    body: JSON.stringify({ workspaceId }),
  });
  return json.data;
}

// ── Journal Entries ───────────────────────────────────────────────────────────

export async function getJournalEntries(workspaceId, filters = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  const params = new URLSearchParams({ workspaceId: wsId, ...filters });
  const json = await apiFetch(`/accounting/journal-entries?${params}`);
  return json.data;
}

export async function getJournalEntry(id) {
  const json = await apiFetch(`/accounting/journal-entries/${id}`);
  return json.data;
}

export async function createJournalEntry(workspaceId, payload) {
  const json = await apiFetch('/accounting/journal-entries', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  return json.data;
}

export async function postJournalEntry(id, { postedBy } = {}) {
  const json = await apiFetch(`/accounting/journal-entries/${id}/post`, {
    method: 'PATCH',
    body: JSON.stringify({ postedBy }),
  });
  return json.data;
}

export async function reverseJournalEntry(id, payload) {
  const json = await apiFetch(`/accounting/journal-entries/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return json.data;
}

// ── General Ledger ────────────────────────────────────────────────────────────

export async function getLedger(accountId, { dateFrom, dateTo, limit } = {}) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (limit) params.set('limit', limit);
  const json = await apiFetch(`/accounting/ledger/${accountId}?${params}`);
  return json.data;
}

export async function getTrialBalance(workspaceId) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return { accounts: [], totalDebits: 0, totalCredits: 0, isBalanced: true };
  const json = await apiFetch(`/accounting/trial-balance?workspaceId=${wsId}`);
  return json.data;
}

// ── Financial Reports ─────────────────────────────────────────────────────────

export async function getIncomeStatement(workspaceId, { dateFrom, dateTo } = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return null;
  const params = new URLSearchParams({ workspaceId: wsId });
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  const json = await apiFetch(`/accounting/reports/income-statement?${params}`);
  return json.data;
}

export async function getBalanceSheet(workspaceId) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return null;
  const json = await apiFetch(`/accounting/reports/balance-sheet?workspaceId=${wsId}`);
  return json.data;
}

export async function getArAging(workspaceId) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return null;
  const json = await apiFetch(`/accounting/reports/ar-aging?workspaceId=${wsId}`);
  return json.data;
}
