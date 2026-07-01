/**
 * Finance & Treasury — Live data service
 * All functions call the Express API which queries Supabase.
 * Falls back to graceful empty state on error (no mock data).
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
  try {
    const stored = localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id');
    return stored || null;
  } catch { return null; }
}

// ── KPIs ───────────────────────────────────────────────────────────────────────

export async function getFinanceKPIs(workspaceId) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return getEmptyKPIs();
  try {
    const json = await apiFetch(`/finance/kpis?workspaceId=${wsId}`);
    return json.data;
  } catch (e) {
    console.warn('[finance] KPIs error:', e.message);
    return getEmptyKPIs();
  }
}

function getEmptyKPIs() {
  return {
    totalRevenue: 0, totalExpenses: 0, netIncome: 0,
    totalBudgetAllocated: 0, totalBudgetSpent: 0, budgetUtilization: 0,
    netCashPosition: 0, pendingApprovals: 0, pendingApprovalValue: 0,
  };
}

// ── Budgets ────────────────────────────────────────────────────────────────────

export async function getBudgets(workspaceId, filters = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  const params = new URLSearchParams({ workspaceId: wsId, ...filters });
  const json = await apiFetch(`/finance/budgets?${params}`);
  return json.data;
}

export async function createBudget(workspaceId, payload) {
  const json = await apiFetch('/finance/budgets', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  return json.data;
}

export async function updateBudget(id, updates) {
  const json = await apiFetch(`/finance/budgets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return json.data;
}

export async function deleteBudget(id) {
  const json = await apiFetch(`/finance/budgets/${id}`, { method: 'DELETE' });
  return json.data;
}

export async function transferBudget(workspaceId, { fromBudgetId, toBudgetId, amount, reason, approvedBy }) {
  const json = await apiFetch('/finance/budgets/transfer', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, fromBudgetId, toBudgetId, amount, reason, approvedBy }),
  });
  return json.data;
}

// ── Transactions / Approvals ───────────────────────────────────────────────────

export async function getTransactions(workspaceId, filters = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  const params = new URLSearchParams({ workspaceId: wsId, ...filters });
  const json = await apiFetch(`/finance/transactions?${params}`);
  return json.data;
}

export async function createTransaction(workspaceId, payload) {
  const json = await apiFetch('/finance/transactions', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  return json.data;
}

export async function approveTransaction(id, { approvedBy, notes } = {}) {
  const json = await apiFetch(`/finance/transactions/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ approvedBy, notes }),
  });
  return json.data;
}

export async function rejectTransaction(id, { rejectedBy, reason } = {}) {
  const json = await apiFetch(`/finance/transactions/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectedBy, reason }),
  });
  return json.data;
}

// ── Treasury / Cash Positions ─────────────────────────────────────────────────

export async function getTreasuryData(workspaceId) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return { cashPositions: [], cashFlow: [], alerts: [], totalCash: 0 };
  try {
    const json = await apiFetch(`/finance/treasury?workspaceId=${wsId}`);
    return json.data;
  } catch (e) {
    console.warn('[finance] Treasury error:', e.message);
    return { cashPositions: [], cashFlow: [], alerts: [], totalCash: 0 };
  }
}

export async function addCashPosition(workspaceId, payload) {
  const json = await apiFetch('/finance/cash-positions', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  return json.data;
}

export async function updateCashPosition(id, updates) {
  const json = await apiFetch(`/finance/cash-positions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return json.data;
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────

export async function getCashFlow(workspaceId, { dateFrom, dateTo } = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  const params = new URLSearchParams({ workspaceId: wsId });
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  const json = await apiFetch(`/finance/cash-flow?${params}`);
  return json.data;
}

export async function addCashFlowEntry(workspaceId, payload) {
  const json = await apiFetch('/finance/cash-flow', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  return json.data;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(workspaceId, filters = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  const params = new URLSearchParams({ workspaceId: wsId, ...filters });
  try {
    const json = await apiFetch(`/finance/alerts?${params}`);
    return json.data;
  } catch { return []; }
}

export async function resolveAlert(id, { resolvedBy, notes } = {}) {
  const json = await apiFetch(`/finance/alerts/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolvedBy, notes }),
  });
  return json.data;
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export async function getVendors(workspaceId, filters = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  const params = new URLSearchParams({ workspaceId: wsId, ...filters });
  const json = await apiFetch(`/finance/vendors?${params}`);
  return json.data;
}

export async function createVendor(workspaceId, payload) {
  const json = await apiFetch('/finance/vendors', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, ...payload }),
  });
  return json.data;
}

export async function updateVendor(id, updates) {
  const json = await apiFetch(`/finance/vendors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return json.data;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getPnLReport(workspaceId, { dateFrom, dateTo } = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return null;
  const params = new URLSearchParams({ workspaceId: wsId });
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  const json = await apiFetch(`/finance/reports/pnl?${params}`);
  return json.data;
}

export async function getCashFlowStatement(workspaceId, { dateFrom, dateTo } = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return null;
  const params = new URLSearchParams({ workspaceId: wsId });
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  const json = await apiFetch(`/finance/reports/cashflow-statement?${params}`);
  return json.data;
}

// ── Combined overview (used by Admin_FinanceControl.jsx) ──────────────────────

export async function getFinanceTreasuryOverview(workspaceId) {
  const wsId = workspaceId || getWsId();
  const [kpis, budgets, transactions, treasury] = await Promise.allSettled([
    getFinanceKPIs(wsId),
    getBudgets(wsId),
    getTransactions(wsId, { status: 'pending_approval', limit: 20 }),
    getTreasuryData(wsId),
  ]);

  return {
    kpis: kpis.value || getEmptyKPIs(),
    budgets: budgets.value || [],
    approvalQueue: transactions.value || [],
    treasury: treasury.value || {},
  };
}

// ── Balance Sheet ───────────────────────────────────────────────────────────

export async function getBalanceSheet(workspaceId, { asOfDate } = {}) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return null;
  const params = new URLSearchParams({ workspaceId: wsId });
  if (asOfDate) params.set('asOfDate', asOfDate);
  const json = await apiFetch(`/finance/reports/balance-sheet?${params}`);
  return json.data;
}

// ── Aged Receivables ────────────────────────────────────────────────────────

export async function getAgedReceivables(workspaceId) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  try {
    const json = await apiFetch(`/finance/reports/aged-receivables?workspaceId=${wsId}`);
    return json.data;
  } catch { return []; }
}

// ── Aged Payables ───────────────────────────────────────────────────────────

export async function getAgedPayables(workspaceId) {
  const wsId = workspaceId || getWsId();
  if (!wsId) return [];
  try {
    const json = await apiFetch(`/finance/reports/aged-payables?workspaceId=${wsId}`);
    return json.data;
  } catch { return []; }
}

// ── Legacy compat aliases (pages that still call old function names) ────────

export const getBudgetData = (wsId) => getBudgets(wsId);
export const getApprovalQueue = (wsId) => getTransactions(wsId, { status: 'pending_approval' });
export const getP2PData = (wsId) => getTransactions(wsId, { type: 'purchase_order' });
export const getExpenseData = (wsId) => getTransactions(wsId, { type: 'expense' });
export const getVendorData = getVendors;
export const getCapExData = (wsId) => getTransactions(wsId, { type: 'capex' });
export const getOpExData = (wsId) => getTransactions(wsId, { type: 'opex' });
export const getReportCatalog = () => apiFetch('/finance/reports/catalog').then((r) => r.data).catch(() => []);
export const getRecentTransactions = (wsId) => getTransactions(wsId, { limit: 10 });
export const getCashFlowData = getCashFlow;
export const getAlertsData = getAlerts;
export const getFinancialPlanningData = (wsId) => apiFetch(`/finance/planning?workspaceId=${wsId || getWsId()}`).then((r) => r.data).catch(() => ({}));
export const getFraudDetectionData = (wsId) => apiFetch(`/finance/fraud?workspaceId=${wsId || getWsId()}`).then((r) => r.data).catch(() => ({ alerts: [] }));
