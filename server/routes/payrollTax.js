/**
 * Payroll Tax Routes
 * TRAIN Law (RA 10963) withholding tax brackets
 * SSS 2024 rates, PhilHealth 2024, Pag-IBIG
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const router  = express.Router();
const { supabase } = require('../config/supabase');
const {
  computeMonthlyWT,
  computeSSS,
  computePhilHealth,
  computePagibig,
  computePayslip,
} = require('../services/payrollCalculator');

function ws(req) { return req.workspaceId; }

// ── Calculator endpoint (stateless) ──────────────────────────────────────────

router.post('/calculate', (req, res) => {
  try {
    const { monthly_salary, de_minimis = 0, other_taxable = 0 } = req.body;
    const data = computePayslip({ monthly_salary, de_minimis, other_taxable });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── PAYROLL RUNS ──────────────────────────────────────────────────────────────

router.get('/runs', async (req, res) => {
  try {
    const { year, month, status } = req.query;
    let q = supabase
      .from('payroll_runs')
      .select('*')
      .eq('workspace_id', ws(req))
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (year)   q = q.eq('period_year',  parseInt(year));
    if (month)  q = q.eq('period_month', parseInt(month));
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.get('/runs/:id', async (req, res) => {
  try {
    const [runRes, linesRes] = await Promise.all([
      supabase.from('payroll_runs').select('*').eq('id', req.params.id).eq('workspace_id', ws(req)).single(),
      supabase.from('payroll_tax_lines').select('*').eq('payroll_run_id', req.params.id).eq('workspace_id', ws(req)).order('employee_name'),
    ]);
    if (runRes.error) throw runRes.error;
    res.json({ success: true, data: { ...runRes.data, lines: linesRes.data || [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.post('/runs', async (req, res) => {
  try {
    const { period_year, period_month, payroll_type = 'regular', notes, cut_off_date, payment_date } = req.body;
    if (!period_year || !period_month)
      return res.status(400).json({ success: false, error: 'period_year and period_month required' });

    const runName = `${new Date(period_year, period_month - 1).toLocaleString('en-PH', { month: 'long' })} ${period_year} – ${payroll_type.replace('_', ' ')}`;
    const defaultCutoff = `${period_year}-${String(period_month).padStart(2,'0')}-${payroll_type === 'mid_month' ? '15' : new Date(period_year, period_month, 0).getDate()}`;

    const { data, error } = await supabase
      .from('payroll_runs')
      .insert({
        workspace_id: ws(req), period_year, period_month,
        run_name: runName,
        cut_off_date: cut_off_date || defaultCutoff,
        payment_date: payment_date || null,
        payroll_type, status: 'draft', notes,
        total_basic_pay: 0, total_allowances: 0, total_gross_pay: 0,
        total_sss_employee: 0, total_sss_employer: 0,
        total_philhealth_employee: 0, total_philhealth_employer: 0,
        total_pagibig_employee: 0, total_pagibig_employer: 0,
        total_wt_compensation: 0, total_other_deductions: 0, total_net_pay: 0,
        created_by: req.user.id,
      })
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// Add employee lines to a payroll run
router.post('/runs/:id/lines', async (req, res) => {
  try {
    const { employees } = req.body; // array of { employee_id, employee_name, employee_tin, position, basic_salary, de_minimis, other_taxable, thirteenth_month }
    if (!employees || !employees.length)
      return res.status(400).json({ success: false, error: 'employees array required' });

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('*').eq('id', req.params.id).eq('workspace_id', ws(req)).single();
    if (runErr || !run) return res.status(404).json({ success: false, error: 'Payroll run not found' });
    if (run.status === 'posted') return res.status(400).json({ success: false, error: 'Cannot modify a posted payroll run' });

    // Validate numeric inputs up front. A non-numeric basic_salary would cascade
    // NaN through every deduction and write NaN payslips into payroll_tax_lines.
    const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
    const inputErrors = [];
    employees.forEach((emp, i) => {
      const who = emp.employee_name || emp.employee_id || `row ${i + 1}`;
      for (const field of ['basic_salary', 'other_taxable', 'de_minimis', 'thirteenth_month']) {
        if (emp[field] != null && emp[field] !== '' && !Number.isFinite(Number(emp[field]))) {
          inputErrors.push(`${who}: ${field} must be a number`);
        }
      }
      if (!Number.isFinite(Number(emp.basic_salary)) || Number(emp.basic_salary) < 0) {
        inputErrors.push(`${who}: basic_salary is required and must be a non-negative number`);
      }
    });
    if (inputErrors.length) {
      return res.status(400).json({ success: false, error: 'Invalid employee figures', details: inputErrors });
    }

    const lines = employees.map(emp => {
      const salary       = num(emp.basic_salary, 0) || 0;
      const otherTaxable = num(emp.other_taxable, 0) || 0;
      const deMinimis    = num(emp.de_minimis, 0) || 0;
      const sss      = computeSSS(salary);
      const ph       = computePhilHealth(salary);
      const pagibig  = computePagibig(salary);
      const deductions = sss.total_ee + ph.ee + pagibig.ee;
      const taxable  = Math.max(salary + otherTaxable - deductions - deMinimis, 0);
      const wt       = computeMonthlyWT(taxable);
      const totalDeductions = deductions + wt;
      return {
        payroll_run_id: req.params.id,
        workspace_id:   ws(req),
        employee_id:    emp.employee_id || null,
        employee_name:  emp.employee_name,
        employee_tin:   emp.employee_tin  || null,
        basic_pay:      salary,
        allowances:     otherTaxable,
        gross_pay:      salary + otherTaxable,
        taxable_compensation: taxable,
        sss_ee:         sss.ee,   sss_er:     sss.er,
        sss_ec:         sss.ec,   sss_mpf_ee: sss.mpf_ee, sss_mpf_er: sss.mpf_er,
        philhealth_ee:  ph.ee,    philhealth_er: ph.er,
        pagibig_ee:     pagibig.ee, pagibig_er: pagibig.er,
        wt_compensation: wt,
        thirteenth_month_pay: num(emp.thirteenth_month, 0) || 0,
        total_deductions: totalDeductions,
        net_pay:        salary - totalDeductions,
      };
    });

    const { data: savedLines, error: lineErr } = await supabase
      .from('payroll_tax_lines')
      .upsert(lines, { onConflict: 'payroll_run_id,employee_id' })
      .select();
    if (lineErr) throw lineErr;

    // Recompute run totals — use exact DB column names from payroll_runs schema
    const totals = savedLines.reduce((acc, l) => {
      acc.total_gross_pay           += parseFloat(l.gross_pay || 0) || (parseFloat(l.basic_salary || 0) + parseFloat(l.other_taxable_income || 0));
      acc.total_basic_pay           += parseFloat(l.basic_pay || 0) || parseFloat(l.basic_salary || 0);
      acc.total_sss_employee        += parseFloat(l.sss_ee || 0) + parseFloat(l.sss_mpf_ee || 0);
      acc.total_sss_employer        += parseFloat(l.sss_er || 0) + parseFloat(l.sss_ec || 0) + parseFloat(l.sss_mpf_er || 0);
      acc.total_philhealth_employee += parseFloat(l.philhealth_ee || 0);
      acc.total_philhealth_employer += parseFloat(l.philhealth_er || 0);
      acc.total_pagibig_employee    += parseFloat(l.pagibig_ee || 0);
      acc.total_pagibig_employer    += parseFloat(l.pagibig_er || 0);
      acc.total_wt_compensation     += parseFloat(l.wt_compensation || 0);
      acc.total_net_pay             += parseFloat(l.net_pay || 0);
      return acc;
    }, {
      total_basic_pay: 0, total_gross_pay: 0, total_allowances: 0,
      total_sss_employee: 0, total_sss_employer: 0,
      total_philhealth_employee: 0, total_philhealth_employer: 0,
      total_pagibig_employee: 0, total_pagibig_employer: 0,
      total_wt_compensation: 0, total_other_deductions: 0, total_net_pay: 0,
    });

    const { error: updateErr } = await supabase
      .from('payroll_runs')
      .update({ ...totals, employee_count: savedLines.length, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (updateErr) throw updateErr;

    res.json({ success: true, data: savedLines, totals });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

router.patch('/runs/:id', async (req, res) => {
  try {
    const allowed = ['status','notes','posted_by','posted_at'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.body.status === 'posted') {
      updates.posted_by = req.user.id;
      updates.posted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('payroll_runs')
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

// ── Yearly BIR Contributions Summary (for Alphalist & 1601C) ─────────────────

router.get('/summary/:year', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payroll_tax_lines')
      .select(`
        employee_name, employee_tin, position,
        basic_salary, taxable_compensation, wt_compensation,
        sss_ee, sss_er, philhealth_ee, philhealth_er, pagibig_ee, pagibig_er,
        thirteenth_month_pay,
        payroll_runs!inner(period_year, period_month, status)
      `)
      .eq('workspace_id', ws(req))
      .eq('payroll_runs.period_year', parseInt(req.params.year))
      .eq('payroll_runs.status', 'posted');

    if (error) throw error;

    // Aggregate by employee
    const byEmployee = {};
    (data || []).forEach(l => {
      const key = l.employee_tin || l.employee_name;
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employee_name: l.employee_name, employee_tin: l.employee_tin, position: l.position,
          annual_gross: 0, annual_taxable: 0, annual_wt: 0,
          annual_sss_ee: 0, annual_sss_er: 0,
          annual_ph_ee: 0, annual_ph_er: 0,
          annual_pagibig_ee: 0, annual_pagibig_er: 0,
          thirteenth_month_pay: 0,
        };
      }
      const e = byEmployee[key];
      e.annual_gross          += parseFloat(l.basic_salary || 0);
      e.annual_taxable        += parseFloat(l.taxable_compensation || 0);
      e.annual_wt             += parseFloat(l.wt_compensation || 0);
      e.annual_sss_ee         += parseFloat(l.sss_ee || 0);
      e.annual_sss_er         += parseFloat(l.sss_er || 0);
      e.annual_ph_ee          += parseFloat(l.philhealth_ee || 0);
      e.annual_ph_er          += parseFloat(l.philhealth_er || 0);
      e.annual_pagibig_ee     += parseFloat(l.pagibig_ee || 0);
      e.annual_pagibig_er     += parseFloat(l.pagibig_er || 0);
      e.thirteenth_month_pay  += parseFloat(l.thirteenth_month_pay || 0);
    });

    res.json({ success: true, data: Object.values(byEmployee) });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
