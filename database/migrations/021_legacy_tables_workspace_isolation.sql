-- Migration 021: Multi-tenant isolation for legacy single-tenant admin tables
--
-- These tables predate the workspace model and were queried globally by the
-- analytics / revenue / reports / tasks routes, causing cross-tenant data
-- exposure. This migration adds workspace_id, backfills existing rows to the
-- primary (earliest-created) workspace, indexes the column, and enables RLS as
-- defense-in-depth. The API enforces isolation in app code (service-role key
-- bypasses RLS), so RLS here only protects any direct/anon access.
--
-- Safe to run repeatedly: every statement is guarded (IF EXISTS / IF NOT EXISTS).
-- Tables not present in this database are skipped silently.
--
-- ORDERING: deploy this migration BEFORE the route code that filters on
-- workspace_id, or those queries will error on the missing column.

DO $$
DECLARE
  primary_ws UUID;
  tbl TEXT;
  legacy_tables TEXT[] := ARRAY[
    'analytics_events',
    'revenue_entries',
    'revenue_projections',
    'pipeline_stages',
    'deal_pipeline_history',
    'deals',
    'tasks',
    'team_members',
    'saved_reports',
    'report_exports',
    'projects'
  ];
BEGIN
  -- Resolve the primary workspace (oldest) to own all historical rows.
  SELECT id INTO primary_ws
  FROM public.workspaces
  ORDER BY created_at ASC
  LIMIT 1;

  FOREACH tbl IN ARRAY legacy_tables LOOP
    -- Only touch tables that actually exist in this database.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- 1. Add the column if missing.
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id UUID',
        tbl
      );

      -- 2. Backfill NULLs to the primary workspace (if one exists).
      IF primary_ws IS NOT NULL THEN
        EXECUTE format(
          'UPDATE public.%I SET workspace_id = $1 WHERE workspace_id IS NULL',
          tbl
        ) USING primary_ws;
      END IF;

      -- 3. Add FK to workspaces (guarded — skip if it already exists).
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = tbl
          AND constraint_name = tbl || '_workspace_id_fkey'
      ) THEN
        BEGIN
          EXECUTE format(
            'ALTER TABLE public.%I
               ADD CONSTRAINT %I FOREIGN KEY (workspace_id)
               REFERENCES public.workspaces(id) ON DELETE CASCADE',
            tbl, tbl || '_workspace_id_fkey'
          );
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Skipped FK on %: %', tbl, SQLERRM;
        END;
      END IF;

      -- 4. Index for the workspace filter used on every query.
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id)',
        'idx_' || tbl || '_workspace', tbl
      );

      -- 5. Enable RLS (defense-in-depth for any non-service-role access).
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- 6. Workspace-membership policy (drop+recreate for idempotency).
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl || '_workspace_isolation', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I
           USING (
             workspace_id IN (
               SELECT workspace_id FROM public.workspace_members
               WHERE user_id = auth.uid()
             )
           )',
        tbl || '_workspace_isolation', tbl
      );

      RAISE NOTICE 'Workspace isolation applied to %', tbl;
    ELSE
      RAISE NOTICE 'Table % not present — skipped', tbl;
    END IF;
  END LOOP;
END $$;
