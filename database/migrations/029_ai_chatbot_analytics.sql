-- database/migrations/029_ai_chatbot_analytics.sql
-- Migration 029: AI Chatbot Conversations and Memory Logging

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AI Conversations Log (for analytics)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  query TEXT,
  response TEXT,
  intent TEXT,
  module_context TEXT,
  model_used TEXT,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation_ai_conv" ON public.ai_conversations
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_ai_conversations_workspace ON public.ai_conversations(workspace_id);
CREATE INDEX idx_ai_conversations_session ON public.ai_conversations(session_id);


-- AI Memory (adaptive session context)
CREATE TABLE IF NOT EXISTS public.ai_memory (
  session_id TEXT PRIMARY KEY,
  memory_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service role bypasses RLS, but for good measure:
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ai_memory" ON public.ai_memory FOR ALL USING (true);
