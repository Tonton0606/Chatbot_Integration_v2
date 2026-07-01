-- ════════════════════════════════════════════════════════════════════════════
-- Migration 028: KPI Engine — Task / Project / Team Performance Wiring
-- Dual-mode: Corporate (3 KPIs/module) + SMB (2 KPIs/module)
-- Aggregation: Weighted average, role-weighted team scoring
-- Trigger: Hybrid (real-time Tier1, hourly Tier2, daily Tier3)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. KPI DEFINITIONS ───────────────────────────────────────────────────────
-- Workspace-level KPI catalog. Admins define; system computes.

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  module          TEXT NOT NULL CHECK (module IN ('task','project','team','sales')),
  code            TEXT NOT NULL,         -- e.g. 'T2_on_time', 'P1_milestone'
  label           TEXT NOT NULL,
  description     TEXT,
  weight          DECIMAL(4,2) NOT NULL DEFAULT 1.00,  -- relative weight in scoring
  mode            TEXT NOT NULL DEFAULT 'both'
                    CHECK (mode IN ('corporate','smb','both')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, module, code)
);

-- Seed standard KPI definitions (applied per workspace on onboarding)
-- These are inserted by the application layer per workspace_id.
-- Schema only here — no hardcoded workspace seeds.

-- ── 2. TASK KPI COLUMNS ──────────────────────────────────────────────────────
-- Extend existing tasks table with KPI tracking fields.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS primary_assignee_id    UUID,
  ADD COLUMN IF NOT EXISTS supporting_assignees   UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_team_id       UUID,
  ADD COLUMN IF NOT EXISTS role_weight            DECIMAL(3,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS assignment_type        TEXT DEFAULT 'individual'
    CHECK (assignment_type IN ('individual','collaborative','delegation')),
  ADD COLUMN IF NOT EXISTS completed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopen_count           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cycle_time_hours       DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS workspace_id           UUID;

-- Backfill primary_assignee_id from existing assigned_to
UPDATE tasks
  SET primary_assignee_id = assigned_to,
      assignment_type = 'individual'
  WHERE assigned_to IS NOT NULL
    AND primary_assignee_id IS NULL;

-- Backfill completed_at for already-done tasks
UPDATE tasks
  SET completed_at = updated_at
  WHERE status = 'done'
    AND completed_at IS NULL;

-- ── 3. KPI SCORES — INDIVIDUAL (per task evaluation) ─────────────────────────

CREATE TABLE IF NOT EXISTS kpi_task_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL,
  task_id             UUID NOT NULL,
  assignee_id         UUID NOT NULL,          -- primary or supporting
  credit_pct          DECIMAL(5,2) DEFAULT 100.00, -- 100 primary / 60+40 split
  -- T2: On-time delivery
  on_time             BOOLEAN,
  on_time_score       DECIMAL(5,2),           -- 100 if on time, 0 if late
  -- T4: Reopen rate
  reopen_count        INTEGER DEFAULT 0,
  reopen_score        DECIMAL(5,2),           -- 100-(reopen_count*25), floor 0
  -- T5: Cycle time (hours)
  cycle_time_hours    DECIMAL(10,2),
  cycle_time_score    DECIMAL(5,2),           -- scored vs role benchmark
  -- Composite
  composite_score     DECIMAL(5,2),           -- weighted: T2(40)+T4(30)+T5(30)
  weighted_score      DECIMAL(5,2),           -- composite * role_weight * credit_pct
  evaluated_at        TIMESTAMPTZ DEFAULT NOW(),
  scoring_version     INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_kpi_task_scores_assignee
  ON kpi_task_scores(workspace_id, assignee_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_task_scores_task
  ON kpi_task_scores(task_id);

-- ── 4. KPI SCORES — INDIVIDUAL ROLLING (weekly summary per person) ───────────

CREATE TABLE IF NOT EXISTS kpi_individual_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  user_id         UUID NOT NULL,
  team_id         UUID,
  department      TEXT,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  period_type     TEXT DEFAULT 'week' CHECK (period_type IN ('week','month')),
  -- Component scores (0–100)
  on_time_rate        DECIMAL(5,2) DEFAULT 0,   -- T2
  reopen_rate         DECIMAL(5,2) DEFAULT 0,   -- T4 (inverted: low = good)
  cycle_time_score    DECIMAL(5,2) DEFAULT 0,   -- T5
  -- Composite
  composite_score     DECIMAL(5,2) DEFAULT 0,   -- weighted avg of components
  role_weight         DECIMAL(3,2) DEFAULT 1.00,
  weighted_score      DECIMAL(5,2) DEFAULT 0,   -- composite * role_weight
  -- Metadata
  tasks_evaluated     INTEGER DEFAULT 0,
  tasks_on_time       INTEGER DEFAULT 0,
  tasks_reopened      INTEGER DEFAULT 0,
  tasks_completed     INTEGER DEFAULT 0,
  score_state         TEXT DEFAULT 'healthy'
    CHECK (score_state IN ('healthy','watch','concern','critical','frozen','estimated')),
  data_quality        TEXT DEFAULT 'confirmed'
    CHECK (data_quality IN ('confirmed','estimated','stale','frozen','invalid')),
  last_sync_at        TIMESTAMPTZ DEFAULT NOW(),
  calculated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, period_start, period_type)
);

CREATE INDEX IF NOT EXISTS idx_kpi_individual_period
  ON kpi_individual_scores(workspace_id, user_id, period_start DESC);

-- ── 5. KPI SCORES — PROJECT ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_project_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL,
  project_id          UUID NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  period_type         TEXT DEFAULT 'week',
  -- P1: Milestone hit rate
  milestone_hit_rate  DECIMAL(5,2) DEFAULT 0,
  -- P2: Budget variance (corporate only)
  budget_variance_pct DECIMAL(7,2),
  -- P3: Task completion velocity (tasks/week)
  task_velocity       DECIMAL(8,2) DEFAULT 0,
  -- Composite
  composite_score     DECIMAL(5,2) DEFAULT 0,
  -- P1(40%) + P3(35%) + P2(25%) corporate
  -- P1(60%) + P3(40%) smb
  scoring_mode        TEXT DEFAULT 'smb' CHECK (scoring_mode IN ('corporate','smb')),
  tasks_total         INTEGER DEFAULT 0,
  tasks_completed     INTEGER DEFAULT 0,
  tasks_overdue       INTEGER DEFAULT 0,
  milestones_total    INTEGER DEFAULT 0,
  milestones_hit      INTEGER DEFAULT 0,
  calculated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, project_id, period_start, period_type)
);

-- ── 6. KPI SCORES — TEAM ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_team_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL,
  team_id             UUID NOT NULL,
  department          TEXT,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  period_type         TEXT DEFAULT 'week',
  -- TM1: Individual task completion rate (avg of members)
  avg_completion_rate DECIMAL(5,2) DEFAULT 0,
  -- TM3: Availability rate
  availability_rate   DECIMAL(5,2) DEFAULT 0,
  -- TM5: Escalation rate (inverted: lower = better)
  escalation_rate     DECIMAL(5,2) DEFAULT 0,
  escalation_penalty  DECIMAL(5,2) DEFAULT 0,   -- -5 per unresolved escalation
  -- Composite
  composite_score     DECIMAL(5,2) DEFAULT 0,
  member_count        INTEGER DEFAULT 0,
  members_evaluated   INTEGER DEFAULT 0,
  calculated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, team_id, period_start, period_type)
);

-- ── 7. ROLE WEIGHTS REGISTRY ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_role_weights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  role_name     TEXT NOT NULL,
  weight        DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  -- junior=0.75, mid=1.00, senior=1.25, manager=1.50
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, role_name)
);

-- Default role weights (inserted by application layer per workspace)

-- ── 8. KPI INCIDENTS (failure accountability) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_incidents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL,
  tier              INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
  affected_users    UUID[] NOT NULL,
  data_source       TEXT NOT NULL,
  gap_start         TIMESTAMPTZ NOT NULL,
  gap_end           TIMESTAMPTZ,
  last_valid_score  JSONB,
  resolution_by     UUID,
  resolution_note   TEXT,
  resolved_at       TIMESTAMPTZ,
  legal_hold        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. RLS POLICIES ──────────────────────────────────────────────────────────

ALTER TABLE kpi_definitions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_task_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_individual_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_project_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_team_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_role_weights       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_incidents          ENABLE ROW LEVEL SECURITY;

-- Workspace isolation on all KPI tables
CREATE POLICY kpi_definitions_workspace ON kpi_definitions
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_task_scores_workspace ON kpi_task_scores
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_individual_workspace ON kpi_individual_scores
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_project_workspace ON kpi_project_scores
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_team_workspace ON kpi_team_scores
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_role_weights_workspace ON kpi_role_weights
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_incidents_workspace ON kpi_incidents
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

-- ── 10. INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_kpi_project_period
  ON kpi_project_scores(workspace_id, project_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_team_period
  ON kpi_team_scores(workspace_id, team_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_primary_assignee
  ON tasks(primary_assignee_id) WHERE primary_assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace
  ON tasks(workspace_id) WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_due_status
  ON tasks(due_date, status) WHERE due_date IS NOT NULL;
