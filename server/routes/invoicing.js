const logger = require('../config/logger');
/**
 * Invoicing & Quotes Routes
 * Handles CRUD for invoices, quotes, payments, and expense tracking.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// ── Auto GL Posting Helper ─────────────────────────────────────────────────────
// Soft-post: finds the workspace's AR / Revenue / Cash accounts by type and
// creates double-entry GL rows. Fails silently so invoicing never breaks.

async function findGlAccount(workspaceId, accountType, preferred_codes = []) {
  if (preferred_codes.length) {
    const { data, error } = await supabase.from('gl_accounts')
      .select('id, name, account_code')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .in('account_code', preferred_codes)
      .order('account_code')
      .limit(1)
      .maybeSingle();
    if (!error && data) return data;
  }

  const { data, error } = await supabase.from('gl_accounts')
    .select('id, name, account_code')
    .eq('workspace_id', workspaceId)
    .eq('account_type', accountType)
    .eq('is_active', true)
    .order('account_code')
    .limit(1)
    .maybeSingle();
  return !error ? (data || null) : null;
}

async function generateJournalNumber(workspaceId) {
  const { data } = await supabase.from('journal_entries')
    .select('je_number')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = data ? parseInt(data.je_number.replace(/^JE-/, ''), 10) || 0 : 0;
  return `JE-${String(lastNum + 1).padStart(6, '0')}`;
}

async function postJournalLines(workspaceId, { entryDate, sourceType, sourceId, sourceNumber, memo, lines }) {
  try {
    const jeNumber = await generateJournalNumber(workspaceId);
    const { data: je, error: jeError } = await supabase.from('journal_entries').insert({
      workspace_id: workspaceId,
      je_number: jeNumber,
      entry_date: entryDate,
      memo,
      reference: sourceNumber || `${sourceType}:${sourceId}`,
      total_amount: lines.reduce((sum, l) => sum + roundMoney(l.debit || 0), 0),
      status: 'posted',
      created_by: null,
    }).select().single();

    if (jeError) throw jeError;

    const lineRows = lines.map((l, index) => ({
      journal_entry_id: je.id,
      account_id: l.accountId,
      debit: roundMoney(l.debit || 0),
      credit: roundMoney(l.credit || 0),
      description: l.description || memo,
      line_order: index + 1,
    }));

    const { error: lineError } = await supabase.from('journal_entry_lines').insert(lineRows);
    if (lineError) {
      await supabase.from('journal_entries').delete().eq('id', je.id);
      throw lineError;
    }

    return je;
  } catch (e) {
    logger.warn({ message: e.message }, '[GL] Auto-post failed:');
    return null;
  }
}

// ── Helper: generate next invoice number ───────────────────────────────────────

async function generateInvoiceNumber(workspaceId, prefix = 'INV') {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = data ? parseInt(data.invoice_number.replace(/^[A-Z]+-/, ''), 10) || 0 : 0;
  const nextNum = String(lastNum + 1).padStart(5, '0');
  return `${prefix}-${nextNum}`;
}

async function generateQuoteNumber(workspaceId) {
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = data ? parseInt(data.quote_number.replace(/^[A-Z]+-/, ''), 10) || 0 : 0;
  const nextNum = String(lastNum + 1).padStart(5, '0');
  return `QT-${nextNum}`;
}

async function generatePaymentNumber(workspaceId) {
  const { data } = await supabase
    .from('payments_received')
    .select('payment_number')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = data ? parseInt(data.payment_number.replace(/^[A-Z]+-/, ''), 10) || 0 : 0;
  const nextNum = String(lastNum + 1).padStart(5, '0');
  return `PAY-${nextNum}`;
}

// ── Tax Calculation Helpers ────────────────────────────────────────────────────

function calculateVAT(subtotal, vatRate = 12, vatType = 'inclusive') {
  if (['zero_rated', 'exempt', 'vat_zero', 'vat_exempt'].includes(vatType) || Number(vatRate) === 0) {
    return { vatAmount: 0, netAmount: roundMoney(subtotal) };
  }
  if (vatType === 'inclusive') {
    const netAmount = roundMoney(subtotal / (1 + Number(vatRate) / 100));
    const vatAmount = roundMoney(subtotal - netAmount);
    return { vatAmount, netAmount };
  }
  const vatAmount = roundMoney(subtotal * (Number(vatRate) / 100));
  return { vatAmount, netAmount: roundMoney(subtotal) };
}

// BIR-correct: EWT is applied to the VAT-exclusive (net) income, not the gross total.
// RR 2-98: expanded withholding tax base = income payment BEFORE VAT.
function calculateEWT(netAmount, ewtRate) {
  if (!ewtRate || Number(ewtRate) <= 0) return 0;
  return roundMoney(Number(netAmount) * (Number(ewtRate) / 100));
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES

router.use(requireAuth);
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/invoicing/invoices?workspaceId=...&status=...
 */
router.get('/invoices', async (req, res) => {
  try {
    const { workspaceId, status, search } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    let query = supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('workspace_id', req.workspaceId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.ilike('invoice_number', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error({ message: error.message }, '[Invoicing] List error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/invoicing/invoices/:id
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*, revenue_account:chart_of_accounts!invoice_items_revenue_account_id_fkey(id, account_name))')
      .eq('id', req.params.id)
      .eq('workspace_id', req.workspaceId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Invoice not found' });

    res.json({ success: true, data });
  } catch (error) {
    logger.error({ message: error.message }, '[Invoicing] Get error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/invoicing/invoices
 * Create a new invoice with line items
 */
router.post('/invoices', async (req, res) => {
  try {
    const {
      workspace_id, customer_id, deal_id, contact_id,
      issue_date, due_date, items = [],
      discount_percent = 0, vat_rate = 12, vat_type = 'inclusive',
      ewt_rate = 0, notes, terms, payment_terms = 'net_30',
      tin_number, bir_serial_number, or_number,
    } = req.body;

    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' });
    if (items.length === 0) return res.status(400).json({ error: 'At least one line item is required' });

    const invoice_number = await generateInvoiceNumber(workspace_id);

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map((item, index) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price || 0);
      const itemDiscount = Number(item.discount_amount || 0);
      const lineTotal = Math.round((quantity * unitPrice - itemDiscount) * 100) / 100;
      subtotal += lineTotal;

      return {
        ...item,
        quantity,
        unit_price: unitPrice,
        discount_amount: itemDiscount,
        total: lineTotal,
        sort_order: index,
        vat_rate: item.vat_rate ?? vat_rate,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    // Apply invoice-level discount
    const discountAmount = Math.round(subtotal * (discount_percent / 100) * 100) / 100;
    const afterDiscount = subtotal - discountAmount;

    // BIR-compliant tax calculation
    // VAT: 12% on the discounted amount; EWT base is always the VAT-exclusive net
    const { vatAmount, netAmount } = calculateVAT(afterDiscount, vat_rate, vat_type);
    const ewtAmount = calculateEWT(netAmount, ewt_rate);

    // Total = gross + VAT (if exclusive) - EWT
    const grossPlusVat = vat_type === 'exclusive'
      ? Math.round((afterDiscount + vatAmount) * 100) / 100
      : afterDiscount;
    const total = Math.round((grossPlusVat - ewtAmount) * 100) / 100;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        workspace_id,
        invoice_number,
        customer_id,
        deal_id,
        contact_id,
        status: 'draft',
        invoice_type: 'invoice',
        issue_date,
        due_date,
        subtotal,
        discount_amount: discountAmount,
        discount_percent,
        vat_rate,
        vat_amount: vatAmount,
        vat_type,
        ewt_rate,
        ewt_amount: ewtAmount,
        total,
        balance_due: total,
        notes,
        terms,
        payment_terms,
        tin_number,
        bir_serial_number,
        or_number,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Insert line items
    const itemsToInsert = processedItems.map((item) => ({
      invoice_id: invoice.id,
      workspace_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      discount_amount: item.discount_amount || 0,
      vat_rate: item.vat_rate,
      vat_amount: item.vat_amount || 0,
      total: item.total,
      revenue_account_id: item.revenue_account_id || null,
      sort_order: item.sort_order,
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // Fetch complete invoice with items
    const { data: fullInvoice } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('id', invoice.id)
      .single();

    // Log audit
    try {
      await supabase.from('audit_logs').insert({
        workspace_id,
        user_id: req.user?.id,
        action: 'create',
        resource_type: 'invoice',
        resource_id: invoice.id,
        resource_name: invoice.invoice_number,
        new_values: { total, status: 'draft' },
      });
    } catch (auditErr) { /* non-critical */ }

    // Auto-post GL: DR Accounts Receivable / CR Revenue (soft, non-blocking)
    const [arAccount, revenueAccount] = await Promise.all([
      findGlAccount(workspace_id, 'asset', ['1100', '1110', '1120', '1200']),
      findGlAccount(workspace_id, 'revenue', ['4000', '4100', '4110']),
    ]);
    if (arAccount && revenueAccount) {
      await postJournalLines(workspace_id, {
        entryDate: invoice.issue_date || new Date().toISOString().split('T')[0],
        sourceType: 'invoice',
        sourceId: invoice.id,
        sourceNumber: invoice.invoice_number,
        memo: `Invoice ${invoice.invoice_number} — ${total >= 0 ? 'Billed to customer' : 'Credit memo'}`,
        lines: [
          { accountId: arAccount.id, debit: total, credit: 0, description: `AR — ${invoice.invoice_number}` },
          { accountId: revenueAccount.id, debit: 0, credit: total, description: `Revenue — ${invoice.invoice_number}` },
        ],
      });
    }

    res.status(201).json({ success: true, invoice: fullInvoice || invoice });
  } catch (error) {
    logger.error({ message: error.message }, '[Invoicing] Create error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/invoicing/invoices/:id
 * Update invoice status, details, or send
 */
const INVOICE_PATCH_ALLOWED = new Set([
  'status', 'due_date', 'notes', 'terms', 'discount', 'discount_type',
  'payment_terms', 'purchase_order_number', 'currency', 'subject',
]);

router.patch('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace context required' });

    // Whitelist-only update to prevent overwriting workspace_id, total, or other system fields
    const updates = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (INVOICE_PATCH_ALLOWED.has(k)) updates[k] = v;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, items:invoice_items(*)')
      .single();

    if (error) throw error;

    res.json({ success: true, invoice: data });
  } catch (error) {
    logger.error({ message: error.message }, '[Invoicing] Update error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/invoicing/invoices/:id/send
 * Mark invoice as sent and optionally email it
 */
router.post('/invoices/:id/send', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace context required' });
    const { sendEmail = false, customMessage } = req.body;

    // Update status — scoped to the caller's workspace
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*, items:invoice_items(*)')
      .single();

    if (error) throw error;

    // Send email if requested
    if (sendEmail && invoice.customer_email) {
      try {
        const { sendInvoiceEmail } = require('../services/emailService');
        await sendInvoiceEmail(invoice, invoice.customer_name || 'Invoice', customMessage);
      } catch (emailErr) {
        logger.warn({ message: emailErr.message }, '[Invoicing] Email send failed:');
      }
    }

    res.json({ success: true, invoice });
  } catch (error) {
    logger.error({ message: error.message }, '[Invoicing] Send error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/invoicing/invoices/:id
 */
router.delete('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace context required' });

    // Verify ownership before cascading delete
    const { data: invoice, error: fetchErr } = await supabase
      .from('invoices').select('id').eq('id', req.params.id).eq('workspace_id', workspaceId).maybeSingle();
    if (fetchErr || !invoice) return res.status(404).json({ error: 'Invoice not found' });

    const { error } = await supabase.from('invoice_items').delete().eq('invoice_id', req.params.id);
    if (error) throw error;

    const { error: invError } = await supabase.from('invoices').delete().eq('id', req.params.id).eq('workspace_id', workspaceId);
    if (invError) throw invError;

    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    logger.error({ message: error.message }, '[Invoicing] Delete error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/invoicing/quotes?workspaceId=...
 */
router.get('/quotes', async (req, res) => {
  try {
    const { workspaceId, status } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    let query = supabase
      .from('quotes')
      .select('*, items:quote_items(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, quotes: data || [] });
  } catch (error) {
    logger.error({ message: error.message }, '[Quotes] List error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/invoicing/quotes
 */
router.post('/quotes', async (req, res) => {
  try {
    const {
      workspace_id, customer_id, deal_id, contact_id,
      issue_date, valid_until, items = [],
      discount_percent = 0, vat_rate = 12,
      title, notes, terms, currency = 'PHP',
    } = req.body;

    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' });
    if (items.length === 0) return res.status(400).json({ error: 'At least one line item is required' });

    const quote_number = await generateQuoteNumber(workspace_id);

    let subtotal = 0;
    const processedItems = items.map((item, index) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price || 0);
      const itemDiscount = Number(item.discount_amount || 0);
      const lineTotal = Math.round((quantity * unitPrice - itemDiscount) * 100) / 100;
      subtotal += lineTotal;
      return {
        description: item.description,
        quantity,
        unit_price: unitPrice,
        discount_percent: item.discount_percent || 0,
        discount_amount: itemDiscount,
        vat_rate: item.vat_rate ?? vat_rate,
        total: lineTotal,
        sort_order: index,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    const discountAmount = Math.round(subtotal * (discount_percent / 100) * 100) / 100;
    const afterDiscount = subtotal - discountAmount;
    const { vatAmount } = calculateVAT(afterDiscount, vat_rate, 'inclusive');
    const total = Math.round(afterDiscount * 100) / 100;

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        workspace_id, quote_number,
        customer_id, deal_id, contact_id,
        status: 'draft', issue_date, valid_until,
        subtotal, discount_amount: discountAmount, discount_percent,
        vat_rate, vat_amount: vatAmount, total,
        title, notes, terms, currency,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (quoteError) throw quoteError;

    // Insert items
    const itemsToInsert = processedItems.map((item) => ({
      quote_id: quote.id, workspace_id, ...item,
    }));

    const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    res.status(201).json({ success: true, quote });
  } catch (error) {
    logger.error({ message: error.message }, '[Quotes] Create error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/invoicing/quotes/:id/convert-to-invoice
 */
router.post('/quotes/:id/convert-to-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace context required' });

    // Fetch quote — scoped to the caller's workspace so a foreign quote UUID
    // cannot be converted into an invoice in another tenant's books.
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, items:quote_items(*)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (quoteError || !quote) return res.status(404).json({ error: 'Quote not found' });
    if (quote.status === 'converted') return res.status(400).json({ error: 'Quote already converted' });

    // Create invoice from quote
    const invoice_number = await generateInvoiceNumber(quote.workspace_id);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        workspace_id: quote.workspace_id,
        invoice_number,
        customer_id: quote.customer_id,
        deal_id: quote.deal_id,
        contact_id: quote.contact_id,
        status: 'draft',
        invoice_type: 'invoice',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        subtotal: quote.subtotal,
        discount_amount: quote.discount_amount,
        discount_percent: quote.discount_percent,
        vat_rate: quote.vat_rate,
        vat_amount: quote.vat_amount,
        total: quote.total,
        balance_due: quote.total,
        notes: quote.notes,
        terms: quote.terms,
        currency: quote.currency,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Copy items
    const invoiceItems = (quote.items || []).map((item) => ({
      invoice_id: invoice.id,
      workspace_id: quote.workspace_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      discount_amount: item.discount_amount,
      vat_rate: item.vat_rate,
      total: item.total,
      sort_order: item.sort_order,
    }));

    if (invoiceItems.length > 0) {
      await supabase.from('invoice_items').insert(invoiceItems);
    }

    // Mark quote as converted
    await supabase
      .from('quotes')
      .update({
        status: 'converted',
        converted_to_invoice_id: invoice.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    res.json({ success: true, invoice, quote_id: id });
  } catch (error) {
    logger.error({ message: error.message }, '[Quotes] Convert error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/invoicing/payments
 * Record a payment against an invoice
 */
router.post('/payments', async (req, res) => {
  try {
    const {
      workspace_id, invoice_id, customer_id,
      amount, payment_method, reference_number,
      payment_date, notes, official_receipt_number,
    } = req.body;

    if (!workspace_id || !invoice_id || !amount) {
      return res.status(400).json({ error: 'workspace_id, invoice_id, and amount are required' });
    }

    const payment_number = await generatePaymentNumber(workspace_id);

    const { data: payment, error } = await supabase
      .from('payments_received')
      .insert({
        workspace_id, payment_number, invoice_id, customer_id,
        amount: Number(amount),
        payment_method: payment_method || 'bank_transfer',
        reference_number,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        notes,
        official_receipt_number,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Update invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .select('amount_paid, total')
      .eq('id', invoice_id)
      .single();

    const newAmountPaid = (Number(invoice?.amount_paid) || 0) + Number(amount);
    const balanceDue = Math.max(0, (Number(invoice?.total) || 0) - newAmountPaid);
    const newStatus = balanceDue === 0 ? 'paid' : 'partial';

    await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        balance_due: balanceDue,
        status: newStatus,
        paid_at: balanceDue === 0 ? new Date().toISOString() : null,
      })
      .eq('id', invoice_id);

    // Auto-post GL: DR Cash/Bank / CR Accounts Receivable (soft, non-blocking)
    const [cashAccount, arAccount] = await Promise.all([
      findGlAccount(workspace_id, 'asset', ['1000', '1010', '1011', '1050']),
      findGlAccount(workspace_id, 'asset', ['1100', '1110', '1120', '1200']),
    ]);
    if (cashAccount && arAccount) {
      await postJournalLines(workspace_id, {
        entryDate: payment_date || new Date().toISOString().split('T')[0],
        sourceType: 'payment',
        sourceId: payment.id,
        sourceNumber: payment.payment_number,
        memo: `Payment ${payment.payment_number} — ${payment_method || 'bank_transfer'}`,
        lines: [
          { accountId: cashAccount.id, debit: Number(amount), credit: 0, description: `Cash received — ${payment.payment_number}` },
          { accountId: arAccount.id, debit: 0, credit: Number(amount), description: `AR cleared — ${payment.payment_number}` },
        ],
      });
    }

    res.status(201).json({ success: true, payment });
  } catch (error) {
    logger.error({ message: error.message }, '[Payments] Create error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/invoicing/payments?workspaceId=...
 */
router.get('/payments', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const { data, error } = await supabase
      .from('payments_received')
      .select('*, invoice:invoices(invoice_number, total, customer_id)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, payments: data || [] });
  } catch (error) {
    logger.error({ message: error.message }, '[Payments] List error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/invoicing/expenses?workspaceId=...
 */
router.get('/expenses', async (req, res) => {
  try {
    const { workspaceId, status } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('expense_date', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    // Calculate summary
    const total = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
    const totalVAT = (data || []).reduce((sum, e) => sum + Number(e.vat_amount || 0), 0);
    const totalEWT = (data || []).reduce((sum, e) => sum + Number(e.ewt_amount || 0), 0);

    res.json({
      success: true,
      expenses: data || [],
      summary: { count: (data || []).length, total, totalVAT, totalEWT },
    });
  } catch (error) {
    logger.error({ message: error.message }, '[Expenses] List error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/invoicing/expenses
 */
router.post('/expenses', async (req, res) => {
  try {
    const {
      workspace_id, expense_date, description, amount,
      category, expense_account_id, payment_method,
      vendor_name, reference_number, or_number, receipt_url,
      vat_rate = 12, is_vat_inclusive = true, ewt_rate = 0,
    } = req.body;

    if (!workspace_id || !description || !amount) {
      return res.status(400).json({ error: 'workspace_id, description, and amount are required' });
    }

    const netAmount = is_vat_inclusive
      ? Math.round((Number(amount) / (1 + Number(vat_rate) / 100)) * 100) / 100
      : Number(amount);

    const vatAmount = Math.round((Number(amount) - netAmount) * 100) / 100;
    const ewtAmount = ewt_rate > 0
      ? Math.round(netAmount * (Number(ewt_rate) / 100) * 100) / 100
      : 0;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        workspace_id, expense_date, description,
        amount: Number(amount), category, expense_account_id,
        payment_method, vendor_name, reference_number, or_number, receipt_url,
        vat_rate: Number(vat_rate), vat_amount: vatAmount,
        is_vat_inclusive, ewt_rate: Number(ewt_rate), ewt_amount: ewtAmount,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, expense: data });
  } catch (error) {
    logger.error({ message: error.message }, '[Expenses] Create error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VENDORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/invoicing/vendors?workspaceId=...
 */
router.get('/vendors', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('vendor_name');

    if (error) throw error;
    res.json({ success: true, vendors: data || [] });
  } catch (error) {
    logger.error({ message: error.message }, '[Vendors] List error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/invoicing/vendors
 */
router.post('/vendors', async (req, res) => {
  try {
    const { workspace_id, vendor_name, ...rest } = req.body;
    if (!workspace_id || !vendor_name) {
      return res.status(400).json({ error: 'workspace_id and vendor_name are required' });
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert({ workspace_id, vendor_name, ...rest, created_by: req.user?.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, vendor: data });
  } catch (error) {
    logger.error({ message: error.message }, '[Vendors] Create error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/invoicing/accounts?workspaceId=...
 */
router.get('/accounts', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('account_code');

    if (error) throw error;
    res.json({ success: true, accounts: data || [] });
  } catch (error) {
    logger.error({ message: error.message }, '[Accounts] List error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/invoicing/accounts
 */
router.post('/accounts', async (req, res) => {
  try {
    const { workspace_id, account_code, account_name, account_type, parent_id, description, tax_category } = req.body;
    if (!workspace_id || !account_code || !account_name || !account_type) {
      return res.status(400).json({ error: 'workspace_id, account_code, account_name, and account_type are required' });
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert({
        workspace_id, account_code, account_name, account_type,
        parent_id, description, tax_category,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, account: data });
  } catch (error) {
    logger.error({ message: error.message }, '[Accounts] Create error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD / SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/invoicing/dashboard?workspaceId=...
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const [invoicesResult, paymentsResult, expensesResult, quotesResult] = await Promise.all([
      supabase.from('invoices').select('status, total, amount_paid, balance_due').eq('workspace_id', workspaceId),
      supabase.from('payments_received').select('amount').eq('workspace_id', workspaceId),
      supabase.from('expenses').select('amount').eq('workspace_id', workspaceId),
      supabase.from('quotes').select('status, total').eq('workspace_id', workspaceId),
    ]);

    const invoices = invoicesResult.data || [];
    const payments = paymentsResult.data || [];
    const expenses = expensesResult.data || [];
    const quotes = quotesResult.data || [];

    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + Number(i.balance_due || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'viewed').length;

    const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
    const overdueAmount = invoices
      .filter((i) => i.status === 'overdue')
      .reduce((sum, i) => sum + Number(i.balance_due || 0), 0);

    res.json({
      success: true,
      dashboard: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        totalExpenses,
        totalPayments,
        netCashFlow: totalPayments - totalExpenses,
        overdueInvoices,
        overdueAmount,
        totalQuotes: quotes.length,
        pendingQuotes,
        invoiceCount: invoices.length,
      },
    });
  } catch (error) {
    logger.error({ message: error.message }, '[Dashboard] Error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;