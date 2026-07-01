-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 065: Broadcast Campaigns + Conversation Tags + Sequence Scheduler
-- ═══════════════════════════════════════════════════════════════════════════════
-- Supports ManyChat/Botcake-style broadcast messaging, tag-based segmentation,
-- and timed drip sequence execution.

-- ── Broadcast Campaigns ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fb_broadcast_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    TEXT NOT NULL,
  page_id         TEXT,
  name            TEXT NOT NULL,
  message_text    TEXT NOT NULL,
  target_tags     JSONB DEFAULT '[]'::jsonb,
  target_segment  TEXT DEFAULT 'all',
  quick_replies   JSONB DEFAULT '[]'::jsonb,
  status          TEXT DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  sent_count      INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_broadcast_workspace
  ON public.fb_broadcast_campaigns (workspace_id);
CREATE INDEX IF NOT EXISTS idx_fb_broadcast_status
  ON public.fb_broadcast_campaigns (status);

-- ── Conversation Tags (for segmentation) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fb_conversation_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    TEXT NOT NULL,
  name            TEXT NOT NULL,
  color           TEXT DEFAULT '#3b82f6',
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fb_conv_tags_workspace
  ON public.fb_conversation_tags (workspace_id);

-- ── Conversation-Tag junction (many-to-many) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fb_conversation_tag_map (
  conversation_id UUID NOT NULL,
  tag_id          UUID NOT NULL,
  applied_at      TIMESTAMPTZ DEFAULT now(),
  applied_by      TEXT DEFAULT 'auto',
  PRIMARY KEY (conversation_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_fb_conv_tag_map_conv
  ON public.fb_conversation_tag_map (conversation_id);
CREATE INDEX IF NOT EXISTS idx_fb_conv_tag_map_tag
  ON public.fb_conversation_tag_map (tag_id);

-- ── Sequence execution log (tracks drip step sends) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.fb_sequence_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id     UUID NOT NULL,
  conversation_id UUID NOT NULL,
  customer_psid   TEXT NOT NULL,
  page_id         TEXT,
  workspace_id    TEXT NOT NULL,
  step_index      INTEGER NOT NULL DEFAULT 0,
  status          TEXT DEFAULT 'pending',
  scheduled_for   TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sequence_id, conversation_id, step_index)
);

CREATE INDEX IF NOT EXISTS idx_fb_seq_exec_pending
  ON public.fb_sequence_executions (status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_fb_seq_exec_workspace
  ON public.fb_sequence_executions (workspace_id);

-- ── Add tags array to conversations for quick filtering ─────────────────────
ALTER TABLE public.client_facebook_conversations
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- ── Add lead_score and sentiment to conversations ───────────────────────────
ALTER TABLE public.client_facebook_conversations
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_priority TEXT DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS last_intent TEXT;

-- ── Enable RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.fb_broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_conversation_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_sequence_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies (workspace-scoped)
DO $$
BEGIN
  CREATE POLICY fb_broadcast_workspace_isolation
    ON public.fb_broadcast_campaigns
    USING (workspace_id = current_setting('app.current_workspace', true));
  CREATE POLICY fb_conv_tags_workspace_isolation
    ON public.fb_conversation_tags
    USING (workspace_id = current_setting('app.current_workspace', true));
  CREATE POLICY fb_seq_exec_workspace_isolation
    ON public.fb_sequence_executions
    USING (workspace_id = current_setting('app.current_workspace', true));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
