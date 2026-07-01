-- database/migrations/030_ai_voice_command_settings.sql

-- Add Voice Command configuration columns to ai_chatbot_settings
ALTER TABLE public.ai_chatbot_settings 
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voice_response_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS wake_word TEXT DEFAULT 'Hey Exponify',
ADD COLUMN IF NOT EXISTS voice_language TEXT DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS voice_sensitivity INTEGER DEFAULT 50;
