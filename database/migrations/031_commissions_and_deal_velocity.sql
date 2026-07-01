-- Migration 031: Commission Engine + Deal Velocity Tracker
-- Adds sales commission infrastructure and CRM stage history for velocity KPIs.

-- ── Deal Stage History ────────────────────────────────────────────────────────
-- Tracks time spent in each CRM pipeline stage per deal.
-- Used for: average close time, stall detection, per-rep velocity KPIs.

CREATE TABLE IF NOT EXISTS deal_stage_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  stage_id      uuid NOT NULL REFERENCES crm_stages(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entered_at    timestamptz NOT NULL DEFAULT now(),
  exited_at     timestamptz,
  duration_hours numeric GENERATED ALWAYS AS (
    CASE WHEN exited_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (exited_at - entered_at)) / 3600
      ELSE NULL
    END
  ) STORED
);

CREATE INDEX idx_deal_stage_history_opportunity ON deal_stage_history(opportunity_id);
CREATE INDEX idx_deal_stage_history_workspace   ON deal_stage_history(workspace_id);
CREATE INDEX idx_deal_stage_history_stage       ON deal_stage_history(stage_id);

ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON deal_stage_history
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- ── Commission Plans ──────────────────────────────────────────────────────────
-- Defines the structure of a commission plan (flat, percent, or tiered).

CREATE TABLE IF NOT EXISTS commission_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  type         text NOT NULL CHECK (type IN ('flat', 'percent', 'tiered')),
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_plans_workspace ON commission_plans(workspace_id);

ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON commission_plans
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- ── Commission Tiers ──────────────────────────────────────────────────────────
-- Supports flat ($500), percent (5%), and tiered (0–10k → 3%, 10k+ → 5%) structures.

CREATE TABLE IF NOT EXISTS commission_tiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES commission_plans(id) ON DELETE CASCADE,
  min_amount  numeric NOT NULL DEFAULT 0,
  max_amount  numeric,                  -- NULL = no upper bound
  rate        numeric NOT NULL,         -- percent value (e.g. 5.0 = 5%) or flat amount
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_tiers_plan ON commission_tiers(plan_id);

-- ── Commission Events ─────────────────────────────────────────────────────────
-- Created automatically when a CRM deal is marked as won.
-- Lifecycle: pending → approved → paid

CREATE TABLE IF NOT EXISTS commission_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deal_id       uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  rep_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id       uuid REFERENCES commission_plans(id) ON DELETE SET NULL,
  deal_amount   numeric NOT NULL,
  commission_amount numeric NOT NULL,
  rate_applied  numeric,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'voided')),
  approved_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at   timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_events_workspace ON commission_events(workspace_id);
CREATE INDEX idx_commission_events_rep       ON commission_events(rep_id);
CREATE INDEX idx_commission_events_deal      ON commission_events(deal_id);
CREATE INDEX idx_commission_events_status    ON commission_events(status);

ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON commission_events
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- ── Commission Payouts ────────────────────────────────────────────────────────
-- Batched payout records per rep per period (weekly/monthly).

CREATE TABLE IF NOT EXISTS commission_payouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rep_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  total_amount numeric NOT NULL,
  paid_at      timestamptz,
  payment_ref  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_payouts_workspace ON commission_payouts(workspace_id);
CREATE INDEX idx_commission_payouts_rep       ON commission_payouts(rep_id);

ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON commission_payouts
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- ── Rep → Plan Assignment ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_plan_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rep_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id      uuid NOT NULL REFERENCES commission_plans(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to   date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_id, plan_id, effective_from)
);

ALTER TABLE commission_plan_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON commission_plan_assignments
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));
