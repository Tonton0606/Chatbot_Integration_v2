-- ════════════════════════════════════════════════════════════════════════════
-- Migration 029: KPI Performance Summary + Recommendations Engine
-- Stores generated summaries and AI-assisted improvement recommendations
-- per individual, team, and project — weekly and monthly cadence
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. PERFORMANCE SUMMARIES ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_performance_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL,
  subject_type      TEXT NOT NULL CHECK (subject_type IN ('individual','team','project','department')),
  subject_id        UUID NOT NULL,       -- user_id / team_id / project_id
  subject_name      TEXT,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  period_type       TEXT DEFAULT 'week' CHECK (period_type IN ('week','month','quarter')),
  scoring_mode      TEXT DEFAULT 'smb'  CHECK (scoring_mode IN ('corporate','smb')),

  -- Score snapshot
  overall_score         DECIMAL(5,2),
  score_trend           TEXT CHECK (score_trend IN ('improving','stable','declining','critical')),
  score_delta           DECIMAL(6,2),    -- vs previous period
  previous_score        DECIMAL(5,2),
  score_state           TEXT CHECK (score_state IN ('healthy','watch','concern','critical','frozen')),

  -- Component breakdown (JSONB for flexibility)
  component_scores      JSONB DEFAULT '{}',
  -- e.g. {"on_time_rate": 85, "reopen_score": 90, "cycle_time_score": 75}

  -- Volume stats
  stats                 JSONB DEFAULT '{}',
  -- e.g. {"tasks_total":20,"tasks_done":17,"tasks_overdue":2,"tasks_reopened":1}

  -- Generated summary text (plain language)
  summary_headline      TEXT,
  -- e.g. "Strong week — 85% on-time, but 2 tasks reopened"
  summary_body          TEXT,
  -- Full paragraph summary

  -- Computed flags
  is_top_performer      BOOLEAN DEFAULT false,
  is_at_risk            BOOLEAN DEFAULT false,
  needs_attention       BOOLEAN DEFAULT false,

  generated_at          TIMESTAMPTZ DEFAULT NOW(),
  generation_source     TEXT DEFAULT 'system' CHECK (generation_source IN ('system','ai','manual')),

  UNIQUE (workspace_id, subject_type, subject_id, period_start, period_type)
);

CREATE INDEX IF NOT EXISTS idx_kpi_summary_subject
  ON kpi_performance_summaries(workspace_id, subject_type, subject_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_summary_at_risk
  ON kpi_performance_summaries(workspace_id, is_at_risk, period_start DESC)
  WHERE is_at_risk = true;

-- ── 2. PERFORMANCE RECOMMENDATIONS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL,
  summary_id        UUID REFERENCES kpi_performance_summaries(id) ON DELETE CASCADE,
  subject_type      TEXT NOT NULL CHECK (subject_type IN ('individual','team','project','department')),
  subject_id        UUID NOT NULL,
  period_start      DATE NOT NULL,

  -- Recommendation content
  category          TEXT NOT NULL CHECK (category IN (
                      'workload',       -- too many / too few tasks
                      'quality',        -- high reopen rate
                      'timeliness',     -- missing deadlines
                      'efficiency',     -- high cycle time
                      'collaboration',  -- team coordination
                      'recognition',    -- top performer
                      'training',       -- skill gap signal
                      'escalation',     -- unresolved escalations
                      'capacity'        -- availability issue
                    )),
  priority          TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  action_items      JSONB DEFAULT '[]',
  -- e.g. [{"action":"Review open tasks","owner":"manager","deadline":"3 days"}]

  -- Trigger that caused this recommendation
  trigger_metric    TEXT,   -- e.g. 'on_time_rate', 'reopen_count'
  trigger_value     DECIMAL(8,2),
  trigger_threshold DECIMAL(8,2),

  -- Status tracking
  status            TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending','acknowledged','in_progress','resolved','dismissed')),
  acknowledged_by   UUID,
  acknowledged_at   TIMESTAMPTZ,
  resolution_note   TEXT,
  resolved_at       TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_rec_subject
  ON kpi_recommendations(workspace_id, subject_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_rec_pending
  ON kpi_recommendations(workspace_id, status, priority)
  WHERE status = 'pending';

-- ── 3. DEPARTMENT COMPARISON TABLE ───────────────────────────────────────────
-- Inter-department health — computed weekly

CREATE TABLE IF NOT EXISTS kpi_department_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL,
  department          TEXT NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  period_type         TEXT DEFAULT 'week',

  -- Aggregated from team scores within department
  avg_individual_score    DECIMAL(5,2) DEFAULT 0,
  avg_team_score          DECIMAL(5,2) DEFAULT 0,
  dept_composite_score    DECIMAL(5,2) DEFAULT 0,

  -- Inter-department metrics
  cross_dept_resolution_rate  DECIMAL(5,2),  -- DEPT-1
  milestone_contribution_rate DECIMAL(5,2),  -- DEPT-2
  headcount_efficiency_ratio  DECIMAL(5,2),  -- DEPT-3 (tasks/person/week)

  -- Rankings
  dept_rank               INTEGER,
  dept_rank_total         INTEGER,
  rank_delta              INTEGER,           -- vs previous period (+up/-down)

  member_count            INTEGER DEFAULT 0,
  team_count              INTEGER DEFAULT 0,
  calculated_at           TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (workspace_id, department, period_start, period_type)
);

-- ── 4. KPI DIGEST LOG ────────────────────────────────────────────────────────
-- Tracks every digest sent — audit trail for RA 10173 compliance

CREATE TABLE IF NOT EXISTS kpi_digest_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  digest_type     TEXT NOT NULL CHECK (digest_type IN ('daily','weekly','monthly','alert')),
  recipients      UUID[] NOT NULL,
  period_start    DATE,
  period_end      DATE,
  summary_count   INTEGER DEFAULT 0,
  rec_count       INTEGER DEFAULT 0,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent','failed','partial')),
  error_log       JSONB
);

-- ── 5. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE kpi_performance_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_recommendations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_department_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_digest_log            ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_summaries_workspace ON kpi_performance_summaries
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_recommendations_workspace ON kpi_recommendations
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_dept_scores_workspace ON kpi_department_scores
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));

CREATE POLICY kpi_digest_log_workspace ON kpi_digest_log
  FOR ALL USING (workspace_id::text = current_setting('app.workspace_id', true));
