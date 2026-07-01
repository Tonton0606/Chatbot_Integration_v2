-- Restore the strongest backed-up Facebook page settings row when cleanup kept
-- a weaker active row. This is intentionally merge-based: it restores the
-- configured Builder fields without recreating duplicate page_id rows.
--
-- Run after reviewing the preview query below in Supabase.

-- Preview candidates first:
-- SELECT
--   page_id,
--   page_name,
--   workspace_id,
--   ai_enabled,
--   welcome_enabled,
--   LEFT(COALESCE(ai_instruction, ''), 120) AS ai_instruction_preview,
--   LEFT(COALESCE(knowledge_base, ''), 120) AS knowledge_base_preview,
--   LEFT(COALESCE(welcome_message, ''), 120) AS welcome_message_preview,
--   updated_at,
--   backed_up_at,
--   (
--     CASE WHEN ai_enabled IS TRUE THEN 35 ELSE 0 END +
--     CASE WHEN welcome_enabled IS TRUE THEN 35 ELSE 0 END +
--     CASE WHEN NULLIF(BTRIM(COALESCE(knowledge_base, '')), '') IS NOT NULL THEN 30 ELSE 0 END +
--     CASE WHEN NULLIF(BTRIM(COALESCE(ai_instruction, '')), '') IS NOT NULL THEN 25 ELSE 0 END +
--     CASE WHEN NULLIF(BTRIM(COALESCE(welcome_message, '')), '') IS NOT NULL THEN 20 ELSE 0 END +
--     CASE WHEN NULLIF(BTRIM(COALESCE(page_name, '')), '') IS NOT NULL THEN 5 ELSE 0 END
--   ) AS config_score
-- FROM public.client_facebook_page_settings_cleanup_backup
-- ORDER BY page_id, config_score DESC, updated_at DESC NULLS LAST;

WITH backed_up_candidates AS (
  SELECT
    backup.*,
    (
      CASE WHEN backup.ai_enabled IS TRUE THEN 35 ELSE 0 END +
      CASE WHEN backup.welcome_enabled IS TRUE THEN 35 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(backup.knowledge_base, '')), '') IS NOT NULL THEN 30 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(backup.ai_instruction, '')), '') IS NOT NULL THEN 25 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(backup.welcome_message, '')), '') IS NOT NULL THEN 20 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(backup.page_name, '')), '') IS NOT NULL THEN 5 ELSE 0 END
    ) AS config_score
  FROM public.client_facebook_page_settings_cleanup_backup backup
  WHERE backup.page_id IS NOT NULL
    AND NULLIF(BTRIM(backup.page_id), '') IS NOT NULL
),
best_backup AS (
  SELECT DISTINCT ON (page_id)
    *
  FROM backed_up_candidates
  ORDER BY page_id, config_score DESC, updated_at DESC NULLS LAST, backed_up_at DESC NULLS LAST
),
current_scores AS (
  SELECT
    settings.id,
    settings.page_id,
    (
      CASE WHEN settings.ai_enabled IS TRUE THEN 35 ELSE 0 END +
      CASE WHEN settings.welcome_enabled IS TRUE THEN 35 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(settings.knowledge_base, '')), '') IS NOT NULL THEN 30 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(settings.ai_instruction, '')), '') IS NOT NULL THEN 25 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(settings.welcome_message, '')), '') IS NOT NULL THEN 20 ELSE 0 END +
      CASE WHEN NULLIF(BTRIM(COALESCE(settings.page_name, '')), '') IS NOT NULL THEN 5 ELSE 0 END
    ) AS config_score
  FROM public.client_facebook_page_settings settings
  WHERE settings.page_id IS NOT NULL
    AND NULLIF(BTRIM(settings.page_id), '') IS NOT NULL
)
UPDATE public.client_facebook_page_settings settings
SET
  workspace_id = backup.workspace_id,
  page_name = backup.page_name,
  business_type = backup.business_type,
  business_description = backup.business_description,
  products_services = backup.products_services,
  product_service_price_ranges = backup.product_service_price_ranges,
  knowledge_base = backup.knowledge_base,
  website_link = backup.website_link,
  booking_link = backup.booking_link,
  shoppe_link = backup.shoppe_link,
  lazada_link = backup.lazada_link,
  fallback_mode = backup.fallback_mode,
  ai_enabled = backup.ai_enabled,
  faq_enabled = backup.faq_enabled,
  suggestions_enabled = backup.suggestions_enabled,
  human_handoff_enabled = backup.human_handoff_enabled,
  owner_notification_enabled = backup.owner_notification_enabled,
  ai_instruction = backup.ai_instruction,
  welcome_message = backup.welcome_message,
  welcome_enabled = backup.welcome_enabled,
  default_reply = backup.default_reply,
  conversation_starters = backup.conversation_starters,
  business_hours_enabled = backup.business_hours_enabled,
  business_hours_start = backup.business_hours_start,
  business_hours_end = backup.business_hours_end,
  business_hours_timezone = backup.business_hours_timezone,
  business_hours_days = backup.business_hours_days,
  away_message = backup.away_message,
  response_delay_seconds = backup.response_delay_seconds,
  handoff_enabled = backup.handoff_enabled,
  handoff_message = backup.handoff_message,
  handoff_keywords = backup.handoff_keywords,
  ai_model = backup.ai_model,
  ai_language = backup.ai_language,
  ai_temperature = backup.ai_temperature,
  auto_tag_conversations = backup.auto_tag_conversations,
  sentiment_analysis = backup.sentiment_analysis,
  archived_at = NULL,
  updated_at = NOW()
FROM best_backup backup
JOIN current_scores current
  ON current.page_id = backup.page_id
WHERE settings.id = current.id
  AND backup.config_score > current.config_score;
