-- 038_fb_page_settings_knowledge_base.sql
-- Adds a dedicated free-form Knowledge Base field to Facebook page settings.
-- The chatbot's knowledge manager already reads `knowledge_base` (and
-- `admin_knowledge`) when merging context for the LLM; this exposes the
-- authoring side so page owners can edit it from the settings form.

ALTER TABLE public.client_facebook_page_settings
  ADD COLUMN IF NOT EXISTS knowledge_base text;

COMMENT ON COLUMN public.client_facebook_page_settings.knowledge_base IS
  'Free-form reference knowledge the AI uses to answer customers when no approved FAQ matches.';
