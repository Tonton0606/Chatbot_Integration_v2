-- ============================================================
-- Migration 041: Loop Engine Architecture
-- Continuous OBSERVE → ANALYZE → INSIGHT → DECIDE → ACT → LEARN
-- ============================================================

-- ── loop_configs ────────────────────────────────────────────────────────────
-- Per-workspace config: sources, rules, intervals, actions

CREATE TABLE IF NOT EXISTS loop_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  name            TEXT NOT NULL DEFAULT 'Default Loop',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  interval_seconds INTEGER NOT NULL DEFAULT 300,   -- how often loop ticks
  sources         JSONB NOT NULL DEFAULT '["crm","finance","marketing","hr","inventory"]',
  rules           JSONB NOT NULL DEFAULT '[]',     -- JSON rule array
  actions_config  JSONB NOT NULL DEFAULT '{}',     -- webhook URLs, slack, etc.
  ai_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loop_configs_workspace ON loop_configs(workspace_id);

-- ── loop_runs ───────────────────────────────────────────────────────────────
-- Each tick of the loop is a run

CREATE TABLE IF NOT EXISTS loop_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  config_id       UUID REFERENCES loop_configs(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','completed','failed','partial')),
  phase           TEXT NOT NULL DEFAULT 'observe'
                    CHECK (phase IN ('observe','analyze','insight','decide','act','learn','done')),
  metrics_snapshot JSONB,
  anomalies       JSONB,
  insight_count   INTEGER DEFAULT 0,
  decision_count  INTEGER DEFAULT 0,
  action_count    INTEGER DEFAULT 0,
  duration_ms     INTEGER,
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_loop_runs_workspace ON loop_runs(workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_loop_runs_status    ON loop_runs(status);

-- ── loop_decisions ──────────────────────────────────────────────────────────
-- Every rule evaluation that fires

CREATE TABLE IF NOT EXISTS loop_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  run_id          UUID REFERENCES loop_runs(id) ON DELETE CASCADE,
  rule_name       TEXT NOT NULL,
  rule_config     JSONB NOT NULL,
  metric          TEXT,
  metric_value    NUMERIC,
  threshold       NUMERIC,
  triggered       BOOLEAN NOT NULL DEFAULT FALSE,
  confidence      NUMERIC DEFAULT 100,
  actions_planned JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loop_decisions_run       ON loop_decisions(run_id);
CREATE INDEX IF NOT EXISTS idx_loop_decisions_workspace ON loop_decisions(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loop_decisions_triggered ON loop_decisions(triggered, workspace_id);

-- ── loop_actions ─────────────────────────────────────────────────────────────
-- Every action executed (or queued for approval)

CREATE TABLE IF NOT EXISTS loop_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  run_id          UUID REFERENCES loop_runs(id) ON DELETE CASCADE,
  decision_id     UUID REFERENCES loop_decisions(id) ON DELETE SET NULL,
  action_type     TEXT NOT NULL,
  payload         JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','executed','failed','approval_required','approved','rejected')),
  result          JSONB,
  error           TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by     UUID,
  executed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loop_actions_run       ON loop_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_loop_actions_workspace ON loop_actions(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loop_actions_status    ON loop_actions(status, workspace_id);

-- ── loop_learning_logs ───────────────────────────────────────────────────────
-- Feedback: was the decision/action correct? Used to tune rules

CREATE TABLE IF NOT EXISTS loop_learning_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL,
  run_id            UUID REFERENCES loop_runs(id) ON DELETE SET NULL,
  action_id         UUID REFERENCES loop_actions(id) ON DELETE SET NULL,
  decision_id       UUID REFERENCES loop_decisions(id) ON DELETE SET NULL,
  outcome           TEXT CHECK (outcome IN ('success','failure','neutral','unknown')) DEFAULT 'unknown',
  performance_score NUMERIC DEFAULT 0,    -- -1.0 to 1.0
  metric_before     JSONB,
  metric_after      JSONB,
  feedback_source   TEXT DEFAULT 'auto',  -- 'auto' | 'human'
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_logs_workspace ON loop_learning_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_logs_action    ON loop_learning_logs(action_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_outcome   ON loop_learning_logs(outcome, workspace_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE loop_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_decisions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_actions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_learning_logs ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['loop_configs','loop_runs','loop_decisions','loop_actions','loop_learning_logs'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_only') THEN
      EXECUTE format('CREATE POLICY service_role_only ON %I USING (auth.role() = ''service_role'')', t);
    END IF;
  END LOOP;
END $$;

-- ── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_loop_configs_updated_at ON loop_configs;
CREATE TRIGGER trg_loop_configs_updated_at
  BEFORE UPDATE ON loop_configs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── sidebar nav entry for Loop Engine ───────────────────────────────────────

DO $$
DECLARE v_division_id UUID;
BEGIN
  SELECT id INTO v_division_id FROM public.erp_divisions WHERE division_key = 'intelligence' LIMIT 1;
  IF v_division_id IS NULL THEN RAISE NOTICE 'Intelligence division not found.'; RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.erp_features WHERE division_id = v_division_id AND feature_key = 'loop_engine') THEN
    INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
    VALUES (v_division_id, 'loop_engine', 'Loop Engine', 'RefreshCw', 'Autonomous AI loop: Observe → Analyze → Decide → Act → Learn', '/Admin/Intelligence/LoopEngine', NULL, true, false, 'active', false, 21);
    RAISE NOTICE 'Loop Engine nav entry inserted.';
  END IF;
END $$;

COMMENT ON TABLE loop_configs       IS 'Per-workspace loop configuration: sources, rules, intervals';
COMMENT ON TABLE loop_runs          IS 'Each execution tick of the intelligence loop engine';
COMMENT ON TABLE loop_decisions     IS 'Rule evaluations and decisions made per loop run';
COMMENT ON TABLE loop_actions       IS 'Actions executed or queued from loop decisions';
COMMENT ON TABLE loop_learning_logs IS 'Outcome feedback for continuous rule improvement';
