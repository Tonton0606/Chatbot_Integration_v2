/**
 * BIR Tax Compliance — pure computation helpers
 * Aligned with BIR RR 2-98, TRAIN Law (RA 10963), and PH GAAP.
 * All functions are stateless (no I/O) for testability.
 */

// ── VAT due date (BIR Form 2550M) ────────────────────────────────────────────
// Due: 20th of the month following the return period.
// December wraps to January of the following year.

function vatPeriodDueDate(month, year) {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
  return `${next.y}-${String(next.m).padStart(2, '0')}-20`;
}

// ── EWT due date (BIR Form 0619E) ────────────────────────────────────────────
// Due: 10th of the month following the return period.

function ewtDueDate(month, year) {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
  return `${next.y}-${String(next.m).padStart(2, '0')}-10`;
}

// ── VAT summary computation ───────────────────────────────────────────────────

function computeVatSummary(records = []) {
  const inputVat  = records.filter(r => r.record_type === 'input_vat');
  const outputVat = records.filter(r => r.record_type === 'output_vat');
  const totalInput  = inputVat.reduce((s, r)  => s + parseFloat(r.vat_amount || 0), 0);
  const totalOutput = outputVat.reduce((s, r) => s + parseFloat(r.vat_amount || 0), 0);
  const vatPayable  = totalOutput - totalInput;
  return {
    total_input_vat:  parseFloat(totalInput.toFixed(2)),
    total_output_vat: parseFloat(totalOutput.toFixed(2)),
    vat_payable:      vatPayable > 0 ? parseFloat(vatPayable.toFixed(2)) : 0,
    vat_refundable:   vatPayable < 0 ? parseFloat(Math.abs(vatPayable).toFixed(2)) : 0,
  };
}

// ── EWT computation ───────────────────────────────────────────────────────────
// Returns computed EWT amount and net payment given income and rate.
// Throws if rate is zero and no ATC fallback is available — prevents
// silent ₱0-tax records from reaching BIR filings.

function computeEWT({ income_payment, ewt_rate, ewt_amount, net_payment }) {
  const income = parseFloat(income_payment || 0);
  const rate   = parseFloat(ewt_rate || 0);

  if (rate === 0 && ewt_amount === undefined) {
    throw new Error('EWT rate is 0 and no ewt_amount provided. Verify ATC code or supply an explicit rate.');
  }

  const computed_ewt = ewt_amount !== undefined
    ? parseFloat(ewt_amount)
    : parseFloat((income * (rate / 100)).toFixed(2));

  const computed_net = net_payment !== undefined
    ? parseFloat(net_payment)
    : parseFloat((income - computed_ewt).toFixed(2));

  return { ewt_amount: computed_ewt, net_payment: computed_net };
}

module.exports = { vatPeriodDueDate, ewtDueDate, computeVatSummary, computeEWT };
