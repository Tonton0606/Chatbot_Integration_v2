/**
 * Unit tests — BIR Tax Compliance Calculator
 *
 * Covers: VAT due dates, EWT due dates, VAT summary computation,
 * EWT calculation, and the zero-rate guard that prevents ₱0-tax
 * records from reaching BIR filings.
 */

const {
  vatPeriodDueDate,
  ewtDueDate,
  computeVatSummary,
  computeEWT,
} = require('../services/birCalculator');

// ── VAT period due date (BIR Form 2550M) ─────────────────────────────────────

describe('vatPeriodDueDate', () => {
  it('January → due 20 February same year', () => {
    expect(vatPeriodDueDate(1, 2024)).toBe('2024-02-20');
  });

  it('June → due 20 July same year', () => {
    expect(vatPeriodDueDate(6, 2024)).toBe('2024-07-20');
  });

  it('November → due 20 December same year', () => {
    expect(vatPeriodDueDate(11, 2024)).toBe('2024-12-20');
  });

  it('December wraps to 20 January of the following year', () => {
    expect(vatPeriodDueDate(12, 2024)).toBe('2025-01-20');
  });

  it('December of 2023 wraps year correctly', () => {
    expect(vatPeriodDueDate(12, 2023)).toBe('2024-01-20');
  });

  it('month is zero-padded in output', () => {
    expect(vatPeriodDueDate(3, 2024)).toBe('2024-04-20');
  });

  it('throws on invalid month 0', () => {
    expect(() => vatPeriodDueDate(0, 2024)).toThrow('Invalid month');
  });

  it('throws on invalid month 13', () => {
    expect(() => vatPeriodDueDate(13, 2024)).toThrow('Invalid month');
  });
});

// ── EWT due date (BIR Form 0619E) ────────────────────────────────────────────

describe('ewtDueDate', () => {
  it('January → due 10 February same year', () => {
    expect(ewtDueDate(1, 2024)).toBe('2024-02-10');
  });

  it('June → due 10 July same year', () => {
    expect(ewtDueDate(6, 2024)).toBe('2024-07-10');
  });

  it('December wraps to 10 January of the following year', () => {
    expect(ewtDueDate(12, 2024)).toBe('2025-01-10');
  });

  it('throws on invalid month', () => {
    expect(() => ewtDueDate(0, 2024)).toThrow('Invalid month');
  });
});

// ── VAT summary computation ───────────────────────────────────────────────────

describe('computeVatSummary', () => {
  it('returns all zeros for empty records', () => {
    const result = computeVatSummary([]);
    expect(result.total_input_vat).toBe(0);
    expect(result.total_output_vat).toBe(0);
    expect(result.vat_payable).toBe(0);
    expect(result.vat_refundable).toBe(0);
  });

  it('vat_payable when output > input', () => {
    const records = [
      { record_type: 'output_vat', vat_amount: 12000 },
      { record_type: 'input_vat',  vat_amount: 5000  },
    ];
    const result = computeVatSummary(records);
    expect(result.vat_payable).toBeCloseTo(7000, 2);
    expect(result.vat_refundable).toBe(0);
  });

  it('vat_refundable when input > output', () => {
    const records = [
      { record_type: 'output_vat', vat_amount: 3000  },
      { record_type: 'input_vat',  vat_amount: 10000 },
    ];
    const result = computeVatSummary(records);
    expect(result.vat_refundable).toBeCloseTo(7000, 2);
    expect(result.vat_payable).toBe(0);
  });

  it('sums multiple records of the same type', () => {
    const records = [
      { record_type: 'output_vat', vat_amount: 5000 },
      { record_type: 'output_vat', vat_amount: 7000 },
      { record_type: 'input_vat',  vat_amount: 3000 },
      { record_type: 'input_vat',  vat_amount: 2000 },
    ];
    const result = computeVatSummary(records);
    expect(result.total_output_vat).toBeCloseTo(12000, 2);
    expect(result.total_input_vat).toBeCloseTo(5000, 2);
    expect(result.vat_payable).toBeCloseTo(7000, 2);
  });

  it('ignores records with unknown record_type', () => {
    const records = [
      { record_type: 'output_vat', vat_amount: 12000 },
      { record_type: 'unknown',    vat_amount: 99999 },
    ];
    const result = computeVatSummary(records);
    expect(result.total_output_vat).toBeCloseTo(12000, 2);
    expect(result.total_input_vat).toBe(0);
  });

  it('handles missing vat_amount gracefully (treats as 0)', () => {
    const records = [
      { record_type: 'output_vat', vat_amount: null },
      { record_type: 'output_vat', vat_amount: 5000 },
    ];
    const result = computeVatSummary(records);
    expect(result.total_output_vat).toBeCloseTo(5000, 2);
  });
});

// ── EWT computation + zero-rate guard ────────────────────────────────────────

describe('computeEWT', () => {
  it('computes ewt_amount from income and rate', () => {
    const result = computeEWT({ income_payment: 100000, ewt_rate: 10 });
    expect(result.ewt_amount).toBeCloseTo(10000, 2);
    expect(result.net_payment).toBeCloseTo(90000, 2);
  });

  it('ATC rate 2% — professional services', () => {
    const result = computeEWT({ income_payment: 50000, ewt_rate: 2 });
    expect(result.ewt_amount).toBeCloseTo(1000, 2);
    expect(result.net_payment).toBeCloseTo(49000, 2);
  });

  it('explicit ewt_amount overrides computed value', () => {
    const result = computeEWT({
      income_payment: 100000,
      ewt_rate: 10,
      ewt_amount: 9999,
    });
    expect(result.ewt_amount).toBe(9999);
  });

  it('explicit net_payment overrides computed value', () => {
    const result = computeEWT({
      income_payment: 100000,
      ewt_rate: 10,
      net_payment: 88000,
    });
    expect(result.net_payment).toBe(88000);
  });

  it('ZERO-RATE GUARD: throws when rate is 0 and no ewt_amount provided', () => {
    // This prevents a missing/invalid ATC from inserting a ₱0 tax record
    expect(() =>
      computeEWT({ income_payment: 50000, ewt_rate: 0 })
    ).toThrow(/EWT rate is 0/);
  });

  it('allows rate 0 when explicit ewt_amount is supplied (e.g. exempt transaction)', () => {
    const result = computeEWT({
      income_payment: 50000,
      ewt_rate: 0,
      ewt_amount: 0,
    });
    expect(result.ewt_amount).toBe(0);
    expect(result.net_payment).toBeCloseTo(50000, 2);
  });

  it('net_payment = income - ewt when neither is explicitly provided', () => {
    const result = computeEWT({ income_payment: 75000, ewt_rate: 5 });
    expect(result.net_payment).toBeCloseTo(75000 - 75000 * 0.05, 2);
  });
});
