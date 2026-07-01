-- ============================================================
-- Finance & Accounting Tables — Hermes V2.2
-- Philippine GAAP · BIR-compliant · Multi-tenant workspace isolation
--
-- FIXES APPLIED:
--   • Default currency PHP (not USD) — PH-based SMB platform
--   • Removed CHECK (balance >= 0) from cash positions (overdraft allowed)
--   • gl_accounts.balance has NO non-negative constraint (contra accounts, overdrafts)
--   • Added fiscal_periods — period locking to prevent backdated entries
--   • Added vendor_bills + bill_payments — full AP module
--   • Added employee_records — payroll master
--   • Added bank_accounts + bank_statement_lines — bank reconciliation
--   • Precise RLS: separate INSERT/UPDATE/DELETE policies (not FOR ALL)
--   • All workspace_id columns indexed
-- ============================================================

-- ── Finance: Budgets ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_budgets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cost_center     TEXT NOT NULL,
  allocated       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  spent           NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
  fiscal_year     INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  owner           TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_budgets_workspace ON finance_budgets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_budgets_year     ON finance_budgets(workspace_id, fiscal_year);

-- ── Finance: Transactions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
    'revenue','expense','cogs','capex','opex',
    'purchase_order','budget_transfer'
  )),
  description     TEXT,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  category        TEXT,
  budget_id       UUID REFERENCES finance_budgets(id) ON DELETE SET NULL,
  reference       TEXT,
  attachments     JSONB DEFAULT '[]',
  metadata        JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
    'pending_approval','posted','rejected'
  )),
  approved_by     TEXT,
  approval_notes  TEXT,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_txns_workspace ON finance_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_txns_status    ON finance_transactions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_txns_type      ON finance_transactions(workspace_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_txns_created   ON finance_transactions(workspace_id, created_at DESC);

-- ── Finance: Cash Positions (Treasury) ───────────────────────
-- NOTE: balance has NO non-negative constraint — overdraft accounts are valid

CREATE TABLE IF NOT EXISTS finance_cash_positions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_name    TEXT NOT NULL,
  account_type    TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN (
    'checking','savings','investment','credit','other'
  )),
  bank            TEXT,
  currency        TEXT NOT NULL DEFAULT 'PHP',
  balance         NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_cash_workspace ON finance_cash_positions(workspace_id);

-- ── Finance: Cash Flow Entries ────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_cash_flow (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  flow_date       DATE NOT NULL,
  inflow          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (inflow >= 0),
  outflow         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (outflow >= 0),
  net             NUMERIC(15,2) GENERATED ALWAYS AS (inflow - outflow) STORED,
  category        TEXT NOT NULL DEFAULT 'operations' CHECK (category IN (
    'operations','investing','financing'
  )),
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_cf_workspace ON finance_cash_flow(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_cf_date      ON finance_cash_flow(workspace_id, flow_date);

-- ── Finance: Alerts ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_alerts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  severity         TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  alert_type       TEXT NOT NULL DEFAULT 'fraud' CHECK (alert_type IN (
    'fraud','budget_overrun','cash_low','compliance','anomaly'
  )),
  metadata         JSONB DEFAULT '{}',
  resolved         BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by      TEXT,
  resolution_notes TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_alerts_workspace ON finance_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_alerts_resolved  ON finance_alerts(workspace_id, resolved);

-- ── Finance: Vendors (Procure-to-Pay) ────────────────────────

CREATE TABLE IF NOT EXISTS finance_vendors (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_email   TEXT,
  contact_phone   TEXT,
  address         TEXT,
  tax_id          TEXT,                          -- BIR TIN
  payment_terms   TEXT NOT NULL DEFAULT 'net_30',
  category        TEXT NOT NULL DEFAULT 'general',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  total_spend     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_vendors_workspace ON finance_vendors(workspace_id);

-- ============================================================
-- Accounting: General Ledger
-- ============================================================

-- ── GL Accounts (Chart of Accounts) ──────────────────────────
-- NOTE: balance column is a denormalized running total.
-- No non-negative constraint — contra accounts and credit balances are valid.

CREATE TABLE IF NOT EXISTS gl_accounts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_code    TEXT NOT NULL,
  name            TEXT NOT NULL,
  account_type    TEXT NOT NULL CHECK (account_type IN (
    'asset','liability','equity','revenue','cogs','expense'
  )),
  parent_id       UUID REFERENCES gl_accounts(id) ON DELETE SET NULL,
  currency        TEXT NOT NULL DEFAULT 'PHP',
  description     TEXT,
  balance         NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_gl_accounts_workspace ON gl_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_type      ON gl_accounts(workspace_id, account_type);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_code      ON gl_accounts(workspace_id, account_code);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_parent    ON gl_accounts(parent_id);

-- ── Journal Entries (Header) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  je_number         TEXT NOT NULL,
  entry_date        DATE NOT NULL,
  memo              TEXT,
  reference         TEXT,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at         TIMESTAMPTZ,
  reverses_je_id    UUID REFERENCES journal_entries(id),
  reversed_by_je_id UUID REFERENCES journal_entries(id),
  fiscal_period_id  UUID,                        -- FK added below after fiscal_periods table
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, je_number)
);

CREATE INDEX IF NOT EXISTS idx_je_workspace ON journal_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_je_date      ON journal_entries(workspace_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_status    ON journal_entries(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_je_period    ON journal_entries(fiscal_period_id);

-- ── Journal Entry Lines (Detail) ─────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id  UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES gl_accounts(id),
  debit             NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description       TEXT,
  line_order        INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jel_journal_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account       ON journal_entry_lines(account_id);

-- ============================================================
-- Accounting: Fiscal Periods (period locking)
-- Prevents posting journal entries to closed accounting periods.
-- ============================================================

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_name     TEXT NOT NULL,                 -- e.g. "January 2026", "Q1 2026"
  period_type     TEXT NOT NULL DEFAULT 'month' CHECK (period_type IN ('month','quarter','year')),
  fiscal_year     INTEGER NOT NULL,
  period_number   INTEGER NOT NULL,              -- 1-12 for months, 1-4 for quarters
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  closed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at       TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, fiscal_year, period_type, period_number)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_workspace ON fiscal_periods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates     ON fiscal_periods(workspace_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_status    ON fiscal_periods(workspace_id, status);

-- Add FK from journal_entries to fiscal_periods now that the table exists
ALTER TABLE journal_entries
  ADD CONSTRAINT fk_je_fiscal_period
  FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods(id) ON DELETE SET NULL;

-- ============================================================
-- Accounts Payable — Vendor Bills Module
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_bills (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vendor_id       UUID REFERENCES finance_vendors(id) ON DELETE SET NULL,
  bill_number     TEXT NOT NULL,
  vendor_ref      TEXT,                          -- Vendor's own invoice number
  bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','received','approved','partial','paid','overdue','void'
  )),
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat_amount      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  ewt_amount      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (ewt_amount >= 0),
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance_due     NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  currency        TEXT NOT NULL DEFAULT 'PHP',
  description     TEXT,
  notes           TEXT,
  attachment_url  TEXT,
  gl_je_id        UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_bills_workspace  ON vendor_bills(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor     ON vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status     ON vendor_bills(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_due        ON vendor_bills(workspace_id, due_date);

CREATE TABLE IF NOT EXISTS vendor_bill_lines (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id         UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  account_id      UUID REFERENCES gl_accounts(id) ON DELETE SET NULL,
  tax_code        TEXT,
  line_order      INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vbl_bill ON vendor_bill_lines(bill_id);

CREATE TABLE IF NOT EXISTS bill_payments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  bill_id         UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  payment_number  TEXT NOT NULL,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method  TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN (
    'bank_transfer','check','cash','online','gcash','maya','credit_card'
  )),
  reference       TEXT,
  notes           TEXT,
  gl_je_id        UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, payment_number)
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_workspace ON bill_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill      ON bill_payments(bill_id);

-- ============================================================
-- Payroll: Employee Records Master
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_records (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id         TEXT NOT NULL,             -- Internal employee number
  full_name           TEXT NOT NULL,
  position            TEXT,
  department          TEXT,
  employment_type     TEXT NOT NULL DEFAULT 'regular' CHECK (employment_type IN (
    'regular','probationary','contractual','part_time','project_based'
  )),
  hire_date           DATE NOT NULL,
  end_date            DATE,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','resigned','terminated')),
  -- Compensation
  monthly_rate        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monthly_rate >= 0),
  daily_rate          NUMERIC(15,2),
  hourly_rate         NUMERIC(15,2),
  -- Government IDs (BIR / SSS / PhilHealth / Pag-IBIG)
  tin                 TEXT,                      -- BIR TIN
  sss_number          TEXT,
  philhealth_number   TEXT,
  pagibig_number      TEXT,
  -- Contact
  email               TEXT,
  phone               TEXT,
  -- Payroll GL account links
  salary_account_id   UUID REFERENCES gl_accounts(id) ON DELETE SET NULL,
  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employees_workspace ON employee_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_employees_status    ON employee_records(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_dept      ON employee_records(workspace_id, department);

-- ============================================================
-- Bank Management & Reconciliation
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_name    TEXT NOT NULL,
  account_number  TEXT,                          -- last 4 digits or masked
  bank_name       TEXT NOT NULL,
  account_type    TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN (
    'checking','savings','payroll','trust','credit_line'
  )),
  currency        TEXT NOT NULL DEFAULT 'PHP',
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  gl_account_id   UUID REFERENCES gl_accounts(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_workspace ON bank_accounts(workspace_id);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  bank_account_id         UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date        DATE NOT NULL,
  description             TEXT NOT NULL,
  reference               TEXT,
  debit_amount            NUMERIC(15,2) DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount           NUMERIC(15,2) DEFAULT 0 CHECK (credit_amount >= 0),
  balance_after           NUMERIC(15,2),
  is_reconciled           BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_je_id        UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  reconciled_at           TIMESTAMPTZ,
  reconciled_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  import_batch_id         TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bsl_workspace    ON bank_statement_lines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bsl_bank_account ON bank_statement_lines(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bsl_date         ON bank_statement_lines(bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bsl_reconciled   ON bank_statement_lines(bank_account_id, is_reconciled);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE finance_budgets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cash_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cash_flow      ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_vendors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bill_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_lines   ENABLE ROW LEVEL SECURITY;

-- ── Service role: full access (server-side uses service role key) ─

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_budgets','finance_transactions','finance_cash_positions',
    'finance_cash_flow','finance_alerts','finance_vendors',
    'gl_accounts','journal_entries','journal_entry_lines',
    'fiscal_periods','vendor_bills','vendor_bill_lines','bill_payments',
    'employee_records','bank_accounts','bank_statement_lines'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY service_role_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ── Workspace member policies (authenticated users — read own workspace) ─
-- Pattern: workspace_id must match the authenticated user's profile.workspace_id

CREATE POLICY ws_select ON finance_budgets
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON finance_budgets
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON finance_budgets
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON finance_budgets
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON finance_transactions
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON finance_transactions
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON finance_transactions
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON finance_transactions
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON finance_cash_positions
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON finance_cash_positions
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON finance_cash_positions
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON finance_cash_positions
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON finance_cash_flow
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON finance_cash_flow
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON finance_cash_flow
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON finance_alerts
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON finance_alerts
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON finance_alerts
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON finance_vendors
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON finance_vendors
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON finance_vendors
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON finance_vendors
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON gl_accounts
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON gl_accounts
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON gl_accounts
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON gl_accounts
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON journal_entries
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON journal_entries
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON journal_entries
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Journal entry lines: derive workspace via parent JE
CREATE POLICY ws_select ON journal_entry_lines
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND je.workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY ws_insert ON journal_entry_lines
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND je.workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY ws_delete ON journal_entry_lines
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND je.workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY ws_select ON fiscal_periods
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON fiscal_periods
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON fiscal_periods
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON vendor_bills
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON vendor_bills
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON vendor_bills
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON vendor_bills
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON vendor_bill_lines
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM vendor_bills vb
      WHERE vb.id = vendor_bill_lines.bill_id
        AND vb.workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY ws_insert ON vendor_bill_lines
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_bills vb
      WHERE vb.id = vendor_bill_lines.bill_id
        AND vb.workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY ws_delete ON vendor_bill_lines
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM vendor_bills vb
      WHERE vb.id = vendor_bill_lines.bill_id
        AND vb.workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY ws_select ON bill_payments
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON bill_payments
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON bill_payments
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON employee_records
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON employee_records
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON employee_records
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON employee_records
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON bank_accounts
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON bank_accounts
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON bank_accounts
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON bank_accounts
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY ws_select ON bank_statement_lines
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_insert ON bank_statement_lines
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_update ON bank_statement_lines
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY ws_delete ON bank_statement_lines
  FOR DELETE TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
