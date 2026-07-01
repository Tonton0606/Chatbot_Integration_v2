/**
 * Client Invoicing Service
 * Handles all invoicing, quotes, payments, and expense API calls
 */

import { withAuthHeaders } from "../apiAuth";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...(await withAuthHeaders(options.headers)), ...options.headers },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(url, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `API Error: ${response.status}`);
  return data;
}

// ── Currency Formatting ───────────────────────────────────────────────────────

export function formatPHP(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function formatPHPShort(value) {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₱${Math.round(value / 1000)}K`;
  return formatPHP(value);
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export async function getInvoices(workspaceId, filters = {}) {
  const params = new URLSearchParams({ workspaceId });
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  return apiRequest(`/invoicing/invoices?${params.toString()}`);
}

export async function getInvoice(id) {
  return apiRequest(`/invoicing/invoices/${id}`);
}

export async function createInvoice(invoiceData) {
  return apiRequest('/invoicing/invoices', {
    method: 'POST',
    body: invoiceData,
  });
}

export async function updateInvoice(id, updates) {
  return apiRequest(`/invoicing/invoices/${id}`, {
    method: 'PATCH',
    body: updates,
  });
}

export async function sendInvoice(id, options = {}) {
  return apiRequest(`/invoicing/invoices/${id}/send`, {
    method: 'POST',
    body: options,
  });
}

export async function deleteInvoice(id) {
  return apiRequest(`/invoicing/invoices/${id}`, {
    method: 'DELETE',
  });
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function getQuotes(workspaceId, filters = {}) {
  const params = new URLSearchParams({ workspaceId });
  if (filters.status) params.set('status', filters.status);

  return apiRequest(`/invoicing/quotes?${params.toString()}`);
}

export async function createQuote(quoteData) {
  return apiRequest('/invoicing/quotes', {
    method: 'POST',
    body: quoteData,
  });
}

export async function convertQuoteToInvoice(quoteId) {
  return apiRequest(`/invoicing/quotes/${quoteId}/convert-to-invoice`, {
    method: 'POST',
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getPayments(workspaceId) {
  return apiRequest(`/invoicing/payments?workspaceId=${workspaceId}`);
}

export async function recordPayment(paymentData) {
  return apiRequest('/invoicing/payments', {
    method: 'POST',
    body: paymentData,
  });
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function getExpenses(workspaceId, filters = {}) {
  const params = new URLSearchParams({ workspaceId });
  if (filters.status) params.set('status', filters.status);

  return apiRequest(`/invoicing/expenses?${params.toString()}`);
}

export async function createExpense(expenseData) {
  return apiRequest('/invoicing/expenses', {
    method: 'POST',
    body: expenseData,
  });
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export async function getVendors(workspaceId) {
  return apiRequest(`/invoicing/vendors?workspaceId=${workspaceId}`);
}

export async function createVendor(vendorData) {
  return apiRequest('/invoicing/vendors', {
    method: 'POST',
    body: vendorData,
  });
}

// ── Chart of Accounts ─────────────────────────────────────────────────────────

export async function getAccounts(workspaceId) {
  return apiRequest(`/invoicing/accounts?workspaceId=${workspaceId}`);
}

export async function createAccount(accountData) {
  return apiRequest('/invoicing/accounts', {
    method: 'POST',
    body: accountData,
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getInvoicingDashboard(workspaceId) {
  return apiRequest(`/invoicing/dashboard?workspaceId=${workspaceId}`);
}

// ── Tax Calculation Helpers ────────────────────────────────────────────────────

export function calculateVAT(subtotal, vatRate = 12, vatType = 'inclusive') {
  if (vatType === 'inclusive') {
    const netAmount = Math.round((subtotal / (1 + vatRate / 100)) * 100) / 100;
    const vatAmount = Math.round((subtotal - netAmount) * 100) / 100;
    return { vatAmount, netAmount };
  }
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  return { vatAmount, netAmount: subtotal };
}

// BIR RR 2-98: EWT base = VAT-exclusive net income, not the gross total
export function calculateEWT(netAmount, ewtRate) {
  if (!ewtRate || ewtRate <= 0) return 0;
  return Math.round(netAmount * (ewtRate / 100) * 100) / 100;
}

export function calculateInvoiceTotal(items, options = {}) {
  const { discountPercent = 0, vatRate = 12, vatType = 'inclusive', ewtRate = 0 } = options;

  let subtotal = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.unit_price || 0);
    const discount = Number(item.discount_amount || 0);
    subtotal += qty * price - discount;
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const afterDiscount = subtotal - discountAmount;
  const { vatAmount, netAmount } = calculateVAT(afterDiscount, vatRate, vatType);
  const ewtAmount = calculateEWT(netAmount, ewtRate);
  const grossPlusVat = vatType === 'exclusive'
    ? Math.round((afterDiscount + vatAmount) * 100) / 100
    : afterDiscount;
  const total = Math.round((grossPlusVat - ewtAmount) * 100) / 100;

  return { subtotal, discountAmount, vatAmount, netAmount, ewtAmount, total, balanceDue: total };
}

// ── Status Constants ──────────────────────────────────────────────────────────

export const INVOICE_STATUSES = [
  'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void'
];

export const INVOICE_STATUS_COLORS = {
  draft: '#6b7280',
  sent: '#3b82f6',
  viewed: '#8b5cf6',
  partial: '#f59e0b',
  paid: '#10b981',
  overdue: '#ef4444',
  cancelled: '#9ca3af',
  void: '#d1d5db',
};

export const QUOTE_STATUSES = [
  'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'
];

export const QUOTE_STATUS_COLORS = {
  draft: '#6b7280',
  sent: '#3b82f6',
  viewed: '#8b5cf6',
  accepted: '#10b981',
  rejected: '#ef4444',
  expired: '#f59e0b',
  converted: '#059669',
};

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_CATEGORIES = [
  'Office Supplies', 'Software & Subscriptions', 'Travel & Transportation',
  'Meals & Entertainment', 'Marketing & Advertising', 'Professional Services',
  'Utilities', 'Rent & Facilities', 'Equipment', 'Training & Education',
  'Insurance', 'Taxes & Licenses', 'Other',
];

export const DEFAULT_PAYMENT_TERMS = [
  { value: 'cod', label: 'Cash on Delivery', days: 0 },
  { value: 'net7', label: 'Net 7', days: 7 },
  { value: 'net15', label: 'Net 15', days: 15 },
  { value: 'net30', label: 'Net 30', days: 30 },
  { value: 'net60', label: 'Net 60', days: 60 },
];