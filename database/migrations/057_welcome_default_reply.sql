-- 057_welcome_default_reply.sql
-- Manychat/Botcake-style welcome message and default reply for Facebook pages
-- Welcome message: sent on first contact (new conversation)
-- Default reply: fallback when no keyword rule matches AND AI fails

ALTER TABLE public.fb_pages
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS welcome_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_reply TEXT;

ALTER TABLE public.client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS welcome_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_reply TEXT;

COMMENT ON COLUMN fb_pages.welcome_message IS 'Manychat-style welcome message sent on first contact';
COMMENT ON COLUMN fb_pages.welcome_enabled IS 'Toggle for welcome message auto-send on new conversation';
COMMENT ON COLUMN fb_pages.default_reply IS 'Fallback reply when no keyword rule matches and AI fails';
