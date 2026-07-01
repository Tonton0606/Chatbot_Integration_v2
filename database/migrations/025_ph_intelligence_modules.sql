-- ============================================================
-- Migration 025: Philippine Business Intelligence Modules
-- 10 new autonomous loop intelligence modules
-- ============================================================

-- ── bir_compliance_items ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bir_compliance_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  form_code       TEXT NOT NULL,        -- 1601-C, 2550M, 1702, etc.
  description     TEXT,
  category        TEXT DEFAULT 'tax',   -- tax, sec, dole, sss, philhealth, pagibig
  due_date        DATE NOT NULL,
  frequency       TEXT DEFAULT 'monthly', -- monthly, quarterly, annual, one-time
  status          TEXT DEFAULT 'pending', -- pending, filed, overdue, waived
  penalty_amount  NUMERIC DEFAULT 0,
  filed_at        TIMESTAMPTZ,
  notes           TEXT,
  workspace_tax_type TEXT DEFAULT 'vat', -- vat, non-vat, exempt
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bir_workspace ON bir_compliance_items(workspace_id, due_date, status);

-- ── cash_flow_projections ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_flow_projections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  projection_date DATE NOT NULL,
  horizon_days    INTEGER DEFAULT 30,
  opening_balance NUMERIC DEFAULT 0,
  projected_inflow  NUMERIC DEFAULT 0,
  projected_outflow NUMERIC DEFAULT 0,
  projected_closing NUMERIC DEFAULT 0,
  actual_closing  NUMERIC,
  gap_amount      NUMERIC DEFAULT 0,
  risk_level      TEXT DEFAULT 'low',
  ar_aging_30     NUMERIC DEFAULT 0,
  ar_aging_60     NUMERIC DEFAULT 0,
  ar_aging_90     NUMERIC DEFAULT 0,
  ap_due_30       NUMERIC DEFAULT 0,
  confidence      NUMERIC DEFAULT 0.7,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cashflow_workspace ON cash_flow_projections(workspace_id, projection_date DESC);

-- ── channel_revenue_entries ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_revenue_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  channel         TEXT NOT NULL,   -- lazada, shopee, tiktok_shop, facebook, pos, direct, website
  date            DATE NOT NULL,
  gross_revenue   NUMERIC DEFAULT 0,
  returns         NUMERIC DEFAULT 0,
  net_revenue     NUMERIC DEFAULT 0,
  cogs            NUMERIC DEFAULT 0,
  gross_margin    NUMERIC DEFAULT 0,
  orders          INTEGER DEFAULT 0,
  ad_spend        NUMERIC DEFAULT 0,
  roas            NUMERIC DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_channel_revenue_workspace ON channel_revenue_entries(workspace_id, channel, date DESC);

-- ── labor_cost_analytics ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labor_cost_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  department      TEXT,
  period_month    TEXT NOT NULL,   -- YYYY-MM
  headcount       INTEGER DEFAULT 0,
  basic_pay       NUMERIC DEFAULT 0,
  overtime_pay    NUMERIC DEFAULT 0,
  thirteenth_month_accrual NUMERIC DEFAULT 0,
  sss_employer    NUMERIC DEFAULT 0,
  philhealth_employer NUMERIC DEFAULT 0,
  pagibig_employer NUMERIC DEFAULT 0,
  total_labor_cost NUMERIC DEFAULT 0,
  revenue_for_period NUMERIC DEFAULT 0,
  labor_cost_pct  NUMERIC DEFAULT 0,
  overtime_hours  NUMERIC DEFAULT 0,
  compliance_flags JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_labor_workspace ON labor_cost_analytics(workspace_id, period_month DESC);

-- ── supplier_scorecards ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  supplier_name   TEXT NOT NULL,
  category        TEXT,
  total_spend     NUMERIC DEFAULT 0,
  spend_pct       NUMERIC DEFAULT 0,  -- % of total COGS
  avg_lead_days   INTEGER DEFAULT 0,
  on_time_rate    NUMERIC DEFAULT 0,  -- 0-100
  quality_score   NUMERIC DEFAULT 0,  -- 0-100
  price_variance  NUMERIC DEFAULT 0,  -- % change vs baseline
  risk_level      TEXT DEFAULT 'low', -- low, medium, high, critical
  contract_expiry DATE,
  alternative_count INTEGER DEFAULT 0,
  notes           TEXT,
  last_scored_at  TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_workspace ON supplier_scorecards(workspace_id, risk_level);

-- ── sales_coach_insights ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_coach_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  rep_id          UUID,
  rep_name        TEXT,
  deal_id         UUID,
  deal_name       TEXT,
  insight_type    TEXT DEFAULT 'coaching', -- coaching, alert, win_pattern, risk
  insight_text    TEXT,
  recommended_action TEXT,
  priority        TEXT DEFAULT 'medium',
  win_probability NUMERIC DEFAULT 0,
  days_in_stage   INTEGER DEFAULT 0,
  stage           TEXT,
  deal_value      NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'pending', -- pending, actioned, dismissed
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_coach_workspace ON sales_coach_insights(workspace_id, priority, created_at DESC);

-- ── industry_benchmarks ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry        TEXT NOT NULL,
  metric_key      TEXT NOT NULL,
  metric_label    TEXT,
  benchmark_value NUMERIC,
  unit            TEXT DEFAULT 'percent',
  source          TEXT DEFAULT 'PSE/BSP/SEC PH',
  period_year     INTEGER DEFAULT 2024,
  segment         TEXT DEFAULT 'SMB', -- SMB, Enterprise
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_benchmark_unique ON industry_benchmarks(industry, metric_key, segment, period_year);

-- ── board_reports ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  title           TEXT NOT NULL,
  period_label    TEXT,
  period_days     INTEGER DEFAULT 30,
  status          TEXT DEFAULT 'draft', -- draft, generating, ready, sent
  kpis            JSONB DEFAULT '{}',
  ai_narrative    TEXT,
  highlights      JSONB DEFAULT '[]',
  risks           JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  health_score    NUMERIC DEFAULT 0,
  generated_by    UUID,
  sent_to         JSONB DEFAULT '[]',
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_board_reports_workspace ON board_reports(workspace_id, created_at DESC);

-- ── anomaly_flags ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anomaly_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  module          TEXT NOT NULL,    -- finance, hr, crm, inventory
  anomaly_type    TEXT NOT NULL,    -- duplicate, round_number, off_hours, spike, pattern
  title           TEXT NOT NULL,
  description     TEXT,
  risk_score      NUMERIC DEFAULT 0, -- 0-100
  severity        TEXT DEFAULT 'medium',
  entity_type     TEXT,             -- invoice, expense, transaction, payroll
  entity_id       TEXT,
  entity_ref      TEXT,
  amount          NUMERIC,
  flagged_at      TIMESTAMPTZ DEFAULT now(),
  status          TEXT DEFAULT 'open', -- open, investigating, cleared, escalated
  reviewed_by     UUID,
  review_notes    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anomaly_workspace ON anomaly_flags(workspace_id, status, severity);

-- ── okr_objectives ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS okr_objectives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  title           TEXT NOT NULL,
  department      TEXT DEFAULT 'company',
  owner_id        UUID,
  owner_name      TEXT,
  quarter         TEXT NOT NULL,   -- 2025-Q1
  status          TEXT DEFAULT 'on_track', -- on_track, at_risk, off_track, completed
  progress        NUMERIC DEFAULT 0, -- 0-100
  health_score    NUMERIC DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── okr_key_results ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS okr_key_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id    UUID REFERENCES okr_objectives(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL,
  title           TEXT NOT NULL,
  metric_key      TEXT,             -- links to ERP metric
  target_value    NUMERIC,
  current_value   NUMERIC DEFAULT 0,
  unit            TEXT DEFAULT 'number',
  progress        NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'on_track',
  due_date        DATE,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_okr_workspace ON okr_objectives(workspace_id, quarter, status);
CREATE INDEX IF NOT EXISTS idx_okr_kr_objective ON okr_key_results(objective_id);

-- ── RLS on all tables ─────────────────────────────────────────────────────────
DO $$ DECLARE t TEXT;
BEGIN
  ALTER TABLE bir_compliance_items    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cash_flow_projections   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE channel_revenue_entries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE labor_cost_analytics    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE supplier_scorecards     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales_coach_insights    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE industry_benchmarks     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE board_reports           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE anomaly_flags           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE okr_objectives          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE okr_key_results         ENABLE ROW LEVEL SECURITY;

  FOREACH t IN ARRAY ARRAY[
    'bir_compliance_items','cash_flow_projections','channel_revenue_entries',
    'labor_cost_analytics','supplier_scorecards','sales_coach_insights',
    'industry_benchmarks','board_reports','anomaly_flags',
    'okr_objectives','okr_key_results'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_only') THEN
      EXECUTE format('CREATE POLICY service_role_only ON %I USING (auth.role() = ''service_role'')', t);
    END IF;
  END LOOP;
END $$;

-- ── Seed PH industry benchmarks ──────────────────────────────────────────────
INSERT INTO industry_benchmarks (industry, metric_key, metric_label, benchmark_value, unit, segment) VALUES
  ('Retail', 'gross_margin_pct', 'Gross Margin %', 35, 'percent', 'SMB'),
  ('Retail', 'inventory_turnover', 'Inventory Turnover (x/yr)', 6, 'times', 'SMB'),
  ('Retail', 'collection_rate', 'AR Collection Rate %', 88, 'percent', 'SMB'),
  ('Food & Beverage', 'gross_margin_pct', 'Gross Margin %', 65, 'percent', 'SMB'),
  ('Food & Beverage', 'labor_cost_pct', 'Labor Cost % of Revenue', 30, 'percent', 'SMB'),
  ('Technology & SaaS', 'gross_margin_pct', 'Gross Margin %', 72, 'percent', 'SMB'),
  ('Technology & SaaS', 'churn_rate', 'Monthly Churn Rate %', 3, 'percent', 'SMB'),
  ('Professional Services', 'gross_margin_pct', 'Gross Margin %', 55, 'percent', 'SMB'),
  ('Professional Services', 'utilization_rate', 'Billable Utilization %', 75, 'percent', 'SMB'),
  ('Manufacturing', 'gross_margin_pct', 'Gross Margin %', 28, 'percent', 'SMB'),
  ('Manufacturing', 'labor_cost_pct', 'Labor Cost % of Revenue', 22, 'percent', 'SMB'),
  ('Real Estate', 'collection_rate', 'Collection Rate %', 92, 'percent', 'SMB'),
  ('Logistics', 'gross_margin_pct', 'Gross Margin %', 18, 'percent', 'SMB'),
  ('Healthcare', 'gross_margin_pct', 'Gross Margin %', 45, 'percent', 'SMB'),
  ('Education', 'gross_margin_pct', 'Gross Margin %', 40, 'percent', 'SMB'),
  ('Retail', 'gross_margin_pct', 'Gross Margin %', 42, 'percent', 'Enterprise'),
  ('Technology & SaaS', 'gross_margin_pct', 'Gross Margin %', 78, 'percent', 'Enterprise'),
  ('Manufacturing', 'gross_margin_pct', 'Gross Margin %', 32, 'percent', 'Enterprise')
ON CONFLICT (industry, metric_key, segment, period_year) DO NOTHING;

-- ── Nav entries ───────────────────────────────────────────────────────────────
DO $$
DECLARE div_id UUID;
BEGIN
  SELECT id INTO div_id FROM erp_divisions WHERE division_key = 'intelligence' LIMIT 1;
  IF div_id IS NULL THEN RETURN; END IF;

  -- BIR Compliance
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='bir_compliance') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'bir_compliance','BIR Compliance','Autonomous BIR & regulatory deadline monitoring with penalty forecasting','FileCheck','/Admin/Intelligence/BIRCompliance','active',25);
  END IF;

  -- Cash Flow Intelligence
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='cash_flow_intel') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'cash_flow_intel','Cash Flow Intel','30/60/90-day cash flow forecasting with AR aging and collection actions','Banknote','/Admin/Intelligence/CashFlowIntel','active',26);
  END IF;

  -- Multi-Channel Revenue
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='multichannel_revenue') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'multichannel_revenue','Revenue by Channel','Lazada, Shopee, TikTok Shop, Facebook, POS unified revenue intelligence','Store','/Admin/Intelligence/MultiChannelRevenue','active',27);
  END IF;

  -- Labor Cost Intelligence
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='labor_cost_intel') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'labor_cost_intel','Labor Cost Intel','DOLE compliance, 13th month accruals, SSS/PhilHealth/Pag-IBIG monitoring','Users2','/Admin/Intelligence/LaborCostIntel','active',28);
  END IF;

  -- Supplier Risk
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='supplier_risk') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'supplier_risk','Supplier Risk','Supplier scorecards, concentration risk, price variance and contract alerts','Truck','/Admin/Intelligence/SupplierRisk','active',29);
  END IF;

  -- AI Sales Coach
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='ai_sales_coach') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'ai_sales_coach','AI Sales Coach','Real-time deal coaching, win probability, and rep performance intelligence','Trophy','/Admin/Intelligence/AISalesCoach','active',30);
  END IF;

  -- Industry Benchmarks
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='industry_benchmarks') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'industry_benchmarks','PH Benchmarks','Compare KPIs against Philippine industry averages from PSE/BSP/SEC data','BarChart3','/Admin/Intelligence/IndustryBenchmarks','active',31);
  END IF;

  -- Board Report
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='board_report') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'board_report','Board Report AI','One-click AI-generated board reports with PDF export and auto-scheduling','Presentation','/Admin/Intelligence/BoardReport','active',32);
  END IF;

  -- Anomaly Detection
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='anomaly_detection') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'anomaly_detection','Anomaly Detection','AI fraud detection and financial anomaly monitoring across all modules','ShieldAlert','/Admin/Intelligence/AnomalyDetection','active',33);
  END IF;

  -- OKR Intelligence
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id=div_id AND feature_key='okr_intelligence') THEN
    INSERT INTO erp_features (division_id,feature_key,label,description,icon,admin_route,status,order_index)
    VALUES (div_id,'okr_intelligence','OKR Intelligence','Strategic OKR tracking with AI health scoring and auto-sync from ERP modules','Target','/Admin/Intelligence/OKRIntelligence','active',34);
  END IF;
END $$;
