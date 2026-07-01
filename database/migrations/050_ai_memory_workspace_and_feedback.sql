-- Migration 050: AI chatbot memory scoping + feedback table
-- Adds workspace_id to ai_memory so per-session memory can be scoped.
-- Creates ai_feedback table (previously referenced by /api/ai/feedback but did not exist).

-- ── ai_memory workspace scoping ─────────────────────────────────────────────

ALTER TABLE public.ai_memory
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_memory_workspace ON public.ai_memory(workspace_id);

-- Existing rows keep NULL workspace_id; server will write workspace_id going forward.

-- ── ai_feedback table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT NOT NULL,
  workspace_id  UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'admin',
  query         TEXT,
  response      TEXT,
  rating        TEXT NOT NULL,
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_session    ON public.ai_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_workspace  ON public.ai_feedback(workspace_id);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation_ai_feedback" ON public.ai_feedback;
CREATE POLICY "workspace_isolation_ai_feedback" ON public.ai_feedback
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );
