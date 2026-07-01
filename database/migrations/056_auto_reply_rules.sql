-- 056_auto_reply_rules.sql
-- Manychat/Botcake-style keyword-triggered auto-reply rules for Facebook pages
-- Rules are checked BEFORE AI processing for instant canned responses

CREATE TABLE IF NOT EXISTS public.fb_auto_reply_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_id         TEXT,
  trigger_keyword TEXT NOT NULL,
  trigger_match_type TEXT NOT NULL DEFAULT 'contains'
                  CHECK (trigger_match_type IN ('exact', 'contains', 'starts_with')),
  response_text   TEXT NOT NULL,
  quick_replies   JSONB DEFAULT '[]',
  is_active       BOOLEAN DEFAULT true,
  priority        INTEGER DEFAULT 0,
  match_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_auto_reply_rules_workspace
  ON public.fb_auto_reply_rules(workspace_id);

CREATE INDEX IF NOT EXISTS idx_fb_auto_reply_rules_page
  ON public.fb_auto_reply_rules(page_id);

CREATE INDEX IF NOT EXISTS idx_fb_auto_reply_rules_active
  ON public.fb_auto_reply_rules(is_active);

-- Enable RLS
ALTER TABLE public.fb_auto_reply_rules ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; this policy allows workspace owners access via anon/authenticated
CREATE POLICY fb_auto_reply_rules_workspace_isolation
  ON public.fb_auto_reply_rules
  FOR ALL
  USING (
    workspace_id IS NULL
    OR workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.fb_auto_reply_rules IS 'Keyword-triggered auto-reply rules for Facebook pages (Manychat-style)';

-- RPC function to atomically increment match_count
CREATE OR REPLACE FUNCTION public.increment_auto_reply_match_count(rule_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.fb_auto_reply_rules
  SET match_count = match_count + 1, updated_at = now()
  WHERE id = rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
