-- 064_chatbot_automation_enhancements.sql
-- Add ManyChat/Botcake-inspired columns to client_facebook_page_settings

ALTER TABLE public.client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS business_hours_enabled  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_hours_start    TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS business_hours_end      TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS business_hours_timezone TEXT DEFAULT 'Asia/Manila',
  ADD COLUMN IF NOT EXISTS business_hours_days     JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
  ADD COLUMN IF NOT EXISTS away_message            TEXT,
  ADD COLUMN IF NOT EXISTS response_delay_seconds  INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS handoff_enabled         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_message         TEXT,
  ADD COLUMN IF NOT EXISTS handoff_keywords        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_model                TEXT DEFAULT 'llama-3.3-70b-versatile',
  ADD COLUMN IF NOT EXISTS ai_language             TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS ai_temperature          NUMERIC DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS auto_tag_conversations  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sentiment_analysis      BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.client_facebook_page_settings.business_hours_enabled IS 'When true, bot uses away_message outside business_hours_start/end';
COMMENT ON COLUMN public.client_facebook_page_settings.business_hours_days IS 'JSON array of weekday numbers (1=Mon..7=Sun) when business is open';
COMMENT ON COLUMN public.client_facebook_page_settings.response_delay_seconds IS 'Simulated typing delay before bot replies — human-like behavior';
COMMENT ON COLUMN public.client_facebook_page_settings.handoff_enabled IS 'When true, bot hands off to human agent if handoff_keywords matched or AI confidence low';
COMMENT ON COLUMN public.client_facebook_page_settings.handoff_keywords IS 'JSON array of keywords that trigger human handoff, e.g. ["agent","human","manager"]';
COMMENT ON COLUMN public.client_facebook_page_settings.ai_model IS 'AI model used for chatbot responses';
COMMENT ON COLUMN public.client_facebook_page_settings.ai_language IS 'Primary language for AI responses (en, fil, tl)';
COMMENT ON COLUMN public.client_facebook_page_settings.ai_temperature IS 'AI creativity 0.0-1.0 — higher = more creative';
