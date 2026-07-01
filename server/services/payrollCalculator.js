/**
 * Philippine Payroll Tax Calculator
 * TRAIN Law (RA 10963) — withholding tax
 * SSS 2024 contribution table
 * PhilHealth 2024 (5% premium rate)
 * Pag-IBIG / HDMF
 *
 * All functions are pure (no I/O) so they can be unit tested in isolation.
 */

// ── TRAIN Law WT Brackets (monthly) ──────────────────────────────────────────

const TRAIN_BRACKETS_MONTHLY = [
  { min: 0,       max: 20833,   base: 0,        rate: 0    },
  { min: 20834,   max: 33332,   base: 0,        rate: 0.15 },
  { min: 33333,   max: 66666,   base: 1875,     rate: 0.20 },
  { min: 66667,   max: 166666,  base: 8541.8,   rate: 0.25 },
  { min: 166667,  max: 666666,  base: 33541.8,  rate: 0.30 },
  { min: 666667,  max: Infinity,base: 183541.8, rate: 0.35 },
];

function computeMonthlyWT(taxableCompensation) {
  const tc = parseFloat(taxableCompensation || 0);
  if (tc < 0) return 0;
  const bracket = TRAIN_BRACKETS_MONTHLY.find(b => tc >= b.min && tc <= b.max);
  if (!bracket) return 0;
  return bracket.base + (tc - bracket.min) * bracket.rate;
}

// ── SSS 2024 ─────────────────────────────────────────────────────────────────
// MSC floor ₱5,000 ceiling ₱35,000
// EE: 4.5%, ER: 9.5%, EC: flat ₱10 (≤₱14,750) / ₱30 (>₱14,750)
// MPF: 2.5% EE + 2.5% ER on compensation above ₱20,000 up to ₱35,000

function computeSSS(monthlySalary) {
  const salary  = parseFloat(monthlySalary || 0);
  const msc     = Math.min(Math.max(Math.ceil(salary / 500) * 500, 5000), 35000);
  const ee      = parseFloat((msc * 0.045).toFixed(2));
  const er      = parseFloat((msc * 0.095).toFixed(2));
  const ec      = salary <= 14750 ? 10 : 30;
  const mpfBase = Math.min(Math.max(salary - 20000, 0), 15000);
  const mpfEe   = parseFloat((mpfBase * 0.025).toFixed(2));
  const mpfEr   = parseFloat((mpfBase * 0.025).toFixed(2));

  return {
    ee,
    er,
    ec,
    mpf_ee:   mpfEe,
    mpf_er:   mpfEr,
    total_ee: parseFloat((ee + mpfEe).toFixed(2)),
    total_er: parseFloat((er + ec + mpfEr).toFixed(2)),
  };
}

// ── PhilHealth 2024 ───────────────────────────────────────────────────────────
// Premium rate: 5% of MSC; floor ₱10,000 ceiling ₱100,000; split 50/50

function computePhilHealth(monthlySalary) {
  const salary  = parseFloat(monthlySalary || 0);
  const base    = Math.min(Math.max(salary, 10000), 100000);
  const total   = parseFloat((base * 0.05).toFixed(2));
  const share   = parseFloat((total / 2).toFixed(2));
  return { ee: share, er: share, total };
}

// ── Pag-IBIG / HDMF ──────────────────────────────────────────────────────────
// ≤₱1,500: EE 1%, ER 2%; >₱1,500: EE 2%, ER 2%; EE max ₱100, ER max ₱100

function computePagibig(monthlySalary) {
  const salary  = parseFloat(monthlySalary || 0);
  const eeRate  = salary <= 1500 ? 0.01 : 0.02;
  const ee      = Math.min(parseFloat((salary * eeRate).toFixed(2)), 100);
  const er      = Math.min(parseFloat((salary * 0.02).toFixed(2)), 100);
  return { ee, er, total: parseFloat((ee + er).toFixed(2)) };
}

// ── Full payslip computation ──────────────────────────────────────────────────

function computePayslip({ monthly_salary, de_minimis = 0, other_taxable = 0 }) {
  const salary      = parseFloat(monthly_salary || 0);
  const sss         = computeSSS(salary);
  const philhealth  = computePhilHealth(salary);
  const pagibig     = computePagibig(salary);
  const deductions  = parseFloat((sss.total_ee + philhealth.ee + pagibig.ee).toFixed(2));
  const taxableComp = Math.max(
    salary + parseFloat(other_taxable) - deductions - parseFloat(de_minimis),
    0
  );
  const withholdingTax     = parseFloat(computeMonthlyWT(taxableComp).toFixed(2));
  const netPay             = parseFloat((salary - deductions - withholdingTax).toFixed(2));
  const totalEmployerCost  = parseFloat((salary + sss.total_er + philhealth.er + pagibig.er).toFixed(2));

  return {
    gross_salary:            salary,
    sss,
    philhealth,
    pagibig,
    mandatory_ee_deductions: deductions,
    de_minimis:              parseFloat(de_minimis),
    other_taxable:           parseFloat(other_taxable),
    taxable_compensation:    taxableComp,
    withholding_tax:         withholdingTax,
    net_pay:                 netPay,
    total_employer_cost:     totalEmployerCost,
  };
}

module.exports = {
  TRAIN_BRACKETS_MONTHLY,
  computeMonthlyWT,
  computeSSS,
  computePhilHealth,
  computePagibig,
  computePayslip,
};
