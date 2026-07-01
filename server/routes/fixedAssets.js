/**
 * Fixed Assets & Depreciation Routes
 * Aligned with BIR-allowed depreciation methods and PH GAAP useful life standards
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const router  = express.Router();
const { supabase } = require('../config/supabase');

function ws(req) { return req.workspaceId; }

// ── Depreciation Computation ──────────────────────────────────────────────────

/**
 * Returns monthly depreciation amount for a given method.
 * SL   = (cost - salvage) / (useful_life_years * 12)
 * DB   = book_value * (2 / (useful_life_years * 12))
 * SYD  = (remaining_months / SYD_total) * (cost - salvage)
 */
function computeMonthlyDepreciation(method, asset, bookValue, totalMonths, remainingMonths) {
  const depreciableBase = parseFloat(asset.acquisition_cost) - parseFloat(asset.salvage_value || 0);
  switch (method) {
    case 'straight_line':
      return depreciableBase / totalMonths;
    case 'double_declining':
      return parseFloat(bookValue) * (2 / totalMonths);
    case 'sum_of_years_digits': {
      const n    = totalMonths;
      const syd  = (n * (n + 1)) / 2;
      return (remainingMonths / syd) * depreciableBase;
    }
    default:
      return depreciableBase / totalMonths;
  }
}

// ── ASSETS CRUD ───────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { status, bir_asset_class, search } = req.query;
    let q = supabase
      .from('fixed_assets')
      .select('*')
      .eq('workspace_id', ws(req))
      .order('acquisition_date', { ascending: false });

    if (status)         q = q.eq('status', status);
    if (bir_asset_class) q = q.eq('bir_asset_class', bir_asset_class);
    if (search)         q = q.ilike('asset_name', `%${search}%`);

    const { data, error } = await q;
    if (error) throw error;

    const totalCost   = (data || []).reduce((s, a) => s + parseFloat(a.acquisition_cost || 0), 0);
    const totalAccDep = (data || []).reduce((s, a) => s + parseFloat(a.accumulated_depreciation || 0), 0);

    res.json({
      success: true, data: data || [],
      summary: {
        total_assets:    (data || []).length,
        total_cost:      totalCost,
        total_acc_dep:   totalAccDep,
        total_book_value: totalCost - totalAccDep,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      asset_code, asset_name, description, bir_asset_class,
      acquisition_date, acquisition_cost, salvage_value = 0,
      useful_life_years, depreciation_method = 'straight_line',
      location, assigned_to, serial_number, status = 'active',
      gl_account_id, accum_dep_account_id, dep_expense_account_id, notes,
      // accept legacy field names from the DB schema
      asset_category,
    } = req.body;

    if (!asset_name || !acquisition_date || !acquisition_cost || !useful_life_years)
      return res.status(400).json({ success: false, error: 'asset_name, acquisition_date, acquisition_cost, useful_life_years required' });

    const { data, error } = await supabase
      .from('fixed_assets')
      .insert({
        workspace_id: ws(req),
        asset_code: asset_code || `FA-${Date.now()}`,
        asset_name, description, bir_asset_class,
        asset_category: asset_category || bir_asset_class || 'other',
        acquisition_date, acquisition_cost, salvage_value,
        useful_life_years, depreciation_method,
        accumulated_depreciation: 0,
        location, assigned_to, serial_number, status,
        gl_asset_account:       gl_account_id        || null,
        gl_accum_depr_account:  accum_dep_account_id || null,
        gl_depreciation_account: dep_expense_account_id || null,
        notes,
        created_by: req.user.id,
      })
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = [
      'asset_name','description','location','assigned_to','serial_number',
      'status','salvage_value','useful_life_years','depreciation_method',
      'gl_asset_account','gl_accum_depr_account','gl_depreciation_account','notes',
    ];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    // Accept legacy field names from client
    if (req.body.gl_account_id)       updates.gl_asset_account       = req.body.gl_account_id;
    if (req.body.accum_dep_account_id) updates.gl_accum_depr_account = req.body.accum_dep_account_id;
    if (req.body.dep_expense_account_id) updates.gl_depreciation_account = req.body.dep_expense_account_id;

    const { data, error } = await supabase
      .from('fixed_assets')
      .update(updates)
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('fixed_assets')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── DEPRECIATION SCHEDULE & RUN ───────────────────────────────────────────────

router.get('/:id/depreciation', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('asset_depreciation_lines')
      .select('*')
      .eq('asset_id', req.params.id)
      .order('period_year', { ascending: true })
      .order('period_month', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// Preview full depreciation schedule without saving
router.post('/:id/depreciation/preview', async (req, res) => {
  try {
    const { data: asset, error } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .single();
    if (error || !asset) return res.status(404).json({ success: false, error: 'Asset not found' });

    const start          = new Date(asset.acquisition_date);
    const totalMonths    = asset.useful_life_years * 12;
    const lines          = [];
    let bookValue        = parseFloat(asset.acquisition_cost);
    const salvage        = parseFloat(asset.salvage_value || 0);

    for (let i = 0; i < totalMonths; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const remainingMonths = totalMonths - i;
      const depAmount = computeMonthlyDepreciation(
        asset.depreciation_method, asset, bookValue, totalMonths, remainingMonths
      );
      const actualDep = Math.min(depAmount, bookValue - salvage);
      bookValue      -= actualDep;

      lines.push({
        period_year:           d.getFullYear(),
        period_month:          d.getMonth() + 1,
        depreciation_amount:   Math.max(actualDep, 0).toFixed(4),
        accumulated_to_date:   (parseFloat(asset.acquisition_cost) - bookValue).toFixed(4),
        book_value_after:        bookValue.toFixed(4),
      });
      if (bookValue <= salvage) break;
    }

    res.json({ success: true, data: lines, total_months: lines.length });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// Run depreciation for a specific month — creates depreciation line + updates asset
router.post('/run-depreciation', async (req, res) => {
  try {
    const { period_year, period_month, asset_ids } = req.body;
    if (!period_year || !period_month)
      return res.status(400).json({ success: false, error: 'period_year and period_month required' });

    let assetsQuery = supabase
      .from('fixed_assets')
      .select('*')
      .eq('workspace_id', ws(req))
      .eq('status', 'active');
    if (asset_ids && asset_ids.length) assetsQuery = assetsQuery.in('id', asset_ids);

    const { data: assets, error: assetErr } = await assetsQuery;
    if (assetErr) throw assetErr;

    const results   = [];
    const skipped   = [];

    for (const asset of (assets || [])) {
      const totalMonths    = asset.useful_life_years * 12;
      const acquisition    = new Date(asset.acquisition_date);
      const runDate        = new Date(period_year, period_month - 1, 1);

      // Skip if depreciation hasn't started yet
      if (runDate < acquisition) { skipped.push({ id: asset.id, reason: 'before acquisition date' }); continue; }

      const monthsElapsed = (period_year - acquisition.getFullYear()) * 12
                          + (period_month - 1 - acquisition.getMonth());

      if (monthsElapsed >= totalMonths) { skipped.push({ id: asset.id, reason: 'fully depreciated' }); continue; }

      const bookValue      = parseFloat(asset.acquisition_cost) - parseFloat(asset.accumulated_depreciation || 0);
      const salvage        = parseFloat(asset.salvage_value || 0);
      if (bookValue <= salvage) { skipped.push({ id: asset.id, reason: 'at salvage value' }); continue; }

      const remainingMonths = totalMonths - monthsElapsed;
      const raw = computeMonthlyDepreciation(
        asset.depreciation_method, asset, bookValue, totalMonths, remainingMonths
      );
      const depAmount = Math.min(raw, bookValue - salvage);
      const newAccDep = parseFloat(asset.accumulated_depreciation || 0) + depAmount;

      const { error: lineErr } = await supabase
        .from('asset_depreciation_lines')
        .upsert({
          asset_id:             asset.id,
          workspace_id:         ws(req),
          period_year, period_month,
          depreciation_amount:  depAmount,
          accumulated_to_date:  newAccDep,
          book_value_after:       parseFloat(asset.acquisition_cost) - newAccDep,
          depreciation_method:  asset.depreciation_method,
          created_by:           req.user.id,
        }, { onConflict: 'asset_id,period_year,period_month' });
      if (lineErr) throw lineErr;

      const { error: updateErr } = await supabase
        .from('fixed_assets')
        .update({ accumulated_depreciation: newAccDep, updated_at: new Date().toISOString() })
        .eq('id', asset.id);
      if (updateErr) throw updateErr;

      results.push({ id: asset.id, asset_name: asset.asset_name, depreciation_amount: depAmount, new_book_value: parseFloat(asset.acquisition_cost) - newAccDep });
    }

    res.json({ success: true, processed: results.length, skipped: skipped.length, data: results, skipped_detail: skipped });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── ASSET DISPOSAL ────────────────────────────────────────────────────────────

router.post('/:id/dispose', async (req, res) => {
  try {
    const { disposal_date, disposal_type, proceeds = 0, buyer_name, buyer_tin, notes } = req.body;
    if (!disposal_date || !disposal_type)
      return res.status(400).json({ success: false, error: 'disposal_date and disposal_type required' });

    const { data: asset, error: assetErr } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', ws(req))
      .single();
    if (assetErr || !asset) return res.status(404).json({ success: false, error: 'Asset not found' });

    const bookValueAtDisposal = parseFloat(asset.acquisition_cost) - parseFloat(asset.accumulated_depreciation || 0);
    const gainLoss            = parseFloat(proceeds) - bookValueAtDisposal;

    const { data: disposal, error: dispErr } = await supabase
      .from('asset_disposals')
      .insert({
        workspace_id: ws(req),
        asset_id:    asset.id,
        disposal_date, disposal_type,
        proceeds_amount:         parseFloat(proceeds),
        book_value_at_disposal:  bookValueAtDisposal,
        buyer_name, buyer_tin, notes,
        created_by: req.user.id,
      })
      .select().single();
    if (dispErr) throw dispErr;

    // Update asset status to disposed
    const { error: updErr } = await supabase
      .from('fixed_assets')
      .update({ status: 'disposed', updated_at: new Date().toISOString() })
      .eq('id', asset.id);
    if (updErr) throw updErr;

    res.json({
      success: true,
      data: { ...disposal, gain_loss: gainLoss },
      message: gainLoss >= 0 ? `Gain on disposal: ₱${gainLoss.toFixed(2)}` : `Loss on disposal: ₱${Math.abs(gainLoss).toFixed(2)}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/disposals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('asset_disposals')
      .select('*, fixed_assets(asset_name, asset_code, bir_asset_class)')
      .eq('workspace_id', ws(req))
      .order('disposal_date', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
