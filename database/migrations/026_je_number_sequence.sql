-- ============================================================
-- Migration 026: Journal Entry number sequence (race-free)
-- Replaces application-side JE number generation with a
-- per-workspace Postgres sequence via a DB function.
-- This eliminates the read-then-write race that could produce
-- duplicate JE numbers under concurrent requests.
-- ============================================================

-- 1. Add UNIQUE constraint so duplicates are impossible at DB level
--    (idempotent — safe to re-run)
ALTER TABLE journal_entries
  ADD CONSTRAINT IF NOT EXISTS uq_journal_entries_workspace_je_number
  UNIQUE (workspace_id, je_number);

-- 2. Sequence counter table — one row per workspace
CREATE TABLE IF NOT EXISTS je_sequences (
  workspace_id UUID PRIMARY KEY,
  last_val     BIGINT NOT NULL DEFAULT 0
);

-- 3. Atomic increment function — returns next JE number string
--    Uses FOR UPDATE to serialize concurrent calls per workspace.
CREATE OR REPLACE FUNCTION next_je_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO je_sequences (workspace_id, last_val)
  VALUES (p_workspace_id, 1)
  ON CONFLICT (workspace_id) DO UPDATE
    SET last_val = je_sequences.last_val + 1
  RETURNING last_val INTO v_next;

  RETURN 'JE-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;

-- Grant execute to service_role (used by the Node backend)
GRANT EXECUTE ON FUNCTION next_je_number(UUID) TO service_role;

COMMENT ON TABLE  je_sequences           IS 'Per-workspace atomic counter for journal entry numbers';
COMMENT ON FUNCTION next_je_number(UUID) IS 'Returns the next JE-XXXXXX number for a workspace, race-free';
