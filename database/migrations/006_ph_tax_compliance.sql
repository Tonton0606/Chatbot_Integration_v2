-- ============================================================
-- MIGRATION 006: PHILIPPINE TAX COMPLIANCE + FIXED ASSETS + PAYROLL TAX
-- ============================================================
-- Aligns HERMESV2.2 Finance module with BIR (Bureau of Internal Revenue)
-- requirements, Philippine GAAP, and TRAIN Law (RA 10963).
--
-- New tables:
--   bir_atc_codes            -- Alphanumeric Tax Codes per BIR RR 2-98
--   bir_vat_records          -- VAT Input/Output register
--   bir_ewt_records          -- Expanded Withholding Tax per payment
--   bir_tax_filings          -- BIR form filing tracker (2550M, 1601-EQ, 1702, etc.)
--   bir_sawt_entries         -- Summary Alphalist of Withholding Taxes
--   fixed_assets             -- Asset register (CAPEX-converted fixed assets)
--   asset_depreciation_lines -- Monthly depreciation schedule lines
--   asset_disposals          -- Asset retirement / disposal records
--   payroll_runs             -- Monthly payroll run header
--   payroll_tax_lines        -- SSS/PhilHealth/Pag-IBIG/WT per employee per run
--
-- ERP Registry:             -- New admin nav items under Finance & Compliance
-- ============================================================

-- ── 1. BIR ATC CODES (global seed — not workspace-scoped) ────────────────────

CREATE TABLE IF NOT EXISTS bir_atc_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atc_code     VARCHAR(10) NOT NULL UNIQUE,
  description  TEXT NOT NULL,
  tax_rate     NUMERIC(5,2) NOT NULL,       -- e.g. 5.00, 10.00, 1.00
  tax_base     TEXT NOT NULL DEFAULT 'gross_payment',
  category     TEXT NOT NULL,               -- ewt_professional / ewt_goods / ewt_rent / vat / final_tax
  bir_form     TEXT NOT NULL DEFAULT '0619E', -- BIR form used for remittance
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard ATC codes (BIR RR 2-98 + TRAIN Law updates)
INSERT INTO bir_atc_codes (atc_code, description, tax_rate, category, bir_form, notes) VALUES
  -- EWT on Professional Fees
  ('WC000','Professional fees – individuals (general)',          10.00,'ewt_professional','0619E','Use WC010 if annual exceeds PHP 720K'),
  ('WC010','Professional fees – individuals > PHP 720K/year',   15.00,'ewt_professional','0619E','Effective upon exceeding threshold'),
  ('WC059','Talent fees paid to individuals',                   10.00,'ewt_professional','0619E',NULL),
  ('WC160','Fees paid to doctors, lawyers, engineers, etc.',    10.00,'ewt_professional','0619E',NULL),
  -- EWT on Goods & Services
  ('WM010','Purchases of goods by Top WHT Agents',               1.00,'ewt_goods',       '0619E','Per RR 11-2018'),
  ('WM020','Purchases of services by Top WHT Agents',            2.00,'ewt_services',    '0619E','Per RR 11-2018'),
  -- EWT on Rental
  ('WC180','Rental of real or personal property (individuals)', 5.00, 'ewt_rent',        '0619E',NULL),
  ('WC185','Rental – corporations',                              5.00,'ewt_rent',        '0619E',NULL),
  -- EWT on Interest
  ('WI010','Interest on bank deposits (regular)',               20.00,'final_tax',       '0619F','Final WHT'),
  ('WI040','Interest on money market placements',               20.00,'final_tax',       '0619F','Final WHT'),
  -- EWT on Dividends
  ('WB010','Cash dividends – domestic corp to individual',      10.00,'final_tax',       '0619F','Final WHT'),
  ('WB020','Stock dividends – taxable',                         10.00,'final_tax',       '0619F','Final WHT'),
  -- VAT
  ('WT000','Output VAT – standard 12%',                        12.00,'vat',             '2550M',NULL),
  ('WT001','Output VAT – zero-rated (0%)',                       0.00,'vat_zero',        '2550M','Export, PEZA, etc.'),
  -- Compensation Withholding
  ('WC001','Withholding tax on compensation – monthly',          0.00,'ewt_compensation','1601C','Rate per TRAIN Law bracket'),
  -- Commission / Other
  ('WC220','Commission paid to individuals',                    10.00,'ewt_services',    '0619E',NULL),
  ('WC240','Payments to suppliers of goods (non-Top Agent)',     1.00,'ewt_goods',       '0619E','Annex A, RR 2-98')
ON CONFLICT (atc_code) DO NOTHING;


-- ── 2. BIR VAT RECORDS (per-workspace VAT ledger) ────────────────────────────

CREATE TABLE IF NOT EXISTS bir_vat_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  record_type     TEXT NOT NULL CHECK (record_type IN ('input_vat','output_vat')),
  transaction_date DATE NOT NULL,
  period_month    INT NOT NULL,              -- 1-12
  period_year     INT NOT NULL,
  source_type     TEXT NOT NULL DEFAULT 'invoice',  -- invoice / expense / purchase / manual
  source_id       UUID,                      -- FK to invoices / expenses
  supplier_name   TEXT,
  supplier_tin    VARCHAR(20),
  or_number       VARCHAR(50),
  gross_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
  vat_rate        NUMERIC(5,2)  NOT NULL DEFAULT 12.00,
  vat_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  vat_type        TEXT NOT NULL DEFAULT 'standard' CHECK (vat_type IN ('standard','zero_rated','exempt')),
  is_vat_claimable BOOLEAN NOT NULL DEFAULT TRUE,  -- input VAT recoverable vs. non-recoverable
  filing_status   TEXT NOT NULL DEFAULT 'pending' CHECK (filing_status IN ('pending','filed','amended')),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bir_vat_workspace_period
  ON bir_vat_records(workspace_id, period_year, period_month);


-- ── 3. BIR EWT RECORDS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bir_ewt_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  period_month    INT NOT NULL,
  period_year     INT NOT NULL,
  payee_name      TEXT NOT NULL,
  payee_tin       VARCHAR(20),
  atc_code        VARCHAR(10) REFERENCES bir_atc_codes(atc_code),
  income_payment  NUMERIC(18,2) NOT NULL DEFAULT 0,  -- gross payment before WHT
  ewt_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ewt_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_payment     NUMERIC(18,2) NOT NULL DEFAULT 0,  -- income_payment - ewt_amount
  source_type     TEXT NOT NULL DEFAULT 'expense',   -- invoice / expense / payment / manual
  source_id       UUID,
  cwt_issued      BOOLEAN NOT NULL DEFAULT FALSE,    -- has BIR Form 2307 been issued?
  cwt_date        DATE,
  remittance_status TEXT NOT NULL DEFAULT 'pending' CHECK (remittance_status IN ('pending','remitted','late')),
  remittance_date DATE,
  or_number       VARCHAR(50),                        -- OR from BIR
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bir_ewt_workspace_period
  ON bir_ewt_records(workspace_id, period_year, period_month);


-- ── 4. BIR TAX FILINGS TRACKER ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bir_tax_filings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  form_type       TEXT NOT NULL,      -- '2550M','2550Q','1601C','1601EQ','1702','1701','0619E','0619F'
  form_label      TEXT NOT NULL,      -- human label
  period_month    INT,                -- NULL for annual/quarterly
  period_quarter  INT,                -- 1-4; NULL if monthly/annual
  period_year     INT NOT NULL,
  due_date        DATE NOT NULL,
  filing_date     DATE,
  status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','filed','late','amended','not_applicable')),
  tax_due         NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_paid        NUMERIC(18,2) NOT NULL DEFAULT 0,
  penalty_surcharge NUMERIC(18,2) NOT NULL DEFAULT 0,
  compromise_penalty NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_paid      NUMERIC(18,2) NOT NULL DEFAULT 0,
  bir_receipt_number TEXT,
  filed_by        TEXT,
  notes           TEXT,
  attachment_url  TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bir_filings_workspace_year
  ON bir_tax_filings(workspace_id, period_year);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bir_tax_filings_period
  ON bir_tax_filings(workspace_id, form_type, period_year, COALESCE(period_month, 0), COALESCE(period_quarter, 0));


-- ── 5. SAWT ENTRIES (Summary Alphalist of Withholding Tax) ───────────────────

CREATE TABLE IF NOT EXISTS bir_sawt_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_quarter  INT NOT NULL,           -- 1-4
  period_year     INT NOT NULL,
  payee_name      TEXT NOT NULL,
  payee_tin       VARCHAR(20),
  income_payments NUMERIC(18,2) NOT NULL DEFAULT 0,
  ewt_withheld    NUMERIC(18,2) NOT NULL DEFAULT 0,
  atc_code        VARCHAR(10) REFERENCES bir_atc_codes(atc_code),
  source_type     TEXT DEFAULT 'expense',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ── 6. FIXED ASSETS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fixed_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_code          TEXT NOT NULL,
  asset_name          TEXT NOT NULL,
  asset_category      TEXT NOT NULL CHECK (asset_category IN (
                        'land','building','leasehold_improvement','machinery',
                        'transportation_equipment','furniture_fixtures',
                        'it_equipment','office_equipment','other')),
  description         TEXT,
  acquisition_date    DATE NOT NULL,
  acquisition_cost    NUMERIC(18,2) NOT NULL,
  salvage_value       NUMERIC(18,2) NOT NULL DEFAULT 0,
  useful_life_years   NUMERIC(4,1)  NOT NULL DEFAULT 5,  -- BIR-allowed useful life
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line'
                        CHECK (depreciation_method IN ('straight_line','double_declining','sum_of_years')),
  accumulated_depreciation NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_value          NUMERIC(18,2) GENERATED ALWAYS AS (acquisition_cost - accumulated_depreciation) STORED,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','disposed','fully_depreciated','impaired')),
  location            TEXT,
  assigned_to         TEXT,
  serial_number       TEXT,
  supplier_name       TEXT,
  capex_id            UUID,              -- FK to finance_transactions (capex type)
  gl_asset_account    UUID,
  gl_depreciation_account UUID,
  gl_accum_depr_account   UUID,
  bir_asset_class     TEXT,             -- BIR RR 12-2012 asset class
  tin_of_vendor       VARCHAR(20),
  or_number           TEXT,             -- OR from vendor
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, asset_code)
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_workspace
  ON fixed_assets(workspace_id, status);


-- ── 7. ASSET DEPRECIATION LINES ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asset_depreciation_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_id        UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  period_month    INT NOT NULL,
  period_year     INT NOT NULL,
  depreciation_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  accumulated_to_date NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_value_after    NUMERIC(18,2) NOT NULL DEFAULT 0,
  je_id           UUID,              -- FK to journal_entries once posted
  status          TEXT NOT NULL DEFAULT 'computed'
                    CHECK (status IN ('computed','posted','reversed')),
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  posted_at       TIMESTAMPTZ,
  posted_by       UUID REFERENCES auth.users(id),
  UNIQUE (asset_id, period_year, period_month)
);


-- ── 8. ASSET DISPOSALS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asset_disposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_id        UUID NOT NULL REFERENCES fixed_assets(id),
  disposal_date   DATE NOT NULL,
  disposal_type   TEXT NOT NULL CHECK (disposal_type IN ('sale','scrap','donation','trade_in','impairment')),
  proceeds        NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_value_at_disposal NUMERIC(18,2) NOT NULL DEFAULT 0,
  gain_loss       NUMERIC(18,2) GENERATED ALWAYS AS (proceeds - book_value_at_disposal) STORED,
  buyer_name      TEXT,
  buyer_tin       VARCHAR(20),
  ewt_withheld    NUMERIC(18,2) NOT NULL DEFAULT 0,  -- EWT on real property sale
  bir_cgrt_number TEXT,                              -- Capital Gains Tax receipt
  je_id           UUID,
  notes           TEXT,
  approved_by     UUID REFERENCES auth.users(id),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ── 9. PAYROLL RUNS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payroll_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_name        TEXT NOT NULL,            -- e.g. "July 2026 – Regular"
  period_month    INT NOT NULL,
  period_year     INT NOT NULL,
  payroll_type    TEXT NOT NULL DEFAULT 'regular'
                    CHECK (payroll_type IN ('regular','13th_month','mid_month','supplemental','final_pay')),
  cut_off_date    DATE NOT NULL,
  payment_date    DATE,
  total_basic_pay       NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_allowances      NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_gross_pay       NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_sss_employee    NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_sss_employer    NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_philhealth_employee NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_philhealth_employer NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_pagibig_employee    NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_pagibig_employer    NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_wt_compensation     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_other_deductions    NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_net_pay             NUMERIC(18,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','computed','approved','posted','paid')),
  je_id           UUID,
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, period_year, period_month, payroll_type)
);


-- ── 10. PAYROLL TAX LINES (per employee per run) ─────────────────────────────

CREATE TABLE IF NOT EXISTS payroll_tax_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  payroll_run_id  UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id     UUID,              -- FK to HR employees if connected
  employee_name   TEXT NOT NULL,
  employee_tin    VARCHAR(20),
  sss_number      VARCHAR(20),
  philhealth_number VARCHAR(20),
  pagibig_number  VARCHAR(20),
  basic_pay           NUMERIC(18,2) NOT NULL DEFAULT 0,
  allowances          NUMERIC(18,2) NOT NULL DEFAULT 0,
  overtime_pay        NUMERIC(18,2) NOT NULL DEFAULT 0,
  gross_pay           NUMERIC(18,2) NOT NULL DEFAULT 0,
  -- SSS
  sss_ee              NUMERIC(18,2) NOT NULL DEFAULT 0,  -- employee share
  sss_er              NUMERIC(18,2) NOT NULL DEFAULT 0,  -- employer share
  sss_ec              NUMERIC(18,2) NOT NULL DEFAULT 0,  -- EC (employer) fixed
  sss_mpf_ee          NUMERIC(18,2) NOT NULL DEFAULT 0,  -- MPF employee (if salary > 20k)
  sss_mpf_er          NUMERIC(18,2) NOT NULL DEFAULT 0,  -- MPF employer
  -- PhilHealth
  philhealth_ee       NUMERIC(18,2) NOT NULL DEFAULT 0,
  philhealth_er       NUMERIC(18,2) NOT NULL DEFAULT 0,
  -- Pag-IBIG / HDMF
  pagibig_ee          NUMERIC(18,2) NOT NULL DEFAULT 0,
  pagibig_er          NUMERIC(18,2) NOT NULL DEFAULT 0,
  -- Withholding Tax on Compensation (TRAIN Law)
  taxable_compensation NUMERIC(18,2) NOT NULL DEFAULT 0,
  wt_compensation      NUMERIC(18,2) NOT NULL DEFAULT 0,
  -- Totals
  total_deductions    NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_pay             NUMERIC(18,2) NOT NULL DEFAULT 0,
  -- 13th month (filled on 13th month run)
  thirteenth_month_pay NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_hazard_pay       BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_lines_run
  ON payroll_tax_lines(payroll_run_id);


-- ── 11. RLS POLICIES ─────────────────────────────────────────────────────────

ALTER TABLE bir_vat_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_ewt_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_tax_filings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_sawt_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_depreciation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_disposals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_tax_lines       ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'bir_vat_records','bir_ewt_records','bir_tax_filings','bir_sawt_entries',
    'fixed_assets','asset_depreciation_lines','asset_disposals',
    'payroll_runs','payroll_tax_lines'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "%s_workspace_policy" ON %I
       USING (workspace_id = ((auth.jwt() ->> ''workspace_id'')::uuid)
              OR EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = %I.workspace_id
                  AND wm.user_id = auth.uid()
              ))',
      tbl, tbl, tbl
    );
  END LOOP;
END $$;


-- ── 12. ERP REGISTRY: NEW ADMIN MODULES ──────────────────────────────────────

DO $$
DECLARE
  v_fin_div_id   UUID;
  v_comp_div_id  UUID;
BEGIN
  -- Find existing Finance division
  SELECT id INTO v_fin_div_id
  FROM erp_divisions
  WHERE division_key IN ('finance','finance_treasury','finance_control')
  LIMIT 1;

  -- Create if missing
  IF v_fin_div_id IS NULL THEN
    INSERT INTO erp_divisions (
      division_key, title, icon, description,
      order_index, admin_visible, client_visible, status
    ) VALUES (
      'finance', 'Finance & Treasury', 'DollarSign',
      'Budget governance, treasury, and financial compliance.',
      60, true, false, 'active'
    ) RETURNING id INTO v_fin_div_id;
  END IF;

  -- ── BIR Tax Compliance feature ─────────────────────────────────────────────
  INSERT INTO erp_features (
    division_id, feature_key, label, icon, description,
    admin_route, client_route, admin_visible, client_visible,
    status, auto_enable_with_division, order_index
  ) VALUES (
    v_fin_div_id,
    'bir_compliance',
    'BIR Tax Compliance',
    'FileCheck',
    'VAT filing, EWT remittance, ATC codes, SAWT, and BIR deadline calendar.',
    '/Admin/BIRCompliance', NULL, true, false,
    'active', true, 71
  )
  ON CONFLICT (feature_key) DO UPDATE
    SET admin_route = '/Admin/BIRCompliance',
        label       = 'BIR Tax Compliance',
        status      = 'active';

  -- ── Fixed Assets & Depreciation feature ────────────────────────────────────
  INSERT INTO erp_features (
    division_id, feature_key, label, icon, description,
    admin_route, client_route, admin_visible, client_visible,
    status, auto_enable_with_division, order_index
  ) VALUES (
    v_fin_div_id,
    'fixed_assets',
    'Fixed Assets',
    'Package',
    'Asset register, straight-line and declining-balance depreciation, disposals.',
    '/Admin/FixedAssets', NULL, true, false,
    'active', true, 72
  )
  ON CONFLICT (feature_key) DO UPDATE
    SET admin_route = '/Admin/FixedAssets',
        label       = 'Fixed Assets',
        status      = 'active';

  -- ── Payroll Tax feature ────────────────────────────────────────────────────
  INSERT INTO erp_features (
    division_id, feature_key, label, icon, description,
    admin_route, client_route, admin_visible, client_visible,
    status, auto_enable_with_division, order_index
  ) VALUES (
    v_fin_div_id,
    'payroll_tax',
    'Payroll Tax',
    'Users',
    'SSS, PhilHealth, Pag-IBIG, and TRAIN Law withholding tax computation.',
    '/Admin/PayrollTax', NULL, true, false,
    'active', true, 73
  )
  ON CONFLICT (feature_key) DO UPDATE
    SET admin_route = '/Admin/PayrollTax',
        label       = 'Payroll Tax',
        status      = 'active';

  RAISE NOTICE 'PH Tax Compliance modules registered in ERP registry.';
END $$;

-- Enable for all workspaces
INSERT INTO workspace_feature_access (workspace_id, feature_key, is_enabled)
SELECT w.id, f.feature_key, true
FROM workspaces w
CROSS JOIN (
  SELECT feature_key FROM erp_features
  WHERE feature_key IN ('bir_compliance','fixed_assets','payroll_tax')
) f
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_feature_access wfa
  WHERE wfa.workspace_id = w.id AND wfa.feature_key = f.feature_key
);

DO $$ BEGIN RAISE NOTICE 'Migration 006 complete — PH Tax Compliance tables created.'; END $$;
