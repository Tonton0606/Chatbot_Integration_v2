const logger = require('../config/logger');
/**
 * Accounting Routes — Chart of Accounts, Journal Entries, General Ledger
 * Double-entry bookkeeping: every JE must balance (debits == credits)
 *
 * SECURITY: workspaceId is always taken from req.workspaceId (set by requireAuth
 * middleware from the JWT). Client-supplied workspaceId in query/body is IGNORED
 * to prevent cross-workspace data access.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { sanitizeSearch } = require('../utils/searchFilter');

// Workspace ID from authenticated middleware — never trust the client
function ws(req) { return req.workspaceId; }

function ok(res, data, meta = {}) { res.json({ success: true, data, ...meta }); }

function fail(res, msg, status = 500) {
  if (status >= 500) {
    logger.error({ err: String(msg) }, '[accounting] server error');
    res.status(status).json({ success: false, error: 'Internal server error' });
  } else {
    logger.warn({ reason: String(msg) }, '[accounting] client error');
    res.status(status).json({ success: false, error: String(msg) });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/accounts', async (req, res) => {
  try {
    const { type, search } = req.query;
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    let q = supabase.from('gl_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('account_code');

    if (type && type !== 'all') q = q.eq('account_type', type);
    if (search) { const s = sanitizeSearch(search); if (s) q = q.or(`name.ilike.%${s}%,account_code.ilike.%${s}%`); }

    const { data, error } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (e) { fail(res, e.message); }
});

router.post('/accounts', async (req, res) => {
  try {
    const { accountCode, name, accountType, parentId, currency, description, isActive } = req.body;
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);
    if (!accountCode || !name || !accountType) {
      return fail(res, 'accountCode, name, accountType required', 400);
    }

    const VALID_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense', 'cogs'];
    if (!VALID_TYPES.includes(accountType)) {
      return fail(res, `accountType must be one of: ${VALID_TYPES.join(', ')}`, 400);
    }

    const { data: existing } = await supabase.from('gl_accounts')
      .select('id').eq('workspace_id', workspaceId).eq('account_code', accountCode).maybeSingle();
    if (existing) return fail(res, `Account code ${accountCode} already exists`, 409);

    const { data, error } = await supabase.from('gl_accounts').insert({
      workspace_id: workspaceId,
      account_code: accountCode,
      name,
      account_type: accountType,
      parent_id: parentId || null,
      currency: currency || 'PHP',
      description: description || null,
      is_active: isActive !== false,
      balance: 0,
    }).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.patch('/accounts/:id', async (req, res) => {
  try {
    const allowed = ['name', 'description', 'is_active', 'parent_id', 'currency'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase.from('gl_accounts')
      .update(updates)
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const { count } = await supabase.from('journal_entry_lines')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', req.params.id);

    if (count > 0) return fail(res, 'Cannot delete account with existing journal entries', 409);

    const { error } = await supabase.from('gl_accounts')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req));
    if (error) return fail(res, error.message);
    ok(res, { deleted: true });
  } catch (e) { fail(res, e.message); }
});

// Seed Philippine GAAP Chart of Accounts for a new workspace
router.post('/accounts/seed', async (req, res) => {
  try {
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    const defaultAccounts = [
      // Assets
      { account_code: '1000', name: 'Cash & Cash Equivalents', account_type: 'asset' },
      { account_code: '1010', name: 'Petty Cash Fund', account_type: 'asset' },
      { account_code: '1100', name: 'Accounts Receivable', account_type: 'asset' },
      { account_code: '1110', name: 'Allowance for Doubtful Accounts', account_type: 'asset' },
      { account_code: '1200', name: 'Inventory', account_type: 'asset' },
      { account_code: '1300', name: 'Prepaid Expenses', account_type: 'asset' },
      { account_code: '1400', name: 'Input VAT', account_type: 'asset' },
      { account_code: '1500', name: 'Property, Plant & Equipment', account_type: 'asset' },
      { account_code: '1510', name: 'Accumulated Depreciation', account_type: 'asset' },
      // Liabilities
      { account_code: '2000', name: 'Accounts Payable', account_type: 'liability' },
      { account_code: '2100', name: 'Accrued Liabilities', account_type: 'liability' },
      { account_code: '2200', name: 'Output VAT Payable', account_type: 'liability' },
      { account_code: '2210', name: 'EWT Payable (0619-E)', account_type: 'liability' },
      { account_code: '2220', name: 'Income Tax Payable', account_type: 'liability' },
      { account_code: '2230', name: 'SSS Contributions Payable', account_type: 'liability' },
      { account_code: '2240', name: 'PhilHealth Contributions Payable', account_type: 'liability' },
      { account_code: '2250', name: 'Pag-IBIG Contributions Payable', account_type: 'liability' },
      { account_code: '2300', name: 'Short-term Loans Payable', account_type: 'liability' },
      { account_code: '2350', name: 'Commissions Payable', account_type: 'liability' },
      { account_code: '2500', name: 'Long-term Debt', account_type: 'liability' },
      // Equity
      { account_code: '3000', name: "Owner's Equity / Capital", account_type: 'equity' },
      { account_code: '3100', name: 'Retained Earnings', account_type: 'equity' },
      { account_code: '3200', name: 'Common Stock', account_type: 'equity' },
      { account_code: '3300', name: 'Additional Paid-in Capital', account_type: 'equity' },
      // Revenue
      { account_code: '4000', name: 'Sales Revenue', account_type: 'revenue' },
      { account_code: '4100', name: 'Service Revenue', account_type: 'revenue' },
      { account_code: '4200', name: 'Other Income', account_type: 'revenue' },
      { account_code: '4300', name: 'Interest Income', account_type: 'revenue' },
      // COGS
      { account_code: '5000', name: 'Cost of Goods Sold', account_type: 'cogs' },
      { account_code: '5100', name: 'Direct Labor', account_type: 'cogs' },
      { account_code: '5200', name: 'Direct Materials', account_type: 'cogs' },
      // Expenses
      { account_code: '6000', name: 'Salaries & Wages Expense', account_type: 'expense' },
      { account_code: '6010', name: 'SSS Employer Contribution', account_type: 'expense' },
      { account_code: '6020', name: 'PhilHealth Employer Contribution', account_type: 'expense' },
      { account_code: '6030', name: 'Pag-IBIG Employer Contribution', account_type: 'expense' },
      { account_code: '6100', name: 'Rent Expense', account_type: 'expense' },
      { account_code: '6110', name: 'Utilities Expense', account_type: 'expense' },
      { account_code: '6200', name: 'Marketing & Advertising Expense', account_type: 'expense' },
      { account_code: '6300', name: 'Travel & Entertainment Expense', account_type: 'expense' },
      { account_code: '6350', name: 'Commission Expense', account_type: 'expense' },
      { account_code: '6400', name: 'Office Supplies Expense', account_type: 'expense' },
      { account_code: '6500', name: 'Software & Subscriptions Expense', account_type: 'expense' },
      { account_code: '6600', name: 'Professional Fees Expense', account_type: 'expense' },
      { account_code: '6700', name: 'Depreciation Expense', account_type: 'expense' },
      { account_code: '6800', name: 'Insurance Expense', account_type: 'expense' },
      { account_code: '6900', name: 'Miscellaneous Expense', account_type: 'expense' },
      { account_code: '6910', name: 'Bank Charges & Fees', account_type: 'expense' },
      { account_code: '6920', name: 'Interest Expense', account_type: 'expense' },
    ];

    const rows = defaultAccounts.map(a => ({
      ...a,
      workspace_id: workspaceId,
      balance: 0,
      currency: 'PHP',
      is_active: true,
    }));

    const { data, error } = await supabase.from('gl_accounts')
      .upsert(rows, { onConflict: 'workspace_id,account_code', ignoreDuplicates: true })
      .select();

    if (error) return fail(res, error.message);
    ok(res, data, { seeded: data.length });
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNAL ENTRIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/journal-entries', async (req, res) => {
  try {
    const { status, search, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    let q = supabase.from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*, account:gl_accounts(account_code, name, account_type))
      `, { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('entry_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status && status !== 'all') q = q.eq('status', status);
    if (dateFrom) q = q.gte('entry_date', dateFrom);
    if (dateTo)   q = q.lte('entry_date', dateTo);
    if (search) { const s = sanitizeSearch(search); if (s) q = q.or(`memo.ilike.%${s}%,reference.ilike.%${s}%`); }

    const { data, error, count } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || [], { total: count });
  } catch (e) { fail(res, e.message); }
});

router.get('/journal-entries/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('journal_entries')
      .select(`*, lines:journal_entry_lines(*, account:gl_accounts(account_code, name, account_type))`)
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .single();

    if (error) return fail(res, error.message, 404);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.post('/journal-entries', async (req, res) => {
  try {
    const { entryDate, memo, reference, lines } = req.body;
    const workspaceId = ws(req);
    const createdBy = req.user?.id || null;

    if (!workspaceId) return fail(res, 'Workspace context required', 400);
    if (!entryDate || !lines?.length) {
      return fail(res, 'entryDate and lines[] required', 400);
    }

    // Validate double-entry balance
    const totalDebits  = lines.reduce((s, l) => s + parseFloat(l.debit  || 0), 0);
    const totalCredits = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return fail(res, `Journal entry does not balance: debits ${totalDebits.toFixed(2)} ≠ credits ${totalCredits.toFixed(2)}`, 400);
    }
    if (totalDebits === 0) return fail(res, 'Journal entry has zero value', 400);

    // Check fiscal period is not closed
    const { data: period } = await supabase.from('fiscal_periods')
      .select('id, status, period_name')
      .eq('workspace_id', workspaceId)
      .lte('start_date', entryDate)
      .gte('end_date', entryDate)
      .maybeSingle();

    if (period && period.status === 'closed') {
      return fail(res, `Cannot post to closed period: ${period.period_name}`, 422);
    }
    if (period && period.status === 'locked') {
      return fail(res, `Cannot post to locked period: ${period.period_name}`, 422);
    }

    // Generate JE number via atomic DB function — eliminates read-then-write race
    const { data: seqData, error: seqErr } = await supabase
      .rpc('next_je_number', { p_workspace_id: workspaceId });
    if (seqErr) return fail(res, `Could not generate JE number: ${seqErr.message}`);
    const jeNumber = seqData;

    const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
      workspace_id: workspaceId,
      je_number: jeNumber,
      entry_date: entryDate,
      memo: memo || null,
      reference: reference || null,
      total_amount: totalDebits,
      status: 'draft',
      created_by: createdBy,
      fiscal_period_id: period?.id || null,
    }).select().single();

    if (jeErr) return fail(res, jeErr.message);

    const lineRows = lines.map((l, i) => ({
      journal_entry_id: je.id,
      account_id: l.accountId,
      debit:  parseFloat(l.debit  || 0),
      credit: parseFloat(l.credit || 0),
      description: l.description || null,
      line_order: i + 1,
    }));

    const { error: lineErr } = await supabase.from('journal_entry_lines').insert(lineRows);
    if (lineErr) {
      await supabase.from('journal_entries').delete().eq('id', je.id);
      return fail(res, lineErr.message);
    }

    ok(res, { ...je, lines: lineRows });
  } catch (e) { fail(res, e.message); }
});

// Post a draft JE — updates GL account balances
router.patch('/journal-entries/:id/post', async (req, res) => {
  try {
    const postedBy = req.user?.id || null;
    const { data: je, error: jeErr } = await supabase.from('journal_entries')
      .select(`*, lines:journal_entry_lines(*)`)
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .single();

    if (jeErr || !je) return fail(res, 'Journal entry not found', 404);
    if (je.status === 'posted') return fail(res, 'Already posted', 400);

    // Check fiscal period locking
    if (je.fiscal_period_id) {
      const { data: fp } = await supabase.from('fiscal_periods')
        .select('status, period_name')
        .eq('id', je.fiscal_period_id)
        .single();
      if (fp && fp.status === 'closed') {
        return fail(res, `Cannot post to closed period: ${fp.period_name}`, 422);
      }
    }

    // Batch-update GL account balances — collect all changes first, then apply
    const balanceChanges = {};
    for (const line of je.lines) {
      const { data: acct } = await supabase.from('gl_accounts')
        .select('balance, account_type')
        .eq('id', line.account_id)
        .single();
      if (!acct) continue;

      // Normal balance rules (Philippine GAAP):
      // Assets / Expenses / COGS: debit increases, credit decreases
      // Liabilities / Equity / Revenue: credit increases, debit decreases
      const isDebitNormal = ['asset', 'expense', 'cogs'].includes(acct.account_type);
      const change = isDebitNormal
        ? (line.debit || 0) - (line.credit || 0)
        : (line.credit || 0) - (line.debit || 0);

      balanceChanges[line.account_id] = {
        newBalance: (acct.balance || 0) + change,
      };
    }

    // Apply balance updates
    await Promise.all(
      Object.entries(balanceChanges).map(([accountId, { newBalance }]) =>
        supabase.from('gl_accounts').update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        }).eq('id', accountId)
      )
    );

    const { data, error } = await supabase.from('journal_entries').update({
      status: 'posted',
      posted_by: postedBy,
      posted_at: new Date().toISOString(),
    }).eq('id', req.params.id).select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// Reverse a posted JE (creates offsetting entry)
router.post('/journal-entries/:id/reverse', async (req, res) => {
  try {
    const { reversalDate, memo } = req.body;
    const createdBy = req.user?.id || null;
    const workspaceId = ws(req);

    const { data: je } = await supabase.from('journal_entries')
      .select(`*, lines:journal_entry_lines(*)`)
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!je) return fail(res, 'Journal entry not found', 404);
    if (je.status !== 'posted') return fail(res, 'Can only reverse posted entries', 400);

    const reversedLines = je.lines.map(l => ({
      accountId: l.account_id,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal: ${l.description || ''}`,
    }));

    // Generate JE number via the same atomic DB function the post path uses —
    // a read-then-write here let concurrent reversals mint duplicate je_numbers.
    const { data: seqData, error: seqErr } = await supabase
      .rpc('next_je_number', { p_workspace_id: workspaceId });
    if (seqErr) return fail(res, `Could not generate JE number: ${seqErr.message}`);
    const jeNumber = seqData;

    const revDate = reversalDate || new Date().toISOString().split('T')[0];

    const { data: rev, error: revErr } = await supabase.from('journal_entries').insert({
      workspace_id: workspaceId,
      je_number: jeNumber,
      entry_date: revDate,
      memo: memo || `Reversal of ${je.je_number}`,
      reference: `REV-${je.je_number}`,
      total_amount: je.total_amount,
      status: 'draft',
      reverses_je_id: je.id,
      created_by: createdBy,
    }).select().single();

    if (revErr) return fail(res, revErr.message);

    const lineRows = reversedLines.map((l, i) => ({
      journal_entry_id: rev.id,
      account_id: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      line_order: i + 1,
    }));
    await supabase.from('journal_entry_lines').insert(lineRows);
    await supabase.from('journal_entries').update({ reversed_by_je_id: rev.id }).eq('id', je.id);

    ok(res, rev);
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GENERAL LEDGER — account-level transaction history
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/ledger/:accountId', async (req, res) => {
  try {
    const { dateFrom, dateTo, limit = 100, offset = 0 } = req.query;
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    // Filter on the parent journal_entries at the DB level via an !inner join so
    // workspace scoping and date range are applied BEFORE pagination. Filtering in
    // memory after .range() let other tenants' rows consume result slots and
    // silently truncate this workspace's data — and scanned the whole table.
    let q = supabase.from('journal_entry_lines')
      .select(`
        *,
        journal_entry:journal_entries!inner(je_number, entry_date, memo, status, workspace_id)
      `)
      .eq('account_id', req.params.accountId)
      .eq('journal_entry.workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (dateFrom) q = q.gte('journal_entry.entry_date', dateFrom);
    if (dateTo)   q = q.lte('journal_entry.entry_date', dateTo);

    const { data, error } = await q;
    if (error) return fail(res, error.message);

    // Running balance (oldest → newest)
    let runningBalance = 0;
    const lines = (data || []).reverse().map(l => {
      runningBalance += (l.debit || 0) - (l.credit || 0);
      return { ...l, running_balance: runningBalance };
    });

    ok(res, lines.reverse());
  } catch (e) { fail(res, e.message); }
});

// Trial Balance
router.get('/trial-balance', async (req, res) => {
  try {
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    const { data, error } = await supabase.from('gl_accounts')
      .select('account_code, name, account_type, balance')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('account_code');

    if (error) return fail(res, error.message);

    const accounts = data || [];
    const totalDebits  = accounts
      .filter(a => ['asset', 'expense', 'cogs'].includes(a.account_type) && a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);
    const totalCredits = accounts
      .filter(a => ['liability', 'equity', 'revenue'].includes(a.account_type) && a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);

    ok(res, {
      accounts,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    });
  } catch (e) { fail(res, e.message); }
});

// ── Income Statement (Profit & Loss) ─────────────────────────────────────────
// Filters on journal_entry_lines joined to journal_entries.entry_date
// so date range is actually applied at the GL level, not ignored.
router.get('/reports/income-statement', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    // Fetch posted JE lines with GL account type for this workspace + date range
    let q = supabase.from('journal_entry_lines')
      .select(`
        debit, credit,
        account:gl_accounts(account_code, name, account_type),
        journal_entry:journal_entries!inner(entry_date, status, workspace_id)
      `)
      .eq('journal_entry.workspace_id', workspaceId)
      .eq('journal_entry.status', 'posted')
      .in('account.account_type', ['revenue', 'cogs', 'expense']);

    if (dateFrom) q = q.gte('journal_entry.entry_date', dateFrom);
    if (dateTo)   q = q.lte('journal_entry.entry_date', dateTo);

    const { data: lines, error } = await q;
    if (error) {
      // Fallback: derive from gl_accounts balances if JE query fails
      const { data: accts, error: acctErr } = await supabase.from('gl_accounts')
        .select('account_code, name, account_type, balance')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .in('account_type', ['revenue', 'cogs', 'expense'])
        .order('account_code');

      if (acctErr) return fail(res, acctErr.message);

      const all = accts || [];
      const revenue    = all.filter(a => a.account_type === 'revenue');
      const cogs       = all.filter(a => a.account_type === 'cogs');
      const expenses   = all.filter(a => a.account_type === 'expense');

      const totalRevenue  = revenue.reduce((s, a)  => s + Number(a.balance || 0), 0);
      const totalCOGS     = cogs.reduce((s, a)     => s + Number(a.balance || 0), 0);
      const grossProfit   = totalRevenue - totalCOGS;
      const totalExpenses = expenses.reduce((s, a) => s + Number(a.balance || 0), 0);
      const netIncome     = grossProfit - totalExpenses;

      return ok(res, {
        period: { dateFrom: dateFrom || null, dateTo: dateTo || null, note: 'balance-based (no date filter)' },
        revenue: { accounts: revenue, total: totalRevenue },
        cogs:    { accounts: cogs,    total: totalCOGS },
        grossProfit,
        grossMarginPct: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0,
        expenses: { accounts: expenses, total: totalExpenses },
        netIncome,
        netMarginPct: totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 10000) / 100 : 0,
      });
    }

    // Aggregate by account from JE lines
    const accountMap = {};
    for (const line of lines || []) {
      if (!line.account) continue;
      const { account_code, name, account_type } = line.account;
      if (!accountMap[account_code]) {
        accountMap[account_code] = { account_code, name, account_type, balance: 0 };
      }
      const isDebitNormal = ['expense', 'cogs'].includes(account_type);
      const change = isDebitNormal
        ? (line.debit || 0) - (line.credit || 0)
        : (line.credit || 0) - (line.debit || 0);
      accountMap[account_code].balance += change;
    }

    const all = Object.values(accountMap);
    const revenue    = all.filter(a => a.account_type === 'revenue');
    const cogs       = all.filter(a => a.account_type === 'cogs');
    const expenses   = all.filter(a => a.account_type === 'expense');

    const totalRevenue  = revenue.reduce((s, a)  => s + Number(a.balance || 0), 0);
    const totalCOGS     = cogs.reduce((s, a)     => s + Number(a.balance || 0), 0);
    const grossProfit   = totalRevenue - totalCOGS;
    const totalExpenses = expenses.reduce((s, a) => s + Number(a.balance || 0), 0);
    const netIncome     = grossProfit - totalExpenses;

    ok(res, {
      period: { dateFrom: dateFrom || null, dateTo: dateTo || null },
      revenue: { accounts: revenue, total: totalRevenue },
      cogs:    { accounts: cogs,    total: totalCOGS },
      grossProfit,
      grossMarginPct: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0,
      expenses: { accounts: expenses, total: totalExpenses },
      netIncome,
      netMarginPct: totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 10000) / 100 : 0,
    });
  } catch (e) { fail(res, e.message); }
});

// ── Balance Sheet ─────────────────────────────────────────────────────────────
router.get('/reports/balance-sheet', async (req, res) => {
  try {
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    const { data, error } = await supabase.from('gl_accounts')
      .select('account_code, name, account_type, balance')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('account_code');

    if (error) return fail(res, error.message);

    const accounts = data || [];
    const assets      = accounts.filter(a => a.account_type === 'asset');
    const liabilities = accounts.filter(a => a.account_type === 'liability');
    const equity      = accounts.filter(a => a.account_type === 'equity');

    const totalRevenue     = accounts.filter(a => a.account_type === 'revenue').reduce((s, a)  => s + Number(a.balance || 0), 0);
    const totalCOGS        = accounts.filter(a => a.account_type === 'cogs').reduce((s, a)     => s + Number(a.balance || 0), 0);
    const totalExpenses    = accounts.filter(a => a.account_type === 'expense').reduce((s, a)  => s + Number(a.balance || 0), 0);
    const retainedEarnings = totalRevenue - totalCOGS - totalExpenses;

    const totalAssets      = assets.reduce((s, a)      => s + Number(a.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + Number(a.balance || 0), 0);
    const totalEquity      = equity.reduce((s, a)      => s + Number(a.balance || 0), 0) + retainedEarnings;

    ok(res, {
      asOf: new Date().toISOString().split('T')[0],
      assets:      { accounts: assets,      total: totalAssets },
      liabilities: { accounts: liabilities, total: totalLiabilities },
      equity: {
        accounts: equity,
        retainedEarnings,
        total: totalEquity,
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    });
  } catch (e) { fail(res, e.message); }
});

// ── AR Aging ──────────────────────────────────────────────────────────────────
router.get('/reports/ar-aging', async (req, res) => {
  try {
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, due_date, balance_due, status, issue_date, customer_name')
      .eq('workspace_id', workspaceId)
      .in('status', ['sent', 'viewed', 'partial', 'overdue'])
      .gt('balance_due', 0)
      .order('due_date');

    if (error) return fail(res, error.message);

    const today = new Date();
    const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] };

    (data || []).forEach(inv => {
      const due = new Date(inv.due_date);
      const daysOverdue = Math.floor((today - due) / 86400000);
      const entry = { ...inv, daysOverdue };
      if      (daysOverdue <= 0)  buckets.current.push(entry);
      else if (daysOverdue <= 30) buckets.days1_30.push(entry);
      else if (daysOverdue <= 60) buckets.days31_60.push(entry);
      else if (daysOverdue <= 90) buckets.days61_90.push(entry);
      else                        buckets.over90.push(entry);
    });

    const sum = arr => arr.reduce((s, i) => s + Number(i.balance_due || 0), 0);

    ok(res, {
      asOf: today.toISOString().split('T')[0],
      buckets: {
        current:   { invoices: buckets.current,   total: sum(buckets.current)   },
        days1_30:  { invoices: buckets.days1_30,  total: sum(buckets.days1_30)  },
        days31_60: { invoices: buckets.days31_60, total: sum(buckets.days31_60) },
        days61_90: { invoices: buckets.days61_90, total: sum(buckets.days61_90) },
        over90:    { invoices: buckets.over90,    total: sum(buckets.over90)    },
      },
      totalOutstanding: sum(data || []),
    });
  } catch (e) { fail(res, e.message); }
});

// ── AP Aging ──────────────────────────────────────────────────────────────────
router.get('/reports/ap-aging', async (req, res) => {
  try {
    const workspaceId = ws(req);
    if (!workspaceId) return fail(res, 'Workspace context required', 400);

    const { data, error } = await supabase
      .from('vendor_bills')
      .select('id, bill_number, vendor_id, due_date, balance_due, status, bill_date')
      .eq('workspace_id', workspaceId)
      .in('status', ['approved', 'partial', 'overdue'])
      .gt('balance_due', 0)
      .order('due_date');

    if (error) return fail(res, error.message);

    const today = new Date();
    const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] };

    (data || []).forEach(bill => {
      const due = new Date(bill.due_date);
      const daysOverdue = Math.floor((today - due) / 86400000);
      const entry = { ...bill, daysOverdue };
      if      (daysOverdue <= 0)  buckets.current.push(entry);
      else if (daysOverdue <= 30) buckets.days1_30.push(entry);
      else if (daysOverdue <= 60) buckets.days31_60.push(entry);
      else if (daysOverdue <= 90) buckets.days61_90.push(entry);
      else                        buckets.over90.push(entry);
    });

    const sum = arr => arr.reduce((s, b) => s + Number(b.balance_due || 0), 0);

    ok(res, {
      asOf: today.toISOString().split('T')[0],
      buckets: {
        current:   { bills: buckets.current,   total: sum(buckets.current)   },
        days1_30:  { bills: buckets.days1_30,  total: sum(buckets.days1_30)  },
        days31_60: { bills: buckets.days31_60, total: sum(buckets.days31_60) },
        days61_90: { bills: buckets.days61_90, total: sum(buckets.days61_90) },
        over90:    { bills: buckets.over90,    total: sum(buckets.over90)    },
      },
      totalOutstanding: sum(data || []),
    });
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FISCAL PERIODS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/fiscal-periods', async (req, res) => {
  try {
    const { fiscalYear, status } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('fiscal_periods')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('start_date');

    if (fiscalYear) q = q.eq('fiscal_year', parseInt(fiscalYear));
    if (status)     q = q.eq('status', status);

    const { data, error } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (e) { fail(res, e.message); }
});

// Generate monthly fiscal periods for a given year
router.post('/fiscal-periods/generate', async (req, res) => {
  try {
    const { fiscalYear } = req.body;
    const workspaceId = ws(req);
    if (!fiscalYear) return fail(res, 'fiscalYear required', 400);

    const year = parseInt(fiscalYear);
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    const periods = months.map((month, i) => {
      const m = i + 1;
      const start = new Date(year, i, 1);
      const end   = new Date(year, i + 1, 0);
      return {
        workspace_id: workspaceId,
        period_name: `${month} ${year}`,
        period_type: 'month',
        fiscal_year: year,
        period_number: m,
        start_date: start.toISOString().split('T')[0],
        end_date:   end.toISOString().split('T')[0],
        status: 'open',
      };
    });

    const { data, error } = await supabase.from('fiscal_periods')
      .upsert(periods, {
        onConflict: 'workspace_id,fiscal_year,period_type,period_number',
        ignoreDuplicates: true,
      })
      .select();

    if (error) return fail(res, error.message);
    ok(res, data, { generated: data.length });
  } catch (e) { fail(res, e.message); }
});

router.patch('/fiscal-periods/:id/close', async (req, res) => {
  try {
    const { data, error } = await supabase.from('fiscal_periods')
      .update({
        status: 'closed',
        closed_by: req.user?.id || null,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

router.patch('/fiscal-periods/:id/reopen', async (req, res) => {
  try {
    const { data, error } = await supabase.from('fiscal_periods')
      .update({
        status: 'open',
        closed_by: null,
        closed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .select().single();

    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTS PAYABLE — Vendor Bills
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/bills', async (req, res) => {
  try {
    const { status, vendorId, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;
    const workspaceId = ws(req);

    let q = supabase.from('vendor_bills')
      .select('*, vendor:finance_vendors(name, tax_id)', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status && status !== 'all') q = q.eq('status', status);
    if (vendorId) q = q.eq('vendor_id', vendorId);
    if (dateFrom) q = q.gte('bill_date', dateFrom);
    if (dateTo)   q = q.lte('bill_date', dateTo);

    const { data, error, count } = await q;
    if (error) return fail(res, error.message);
    ok(res, data || [], { total: count });
  } catch (e) { fail(res, e.message); }
});

router.post('/bills', async (req, res) => {
  try {
    const {
      vendorId, billDate, dueDate, vendorRef, description, notes,
      subtotal, vatAmount = 0, ewtAmount = 0, totalAmount,
      currency = 'PHP', lines = [],
    } = req.body;
    const workspaceId = ws(req);
    const createdBy = req.user?.id || null;

    if (!dueDate || !subtotal) return fail(res, 'dueDate, subtotal required', 400);

    // Generate bill number
    const { data: last } = await supabase.from('vendor_bills')
      .select('bill_number')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    const lastNum = last ? parseInt(last.bill_number.replace(/^BILL-/, ''), 10) || 0 : 0;
    const billNumber = `BILL-${String(lastNum + 1).padStart(5, '0')}`;

    const total = totalAmount ?? (parseFloat(subtotal) + parseFloat(vatAmount) - parseFloat(ewtAmount));

    const { data: bill, error: billErr } = await supabase.from('vendor_bills').insert({
      workspace_id: workspaceId,
      vendor_id: vendorId || null,
      bill_number: billNumber,
      vendor_ref: vendorRef || null,
      bill_date: billDate || new Date().toISOString().split('T')[0],
      due_date: dueDate,
      status: 'received',
      subtotal: parseFloat(subtotal),
      vat_amount: parseFloat(vatAmount),
      ewt_amount: parseFloat(ewtAmount),
      total_amount: parseFloat(total),
      amount_paid: 0,
      currency,
      description: description || null,
      notes: notes || null,
      created_by: createdBy,
    }).select().single();

    if (billErr) return fail(res, billErr.message);

    if (lines.length > 0) {
      const lineRows = lines.map((l, i) => ({
        bill_id: bill.id,
        description: l.description,
        quantity: parseFloat(l.quantity || 1),
        unit_price: parseFloat(l.unitPrice || 0),
        amount: parseFloat(l.amount || 0),
        account_id: l.accountId || null,
        tax_code: l.taxCode || null,
        line_order: i + 1,
      }));
      await supabase.from('vendor_bill_lines').insert(lineRows);
    }

    ok(res, bill);
  } catch (e) { fail(res, e.message); }
});

router.patch('/bills/:id', async (req, res) => {
  try {
    const allowed = ['status', 'due_date', 'notes', 'attachment_url', 'approved_by'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (req.body.status === 'approved') updates.approved_at = new Date().toISOString();

    const { data, error } = await supabase.from('vendor_bills')
      .update(updates)
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (e) { fail(res, e.message); }
});

// Record payment against a vendor bill
router.post('/bills/:id/pay', async (req, res) => {
  try {
    const { amount, paymentDate, paymentMethod = 'bank_transfer', reference, notes } = req.body;
    const workspaceId = ws(req);
    const createdBy = req.user?.id || null;

    if (!amount) return fail(res, 'amount required', 400);

    const { data: bill, error: billErr } = await supabase.from('vendor_bills')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (billErr || !bill) return fail(res, 'Bill not found', 404);
    if (bill.status === 'paid') return fail(res, 'Bill is already fully paid', 400);

    const payAmount = parseFloat(amount);
    const remaining = parseFloat(bill.total_amount) - parseFloat(bill.amount_paid);
    if (payAmount > remaining + 0.01) {
      return fail(res, `Payment ₱${payAmount.toFixed(2)} exceeds outstanding balance ₱${remaining.toFixed(2)}`, 400);
    }

    // Generate payment number
    const { data: lastPay } = await supabase.from('bill_payments')
      .select('payment_number')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    const lastPNum = lastPay ? parseInt(lastPay.payment_number.replace(/^PAY-/, ''), 10) || 0 : 0;
    const paymentNumber = `PAY-${String(lastPNum + 1).padStart(5, '0')}`;

    const { data: payment, error: payErr } = await supabase.from('bill_payments').insert({
      workspace_id: workspaceId,
      bill_id: bill.id,
      payment_number: paymentNumber,
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      amount: payAmount,
      payment_method: paymentMethod,
      reference: reference || null,
      notes: notes || null,
      created_by: createdBy,
    }).select().single();

    if (payErr) return fail(res, payErr.message);

    // Update bill's amount_paid and status
    const newPaid   = parseFloat(bill.amount_paid) + payAmount;
    const newStatus = newPaid >= parseFloat(bill.total_amount) - 0.01 ? 'paid' : 'partial';

    await supabase.from('vendor_bills')
      .update({ amount_paid: newPaid, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bill.id);

    ok(res, payment);
  } catch (e) { fail(res, e.message); }
});

module.exports = router;
