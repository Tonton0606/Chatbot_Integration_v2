-- ============================================================
-- Migration 023: Intelligence Power Modules
-- Customer 360, Competitive Intelligence, Executive Command Center
-- ============================================================

-- ── customer_health_scores ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_health_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  customer_id     UUID,
  customer_name   TEXT,
  health_score    NUMERIC DEFAULT 0,   -- 0-100
  churn_risk      TEXT DEFAULT 'low',  -- low, medium, high, critical
  churn_probability NUMERIC DEFAULT 0, -- 0-1
  last_activity   TIMESTAMPTZ,
  revenue_value   NUMERIC DEFAULT 0,
  days_since_order INTEGER DEFAULT 0,
  support_tickets INTEGER DEFAULT 0,
  nps_score       INTEGER,
  engagement_level TEXT DEFAULT 'medium',
  factors         JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  computed_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_health_workspace ON customer_health_scores(workspace_id, churn_risk, health_score DESC);
CREATE INDEX IF NOT EXISTS idx_customer_health_customer  ON customer_health_scores(customer_id, computed_at DESC);

-- ── competitive_intelligence ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitive_intel (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  category        TEXT DEFAULT 'general',  -- pricing, product, marketing, news
  signal_type     TEXT DEFAULT 'news',     -- price_change, new_feature, campaign, review, news
  title           TEXT,
  summary         TEXT,
  source_url      TEXT,
  sentiment       TEXT DEFAULT 'neutral',  -- positive, negative, neutral
  impact_level    TEXT DEFAULT 'low',      -- low, medium, high
  data            JSONB DEFAULT '{}',
  occurred_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_intel_workspace  ON competitive_intel(workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_intel_competitor ON competitive_intel(workspace_id, competitor_name, occurred_at DESC);

-- ── executive_snapshots ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executive_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  snapshot_type   TEXT DEFAULT 'daily',   -- daily, weekly, monthly, board
  kpis            JSONB DEFAULT '{}',
  alerts          JSONB DEFAULT '[]',
  highlights      JSONB DEFAULT '[]',
  risks           JSONB DEFAULT '[]',
  ai_narrative    TEXT,
  generated_by    UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_snapshots_workspace ON executive_snapshots(workspace_id, snapshot_type, created_at DESC);

-- ── Nav entries ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  div_id UUID;
BEGIN
  SELECT id INTO div_id FROM erp_divisions WHERE division_key = 'intelligence' LIMIT 1;
  IF div_id IS NULL THEN RETURN; END IF;

  -- Customer 360
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id = div_id AND feature_key = 'customer360') THEN
    INSERT INTO erp_features (division_id, feature_key, label, description, icon, admin_route, status, order_index)
    VALUES (div_id, 'customer360', 'Customer 360', 'AI churn prediction and customer health scoring', 'Users', '/Admin/Intelligence/Customer360', 'active',22);
  END IF;

  -- Competitive Intelligence
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id = div_id AND feature_key = 'competitive_intel') THEN
    INSERT INTO erp_features (division_id, feature_key, label, description, icon, admin_route, status, order_index)
    VALUES (div_id, 'competitive_intel', 'Competitive Intel', 'Monitor competitors and market signals in real-time', 'Crosshair', '/Admin/Intelligence/CompetitiveIntel', 'active',23);
  END IF;

  -- Executive Command Center
  IF NOT EXISTS (SELECT 1 FROM erp_features WHERE division_id = div_id AND feature_key = 'executive_command') THEN
    INSERT INTO erp_features (division_id, feature_key, label, description, icon, admin_route, status, order_index)
    VALUES (div_id, 'executive_command', 'Command Center', 'Real-time C-suite dashboard with board-ready exports', 'LayoutDashboard', '/Admin/Intelligence/CommandCenter', 'active',24);
  END IF;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_intel      ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_snapshots    ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_health_scores','competitive_intel','executive_snapshots'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_only') THEN
      EXECUTE format('CREATE POLICY service_role_only ON %I USING (auth.role() = ''service_role'')', t);
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE customer_health_scores IS 'AI-computed customer health and churn risk scores';
COMMENT ON TABLE competitive_intel      IS 'Competitive intelligence signals and market monitoring';
COMMENT ON TABLE executive_snapshots    IS 'Board-ready executive KPI snapshots for Command Center';
