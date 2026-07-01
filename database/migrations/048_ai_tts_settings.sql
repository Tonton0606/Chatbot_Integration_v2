-- database/migrations/048_ai_tts_settings.sql

-- Add TTS Settings column to ai_chatbot_settings
ALTER TABLE public.ai_chatbot_settings 
ADD COLUMN IF NOT EXISTS tts_settings JSONB DEFAULT '{}';
