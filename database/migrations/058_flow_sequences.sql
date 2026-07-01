-- 058_flow_sequences.sql
-- Botcake-style multi-step drip sequences for Facebook conversations
-- Replaces the fixed 24h/48h follow-up with configurable multi-step sequences

CREATE TABLE IF NOT EXISTS public.fb_flow_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_id       TEXT,
  name          TEXT NOT NULL,
  trigger_stage TEXT,
  steps         JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_flow_sequences_workspace
  ON public.fb_flow_sequences(workspace_id);

CREATE INDEX IF NOT EXISTS idx_fb_flow_sequences_page
  ON public.fb_flow_sequences(page_id);

CREATE INDEX IF NOT EXISTS idx_fb_flow_sequences_active
  ON public.fb_flow_sequences(is_active);

ALTER TABLE public.fb_flow_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY fb_flow_sequences_workspace_isolation
  ON public.fb_flow_sequences
  FOR ALL
  USING (
    workspace_id IS NULL
    OR workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.fb_flow_sequences IS 'Botcake-style multi-step drip sequences for Facebook conversations';
