-- database/migrations/044_ai_chatbot_settings.sql

CREATE TABLE IF NOT EXISTS public.ai_chatbot_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  model TEXT DEFAULT 'llama-3.3-70b-versatile',
  temperature DECIMAL(3, 2) DEFAULT 0.3,
  max_tokens INTEGER DEFAULT 700,
  language TEXT DEFAULT 'auto',
  fallback_enabled BOOLEAN DEFAULT true,
  routing_enabled BOOLEAN DEFAULT true,
  history_depth INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_chatbot_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.ai_chatbot_settings;
CREATE POLICY "workspace_isolation" ON public.ai_chatbot_settings
  FOR ALL USING (
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_ai_chatbot_settings_workspace ON public.ai_chatbot_settings(workspace_id);
