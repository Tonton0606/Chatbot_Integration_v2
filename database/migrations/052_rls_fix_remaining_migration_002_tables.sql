-- Migration 052: Fix remaining open RLS policies from migration 002
--
-- Root cause: Migration 002 created 14 tables with open "Allow all operations
-- for authenticated users" RLS policies. Migration 021 added workspace_id and
-- workspace_isolation policies for 7 of those tables, but did NOT drop the old
-- open policies. In PostgreSQL, when multiple permissive policies exist, they
-- OR together — so the open policy defeats the workspace_isolation policy.
-- Migration 051 fixed audit_logs. This migration fixes the remaining 13.
--
-- Additionally, 6 tables were NOT covered by migration 021 at all:
-- customer_portal_access, customer_portal_activity, feedback_entries,
-- kb_categories, kb_articles, kb_attachments. These get workspace_id added,
-- backfilled, and workspace_isolation policies created.
--
-- Safe to run repeatedly: every statement is guarded.

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 1: Drop the open "Allow all operations" policy on all 13 remaining tables.
-- For tables that already have a workspace_isolation policy (from migration 021),
-- this removes the overly-permissive policy that was OR'd with it.
-- For tables without a workspace_isolation policy yet, Part 2 adds one.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
  tables_with_open_policy TEXT[] := ARRAY[
    'revenue_entries',
    'revenue_projections',
    'analytics_events',
    'pipeline_stages',
    'deal_pipeline_history',
    'customer_portal_access',
    'customer_portal_activity',
    'feedback_entries',
    'kb_categories',
    'kb_articles',
    'kb_attachments',
    'saved_reports',
    'report_exports'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_open_policy LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.%I',
        tbl
      );
      RAISE NOTICE 'Dropped open policy on %', tbl;
    END IF;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 2: Add workspace_id + RLS for the 6 tables NOT covered by migration 021.
-- These tables predate the workspace model and have no workspace_id column.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  primary_ws UUID;
  tbl TEXT;
  uncovered_tables TEXT[] := ARRAY[
    'customer_portal_access',
    'customer_portal_activity',
    'feedback_entries',
    'kb_categories',
    'kb_articles',
    'kb_attachments'
  ];
BEGIN
  SELECT id INTO primary_ws
  FROM public.workspaces
  ORDER BY created_at ASC
  LIMIT 1;

  FOREACH tbl IN ARRAY uncovered_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- 1. Add workspace_id column if missing.
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id UUID',
        tbl
      );

      -- 2. Backfill NULLs to the primary workspace.
      IF primary_ws IS NOT NULL THEN
        EXECUTE format(
          'UPDATE public.%I SET workspace_id = $1 WHERE workspace_id IS NULL',
          tbl
        ) USING primary_ws;
      END IF;

      -- 3. Add FK to workspaces (guarded).
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

      -- 4. Index for workspace filter.
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id)',
        'idx_' || tbl || '_workspace', tbl
      );

      -- 5. Enable RLS.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- 6. Workspace-membership policy.
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
