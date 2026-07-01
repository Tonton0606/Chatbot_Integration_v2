-- ============================================================
-- Migration 024: Intelligence Reports Table
-- Creates/replaces saved_reports with all columns the
-- intelligence reports route requires.
-- ============================================================

-- Preserve existing rows if table already exists
DO $$
BEGIN
  -- Add missing columns to saved_reports if it already exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_reports') THEN

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='workspace_id') THEN
      ALTER TABLE saved_reports ADD COLUMN workspace_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='format') THEN
      ALTER TABLE saved_reports ADD COLUMN format TEXT DEFAULT 'PDF';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='status') THEN
      ALTER TABLE saved_reports ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='data') THEN
      ALTER TABLE saved_reports ADD COLUMN data JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='generated_by') THEN
      ALTER TABLE saved_reports ADD COLUMN generated_by UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='ai_summary') THEN
      ALTER TABLE saved_reports ADD COLUMN ai_summary JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='config') THEN
      ALTER TABLE saved_reports ADD COLUMN config JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='period_days') THEN
      ALTER TABLE saved_reports ADD COLUMN period_days INTEGER DEFAULT 30;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='cron_expression') THEN
      ALTER TABLE saved_reports ADD COLUMN cron_expression TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='next_run_at') THEN
      ALTER TABLE saved_reports ADD COLUMN next_run_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_reports' AND column_name='recipients') THEN
      ALTER TABLE saved_reports ADD COLUMN recipients JSONB DEFAULT '[]';
    END IF;

  ELSE
    -- Table does not exist — create it fresh
    CREATE TABLE saved_reports (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id    UUID,
      name            VARCHAR(255) NOT NULL,
      description     TEXT,
      report_type     VARCHAR(50) NOT NULL DEFAULT 'executive',
      format          TEXT DEFAULT 'PDF',
      status          TEXT DEFAULT 'draft',
      filters         JSONB DEFAULT '{}',
      config          JSONB DEFAULT '{}',
      data            JSONB DEFAULT '{}',
      ai_summary      JSONB DEFAULT '{}',
      period_days     INTEGER DEFAULT 30,
      schedule        VARCHAR(50),
      cron_expression TEXT,
      next_run_at     TIMESTAMPTZ,
      recipients      JSONB DEFAULT '[]',
      last_run_at     TIMESTAMPTZ,
      last_run_result JSONB,
      created_by      UUID,
      generated_by    UUID,
      is_public       BOOLEAN DEFAULT false,
      created_at      TIMESTAMPTZ DEFAULT now(),
      updated_at      TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_reports_workspace  ON saved_reports(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_reports_type       ON saved_reports(workspace_id, report_type);
CREATE INDEX IF NOT EXISTS idx_saved_reports_status     ON saved_reports(status);

-- RLS
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_reports' AND policyname = 'service_role_only') THEN
    CREATE POLICY service_role_only ON saved_reports USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMENT ON TABLE saved_reports IS 'Intelligence report definitions, runs, and AI summaries';
