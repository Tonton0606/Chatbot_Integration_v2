/**
 * Unit tests — Philippine Payroll Tax Calculator
 *
 * Covers every TRAIN Law bracket boundary, SSS MSC ceiling/floor,
 * PhilHealth floor/ceiling, Pag-IBIG rate switch, and the full
 * payslip computation. No I/O — pure function tests.
 */

const {
  computeMonthlyWT,
  computeSSS,
  computePhilHealth,
  computePagibig,
  computePayslip,
} = require('../services/payrollCalculator');

// ── TRAIN Law withholding tax ─────────────────────────────────────────────────

describe('computeMonthlyWT — TRAIN Law (RA 10963)', () => {
  it('Bracket 1: ₱0 — exempt (₱0 tax)', () => {
    expect(computeMonthlyWT(0)).toBe(0);
  });

  it('Bracket 1: ₱20,833 — still exempt', () => {
    expect(computeMonthlyWT(20833)).toBe(0);
  });

  it('Bracket 2: ₱20,834 — 15% on excess over ₱20,834 (min of bracket)', () => {
    // excess = 20834 - 20834 = 0 → ₱0.00
    expect(computeMonthlyWT(20834)).toBeCloseTo(0, 2);
  });

  it('Bracket 2: ₱25,000 → 15% of (25000 - 20834)', () => {
    expect(computeMonthlyWT(25000)).toBeCloseTo((25000 - 20834) * 0.15, 1);
  });

  it('Bracket 3: ₱33,333 — base ₱1,875 + 20% on excess', () => {
    const expected = 1875 + (33333 - 33333) * 0.20;
    expect(computeMonthlyWT(33333)).toBeCloseTo(expected, 1);
  });

  it('Bracket 3: ₱50,000', () => {
    const expected = 1875 + (50000 - 33333) * 0.20;
    expect(computeMonthlyWT(50000)).toBeCloseTo(expected, 1);
  });

  it('Bracket 4: ₱66,667 — base ₱8,541.80 + 25% on excess', () => {
    const expected = 8541.8 + (66667 - 66667) * 0.25;
    expect(computeMonthlyWT(66667)).toBeCloseTo(expected, 1);
  });

  it('Bracket 4: ₱100,000', () => {
    const expected = 8541.8 + (100000 - 66667) * 0.25;
    expect(computeMonthlyWT(100000)).toBeCloseTo(expected, 1);
  });

  it('Bracket 5: ₱166,667 — base ₱33,541.80 + 30% on excess', () => {
    const expected = 33541.8 + (166667 - 166667) * 0.30;
    expect(computeMonthlyWT(166667)).toBeCloseTo(expected, 1);
  });

  it('Bracket 5: ₱300,000', () => {
    const expected = 33541.8 + (300000 - 166667) * 0.30;
    expect(computeMonthlyWT(300000)).toBeCloseTo(expected, 1);
  });

  it('Bracket 6: ₱666,667 — base ₱183,541.80 + 35% on excess', () => {
    const expected = 183541.8 + (666667 - 666667) * 0.35;
    expect(computeMonthlyWT(666667)).toBeCloseTo(expected, 1);
  });

  it('Bracket 6: ₱1,000,000', () => {
    const expected = 183541.8 + (1000000 - 666667) * 0.35;
    expect(computeMonthlyWT(1000000)).toBeCloseTo(expected, 1);
  });

  it('returns 0 for negative input', () => {
    expect(computeMonthlyWT(-500)).toBe(0);
  });

  it('accepts string input (parseFloat coercion)', () => {
    expect(computeMonthlyWT('25000')).toBeCloseTo((25000 - 20834) * 0.15, 1);
  });
});

// ── SSS 2024 contributions ────────────────────────────────────────────────────

describe('computeSSS — 2024 contribution table', () => {
  it('MSC floor: salary ₱1,000 → MSC ₱5,000', () => {
    const result = computeSSS(1000);
    expect(result.ee).toBeCloseTo(5000 * 0.045, 2);
    expect(result.er).toBeCloseTo(5000 * 0.095, 2);
  });

  it('MSC ceiling: salary ₱50,000 → MSC capped at ₱35,000', () => {
    const result = computeSSS(50000);
    expect(result.ee).toBeCloseTo(35000 * 0.045, 2);
    expect(result.er).toBeCloseTo(35000 * 0.095, 2);
  });

  it('MSC rounds up to nearest ₱500: salary ₱15,100 → MSC ₱15,500', () => {
    const result = computeSSS(15100);
    expect(result.ee).toBeCloseTo(15500 * 0.045, 2);
  });

  it('EC is ₱10 for salary ≤ ₱14,750', () => {
    expect(computeSSS(14000).ec).toBe(10);
    expect(computeSSS(14750).ec).toBe(10);
  });

  it('EC is ₱30 for salary > ₱14,750', () => {
    expect(computeSSS(14751).ec).toBe(30);
    expect(computeSSS(30000).ec).toBe(30);
  });

  it('MPF is ₱0 for salary ≤ ₱20,000', () => {
    const result = computeSSS(20000);
    expect(result.mpf_ee).toBe(0);
    expect(result.mpf_er).toBe(0);
  });

  it('MPF applies 2.5% EE + 2.5% ER on amount above ₱20,000 up to ₱35,000', () => {
    const result = computeSSS(25000);
    // mpfBase = 25000 - 20000 = 5000
    expect(result.mpf_ee).toBeCloseTo(5000 * 0.025, 2);
    expect(result.mpf_er).toBeCloseTo(5000 * 0.025, 2);
  });

  it('MPF base capped at ₱15,000 (salary > ₱35,000)', () => {
    const result = computeSSS(40000);
    expect(result.mpf_ee).toBeCloseTo(15000 * 0.025, 2);
    expect(result.mpf_er).toBeCloseTo(15000 * 0.025, 2);
  });

  it('total_ee = ee + mpf_ee', () => {
    const result = computeSSS(25000);
    expect(result.total_ee).toBeCloseTo(result.ee + result.mpf_ee, 2);
  });

  it('total_er = er + ec + mpf_er', () => {
    const result = computeSSS(25000);
    expect(result.total_er).toBeCloseTo(result.er + result.ec + result.mpf_er, 2);
  });
});

// ── PhilHealth 2024 ───────────────────────────────────────────────────────────

describe('computePhilHealth — 2024 (5% premium)', () => {
  it('floor: salary ₱5,000 → base is ₱10,000', () => {
    const result = computePhilHealth(5000);
    expect(result.total).toBeCloseTo(10000 * 0.05, 2);
    expect(result.ee).toBeCloseTo(result.total / 2, 2);
    expect(result.er).toBeCloseTo(result.total / 2, 2);
  });

  it('mid-range: salary ₱30,000', () => {
    const result = computePhilHealth(30000);
    expect(result.total).toBeCloseTo(30000 * 0.05, 2);
    expect(result.ee).toBeCloseTo(result.total / 2, 2);
  });

  it('ceiling: salary ₱200,000 → base capped at ₱100,000', () => {
    const result = computePhilHealth(200000);
    expect(result.total).toBeCloseTo(100000 * 0.05, 2);
  });

  it('ceiling: salary exactly ₱100,000', () => {
    const result = computePhilHealth(100000);
    expect(result.total).toBeCloseTo(100000 * 0.05, 2);
  });

  it('EE and ER shares are always equal (50/50 split)', () => {
    [5000, 15000, 50000, 100000, 200000].forEach(salary => {
      const { ee, er } = computePhilHealth(salary);
      expect(ee).toBe(er);
    });
  });
});

// ── Pag-IBIG / HDMF ──────────────────────────────────────────────────────────

describe('computePagibig — HDMF', () => {
  it('salary ≤ ₱1,500: EE rate is 1%', () => {
    const result = computePagibig(1000);
    expect(result.ee).toBeCloseTo(1000 * 0.01, 2);
  });

  it('salary = ₱1,500: boundary — EE rate is still 1%', () => {
    const result = computePagibig(1500);
    expect(result.ee).toBeCloseTo(1500 * 0.01, 2);
  });

  it('salary = ₱1,501: EE rate switches to 2%', () => {
    const result = computePagibig(1501);
    expect(result.ee).toBeCloseTo(1501 * 0.02, 2);
  });

  it('ER is always 2%', () => {
    expect(computePagibig(1000).er).toBeCloseTo(1000 * 0.02, 2);
    expect(computePagibig(5000).er).toBeCloseTo(5000 * 0.02, 2);
  });

  it('EE is capped at ₱100 for high salaries', () => {
    const result = computePagibig(20000);
    expect(result.ee).toBe(100);
  });

  it('ER is capped at ₱100 for high salaries', () => {
    const result = computePagibig(20000);
    expect(result.er).toBe(100);
  });

  it('total = ee + er', () => {
    const result = computePagibig(5000);
    expect(result.total).toBeCloseTo(result.ee + result.er, 2);
  });
});

// ── Full payslip integration ──────────────────────────────────────────────────

describe('computePayslip — end-to-end', () => {
  it('minimum wage earner (₱610/day × 26 = ₱15,860/mo NCR 2024)', () => {
    const result = computePayslip({ monthly_salary: 15860 });
    expect(result.gross_salary).toBe(15860);
    expect(result.withholding_tax).toBe(0); // below exempt threshold after deductions
    expect(result.net_pay).toBeLessThan(result.gross_salary);
    expect(result.net_pay).toBeGreaterThan(0);
  });

  it('mid-level salary (₱50,000)', () => {
    const result = computePayslip({ monthly_salary: 50000 });
    expect(result.taxable_compensation).toBeGreaterThan(0);
    expect(result.withholding_tax).toBeGreaterThan(0);
    expect(result.net_pay).toBeLessThan(result.gross_salary);
    // Sanity: net = gross - deductions - tax
    const expected = result.gross_salary - result.mandatory_ee_deductions - result.withholding_tax;
    expect(result.net_pay).toBeCloseTo(expected, 1);
  });

  it('de minimis reduces taxable compensation', () => {
    const without = computePayslip({ monthly_salary: 50000 });
    const with_dm = computePayslip({ monthly_salary: 50000, de_minimis: 5000 });
    expect(with_dm.taxable_compensation).toBeCloseTo(
      without.taxable_compensation - 5000, 1
    );
    expect(with_dm.withholding_tax).toBeLessThan(without.withholding_tax);
  });

  it('other_taxable increases taxable compensation', () => {
    const without = computePayslip({ monthly_salary: 50000 });
    const with_ot = computePayslip({ monthly_salary: 50000, other_taxable: 10000 });
    expect(with_ot.taxable_compensation).toBeCloseTo(
      without.taxable_compensation + 10000, 1
    );
  });

  it('taxable_compensation never goes below 0', () => {
    const result = computePayslip({
      monthly_salary: 10000,
      de_minimis: 999999,
    });
    expect(result.taxable_compensation).toBe(0);
    expect(result.withholding_tax).toBe(0);
  });

  it('employer cost is always greater than gross salary', () => {
    const result = computePayslip({ monthly_salary: 30000 });
    expect(result.total_employer_cost).toBeGreaterThan(result.gross_salary);
  });

  it('handles string inputs gracefully', () => {
    const result = computePayslip({
      monthly_salary: '30000',
      de_minimis: '2000',
      other_taxable: '5000',
    });
    expect(result.gross_salary).toBe(30000);
    expect(typeof result.withholding_tax).toBe('number');
  });
});
