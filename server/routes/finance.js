const logger = require('../config/logger');
/**
 * Finance & Treasury API Routes
 * Covers: Budgets, Transactions, Cash Flow, Treasury, P2P Approvals, Alerts
 *
 * SECURITY: workspaceId is always taken from req.workspaceId (set by requireAuth
 * middleware from the JWT). Client-supplied workspaceId in query/body is IGNORED.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { sanitizeSearch } = require('../utils/searchFilter');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Workspace ID from authenticated middleware — never trust the client
function ws(req) { return req.workspaceId; }

function ok(res, data, meta = {}) {
  res.json({ success: true, data, ...meta });
}

function fail(res, msg, status = 500) {
  if (status >= 500) {
    logger.error({ err: String(msg) }, '[finance] server error');
    res.status(status).json({ success: false, error: 'Internal server error' });
  } else {
    logger.warn({ reason: String(msg) }, '[finance] client error');
    res.status(status).json({ success: false, error: String(msg) });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPIs — aggregated dashboard metrics
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/kpis', async (req, res) => {
  try {
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    const [budgetRes, txRes, cashRes, approvalRes] = await Promise.all([
      supabase.from('finance_budgets').select('allocated, spent').eq('workspace_id', workspaceId),
      supabase.from('finance_transactions').select('amount, type').eq('workspace_id', workspaceId).eq('status', 'posted'),
      supabase.from('finance_cash_positions').select('balance').eq('workspace_id', workspaceId),
      supabase.from('finance_transactions').select('id, amount').eq('workspace_id', workspaceId).eq('status', 'pending_approval'),
    ]);

    const budgets = budgetRes.data || [];
    const totalAllocated = budgets.reduce((s, b) => s + (b.allocated || 0), 0);
    const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);

    const txs = txRes.data || [];
    const totalRevenue = txs.filter(t => t.type === 'revenue').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    const cashPositions = cashRes.data || [];
    const netCash = cashPositions.reduce((s, p) => s + (p.balance || 0), 0);

    const pendingApprovals = approvalRes.data || [];

    ok(res, {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      totalBudgetAllocated: totalAllocated,
      totalBudgetSpent: totalSpent,
      budgetUtilization: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
      netCashPosition: netCash,
      pendingApprovals: pendingApprovals.length,
      pendingApprovalValue: pendingApprovals.reduce((s, t) => s + (t.amount || 0), 0),
    });
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/budgets', async (req, res) => {
  try {
    const { fiscalYear, status } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('finance_budgets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('cost_center', { ascending: true });

    if (fiscalYear) q = q.eq('fiscal_year', fiscalYear);
    if (status && status !== 'all') q = q.eq('status', status);

    const { data, error } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (e) { fail(res, e.message); }
});

router.post('/budgets', async (req, res) => {
  try {
    const { costCenter, allocated, fiscalYear, owner, notes } = req.body;
    const workspaceId = ws(req);
    if (!costCenter || !allocated) return fail(res, 'costCenter, allocated required', 400);

    const { data, error } = await supabase.from('finance_budgets').insert({
      workspace_id: workspaceId,
      cost_center: costCenter,
      allocated: parseFloat(allocated),
      spent: 0,
      fiscal_year: fiscalYear || new Date().getFullYear(),
      owner: owner || null,
      notes: notes || null,
      status: 'active',
    }).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.patch('/budgets/:id', async (req, res) => {
  try {
    const updates = {};
    const allowed = ['cost_center', 'allocated', 'owner', 'notes', 'status'];
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('finance_budgets')
      .update(updates)
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.delete('/budgets/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('finance_budgets')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req));
    if (error) return fail(res, error.message);
    ok(res, { deleted: true });
  } catch (e) { fail(res, e.message); }
});

// Budget transfer between cost centers
router.post('/budgets/transfer', async (req, res) => {
  try {
    const { fromBudgetId, toBudgetId, amount, reason, approvedBy } = req.body;
    if (!fromBudgetId || !toBudgetId || !amount) return fail(res, 'fromBudgetId, toBudgetId, amount required', 400);
    if (fromBudgetId === toBudgetId) return fail(res, 'Cannot transfer to the same budget', 400);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return fail(res, 'amount must be a positive number', 400);

    const wsId = req.workspaceId;
    if (!wsId) return fail(res, 'Workspace context required', 400);

    const [fromRes, toRes] = await Promise.all([
      supabase.from('finance_budgets').select('*').eq('id', fromBudgetId).eq('workspace_id', wsId).single(),
      supabase.from('finance_budgets').select('*').eq('id', toBudgetId).eq('workspace_id', wsId).single(),
    ]);

    if (fromRes.error || toRes.error) return fail(res, 'Budget not found', 404);
    if ((fromRes.data.allocated - fromRes.data.spent) < amt) return fail(res, 'Insufficient budget remaining', 400);

    await Promise.all([
      supabase.from('finance_budgets').update({ allocated: fromRes.data.allocated - amt, updated_at: new Date().toISOString() }).eq('id', fromBudgetId),
      supabase.from('finance_budgets').update({ allocated: toRes.data.allocated + amt, updated_at: new Date().toISOString() }).eq('id', toBudgetId),
    ]);

    // Log transfer as audit entry
    await supabase.from('finance_transactions').insert({
      workspace_id: fromRes.data.workspace_id,
      type: 'budget_transfer',
      description: `Budget transfer: ${fromRes.data.cost_center} → ${toRes.data.cost_center}. Reason: ${reason || 'N/A'}`,
      amount: amt,
      status: 'posted',
      reference: `XFER-${Date.now()}`,
      approved_by: approvedBy || null,
    });

    ok(res, { transferred: true, amount: amt });
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/transactions', async (req, res) => {
  try {
    const { status, type, search, limit = 50, offset = 0, dateFrom, dateTo } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('finance_transactions')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status && status !== 'all') q = q.eq('status', status);
    if (type && type !== 'all') q = q.eq('type', type);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo);
    if (search) { const s = sanitizeSearch(search); if (s) q = q.or(`description.ilike.%${s}%,reference.ilike.%${s}%`); }

    const { data, error, count } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || [], { total: count });
  } catch (e) { fail(res, e.message); }
});

router.post('/transactions', async (req, res) => {
  try {
    const { type, description, amount, category, budgetId, reference, attachments, metadata } = req.body;
    const workspaceId = ws(req);
    if (!type || !amount) return fail(res, 'type, amount required', 400);

    const ref = reference || `TXN-${Date.now()}`;
    const { data, error } = await supabase.from('finance_transactions').insert({
      workspace_id: workspaceId,
      type,
      description: description || '',
      amount: parseFloat(amount),
      category: category || null,
      budget_id: budgetId || null,
      reference: ref,
      attachments: attachments || [],
      metadata: metadata || {},
      status: 'pending_approval',
    }).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// Approve / reject
router.patch('/transactions/:id/approve', async (req, res) => {
  try {
    const { approvedBy, notes } = req.body;
    const { data, error } = await supabase.from('finance_transactions').update({
      status: 'posted',
      approved_by: approvedBy || req.user?.id || null,
      approval_notes: notes || null,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('workspace_id', ws(req)).select().single();

    if (error) return fail(res, error.message);

    // Update budget spent if budget_id linked
    if (data.budget_id && data.type === 'expense') {
      const { data: bud } = await supabase.from('finance_budgets').select('spent').eq('id', data.budget_id).single();
      if (bud) {
        await supabase.from('finance_budgets').update({ spent: (bud.spent || 0) + data.amount, updated_at: new Date().toISOString() }).eq('id', data.budget_id);
      }
    }

    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.patch('/transactions/:id/reject', async (req, res) => {
  try {
    const { rejectedBy, reason } = req.body;
    const { data, error } = await supabase.from('finance_transactions').update({
      status: 'rejected',
      approved_by: rejectedBy || req.user?.id || null,
      approval_notes: reason || null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('workspace_id', ws(req)).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASH POSITIONS & TREASURY
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/treasury', async (req, res) => {
  try {
    const workspaceId = ws(req);

    const [posRes, flowRes, alertRes] = await Promise.all([
      supabase.from('finance_cash_positions').select('*').eq('workspace_id', workspaceId).order('account_name'),
      supabase.from('finance_cash_flow').select('*').eq('workspace_id', workspaceId).order('flow_date', { ascending: false }).limit(90),
      supabase.from('finance_alerts').select('*').eq('workspace_id', workspaceId).eq('resolved', false).order('created_at', { ascending: false }),
    ]);

    ok(res, {
      cashPositions: posRes.data || [],
      cashFlow: flowRes.data || [],
      alerts: alertRes.data || [],
      totalCash: (posRes.data || []).reduce((s, p) => s + (p.balance || 0), 0),
    });
  } catch (e) { fail(res, e.message); }
});

router.post('/cash-positions', async (req, res) => {
  try {
    const { accountName, accountType, bank, currency, balance } = req.body;
    const workspaceId = ws(req);
    if (!accountName) return fail(res, 'accountName required', 400);

    const { data, error } = await supabase.from('finance_cash_positions').insert({
      workspace_id: workspaceId,
      account_name: accountName,
      account_type: accountType || 'checking',
      bank: bank || null,
      currency: currency || 'PHP',
      balance: parseFloat(balance || 0),
    }).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.patch('/cash-positions/:id', async (req, res) => {
  try {
    const { balance, accountName, bank } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (balance !== undefined) updates.balance = parseFloat(balance);
    if (accountName) updates.account_name = accountName;
    if (bank) updates.bank = bank;

    const { data, error } = await supabase.from('finance_cash_positions')
      .update(updates).eq('id', req.params.id).eq('workspace_id', ws(req)).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASH FLOW ENTRIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/cash-flow', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('finance_cash_flow')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('flow_date', { ascending: true });

    if (dateFrom) q = q.gte('flow_date', dateFrom);
    if (dateTo)   q = q.lte('flow_date', dateTo);

    const { data, error } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (e) { fail(res, e.message); }
});

router.post('/cash-flow', async (req, res) => {
  try {
    const { flowDate, inflow, outflow, category, description } = req.body;
    const workspaceId = ws(req);
    if (!flowDate) return fail(res, 'flowDate required', 400);

    const { data, error } = await supabase.from('finance_cash_flow').insert({
      workspace_id: workspaceId,
      flow_date: flowDate,
      inflow: parseFloat(inflow || 0),
      outflow: parseFloat(outflow || 0),
      category: category || 'operations',
      description: description || null,
    }).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/alerts', async (req, res) => {
  try {
    const { resolved = 'false', severity } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('finance_alerts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (resolved !== 'all') q = q.eq('resolved', resolved === 'true');
    if (severity && severity !== 'all') q = q.eq('severity', severity);

    const { data, error } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (e) { fail(res, e.message); }
});

router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    const { resolvedBy, notes } = req.body;
    const { data, error } = await supabase.from('finance_alerts').update({
      resolved: true,
      resolved_by: resolvedBy || req.user?.id || null,
      resolution_notes: notes || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('workspace_id', ws(req)).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VENDORS (Procure-to-Pay)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/vendors', async (req, res) => {
  try {
    const { search, status } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('finance_vendors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (status && status !== 'all') q = q.eq('status', status);
    if (search) { const s = sanitizeSearch(search); if (s) q = q.or(`name.ilike.%${s}%,contact_email.ilike.%${s}%`); }

    const { data, error } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (e) { fail(res, e.message); }
});

router.post('/vendors', async (req, res) => {
  try {
    const { name, contactEmail, contactPhone, address, taxId, paymentTerms, category } = req.body;
    const workspaceId = ws(req);
    if (!name) return fail(res, 'name required', 400);

    const { data, error } = await supabase.from('finance_vendors').insert({
      workspace_id: workspaceId,
      name,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
      tax_id: taxId || null,
      payment_terms: paymentTerms || 'net_30',
      category: category || 'general',
      status: 'active',
    }).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.patch('/vendors/:id', async (req, res) => {
  try {
    const allowed = ['name', 'contact_email', 'contact_phone', 'address', 'tax_id', 'payment_terms', 'category', 'status'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase.from('finance_vendors')
      .update(updates).eq('id', req.params.id).eq('workspace_id', ws(req)).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORTS (P&L, Balance Sheet, Cash Flow Statement)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/reports/pnl', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('finance_transactions')
      .select('type, category, amount')
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted');

    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo);

    const { data, error } = await q;
    if (error) return fail(res, error.message);

    const rows = data || [];
    const totalRevenue = rows.filter(r => r.type === 'revenue').reduce((s, r) => s + r.amount, 0);
    const totalCOGS = rows.filter(r => r.type === 'cogs').reduce((s, r) => s + r.amount, 0);
    const totalOpEx = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const operatingIncome = grossProfit - totalOpEx;

    // Group expenses by category
    const byCategory = {};
    rows.filter(r => r.type === 'expense' && r.category).forEach(r => {
      byCategory[r.category] = (byCategory[r.category] || 0) + r.amount;
    });

    ok(res, {
      revenue: totalRevenue,
      cogs: totalCOGS,
      grossProfit,
      grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
      operatingExpenses: totalOpEx,
      operatingIncome,
      netIncome: operatingIncome,
      expensesByCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
    });
  } catch (e) { fail(res, e.message); }
});

router.get('/reports/cashflow-statement', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('finance_cash_flow')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('flow_date', { ascending: true });

    if (dateFrom) q = q.gte('flow_date', dateFrom);
    if (dateTo) q = q.lte('flow_date', dateTo);

    const { data, error } = await q;
    if (error) return fail(res, error.message);

    const rows = data || [];
    const byCategory = { operations: { inflow: 0, outflow: 0 }, investing: { inflow: 0, outflow: 0 }, financing: { inflow: 0, outflow: 0 } };
    rows.forEach(r => {
      const cat = r.category || 'operations';
      if (!byCategory[cat]) byCategory[cat] = { inflow: 0, outflow: 0 };
      byCategory[cat].inflow += r.inflow || 0;
      byCategory[cat].outflow += r.outflow || 0;
    });

    const totalInflow = rows.reduce((s, r) => s + (r.inflow || 0), 0);
    const totalOutflow = rows.reduce((s, r) => s + (r.outflow || 0), 0);

    ok(res, {
      entries: rows,
      byCategory,
      totalInflow,
      totalOutflow,
      netCashChange: totalInflow - totalOutflow,
    });
  } catch (e) { fail(res, e.message); }
});

module.exports = router;
