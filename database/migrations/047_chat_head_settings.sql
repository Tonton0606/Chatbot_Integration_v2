-- database/migrations/047_chat_head_settings.sql

-- Add Chat Head configuration columns to ai_chatbot_settings
ALTER TABLE public.ai_chatbot_settings 
ADD COLUMN IF NOT EXISTS chat_head_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS chat_head_config JSONB DEFAULT '{}';
