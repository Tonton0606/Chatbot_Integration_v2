-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  EXPONIFY ADAPTIVE AI BRAIN — Database Schema
--  Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── 1. Conversation History ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text NOT NULL,
  workspace_id    uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role            text NOT NULL CHECK (role IN ('admin','client','landing')),
  query           text,
  response        text,
  intent          text,
  module_context  text,
  model_used      text,
  source          text DEFAULT 'groq',
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_conversations_session_idx ON public.ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS ai_conversations_workspace_idx ON public.ai_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS ai_conversations_created_idx ON public.ai_conversations(created_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_service_role" ON public.ai_conversations
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 2. Session Memory ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text NOT NULL UNIQUE,
  memory_data  jsonb DEFAULT '{}',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_memory_session_idx ON public.ai_memory(session_id);

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_memory_service_role" ON public.ai_memory
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 3. Feedback Loop ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,
  query       text,
  response    text,
  rating      text NOT NULL,         -- "thumbs_up" | "thumbs_down"
  comment     text,
  role        text DEFAULT 'admin',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_feedback_session_idx ON public.ai_feedback(session_id);
CREATE INDEX IF NOT EXISTS ai_feedback_rating_idx ON public.ai_feedback(rating);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_feedback_service_role" ON public.ai_feedback
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 4. Training Log (future adaptive training) ───────────────────────
CREATE TABLE IF NOT EXISTS public.ai_training (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_text    text,
  output_text   text,
  label         text,
  source        text DEFAULT 'feedback',
  approved      boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_training_service_role" ON public.ai_training
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 5. Knowledge Base Overrides (admin-editable KB) ──────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  content     text NOT NULL,
  category    text DEFAULT 'general',
  tags        text[] DEFAULT '{}',
  active      boolean DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_base_category_idx ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS knowledge_base_active_idx ON public.knowledge_base(active);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_base_service_role" ON public.knowledge_base
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin read for authenticated users
CREATE POLICY "knowledge_base_admin_read" ON public.knowledge_base
  FOR SELECT USING (auth.uid() IS NOT NULL AND active = true);

-- ── Done ─────────────────────────────────────────────────────────────
-- Verify: SELECT table_name FROM information_schema.tables
--         WHERE table_schema = 'public'
--         AND table_name LIKE 'ai_%' OR table_name = 'knowledge_base';
