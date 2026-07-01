-- 039_fb_page_settings_comment_automation.sql
-- Adds per-page comment-automation controls to Facebook page settings.
-- Used by the webhook `feed` handler + facebookCommentAutomation to decide
-- whether (and how) to auto-reply to post/livestream comments and open a DM.

ALTER TABLE public.client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS comment_automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comment_reply_template text,
  ADD COLUMN IF NOT EXISTS comment_keyword_filter text;

COMMENT ON COLUMN public.client_facebook_page_settings.comment_automation_enabled IS
  'When true, the bot auto-replies to new comments and opens a Messenger thread via private reply.';
COMMENT ON COLUMN public.client_facebook_page_settings.comment_reply_template IS
  'Optional custom public comment reply. Falls back to a localized default when empty.';
COMMENT ON COLUMN public.client_facebook_page_settings.comment_keyword_filter IS
  'Optional comma/newline-separated keywords; only comments containing one auto-reply. Empty = all comments.';
