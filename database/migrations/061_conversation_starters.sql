-- 061_conversation_starters.sql
-- Manychat/Botcake-style conversation starters (quick-reply buttons for new chats)
-- Stored as JSON array on client_facebook_page_settings

ALTER TABLE public.client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS conversation_starters JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.client_facebook_page_settings.conversation_starters IS
  'JSON array of quick-reply button labels shown to new users in Messenger (Manychat-style conversation starters). Example: ["View Products", "Check Pricing", "Talk to Agent"]';
