-- Clean duplicate Facebook page settings globally.
-- This is intentionally stricter than 068: it keeps one active settings row per page_id
-- across all workspaces, then deletes the duplicate rows after backing them up.
--
-- Apply only if a Facebook page must belong to one active Hermes workspace at a time.

CREATE TABLE IF NOT EXISTS public.client_facebook_page_settings_cleanup_backup AS
SELECT
  settings.*,
  NOW()::TIMESTAMPTZ AS backed_up_at,
  NULL::TEXT AS cleanup_reason
FROM public.client_facebook_page_settings settings
WHERE FALSE;

DROP INDEX IF EXISTS public.idx_client_fb_page_settings_one_active_page_global;

CREATE TEMP TABLE tmp_client_fb_page_settings_ranked ON COMMIT DROP AS
SELECT
  id,
  ROW_NUMBER() OVER (
    PARTITION BY page_id
    ORDER BY
      (
        CASE WHEN archived_at IS NULL THEN 1000 ELSE 0 END +
        CASE WHEN ai_enabled IS TRUE THEN 35 ELSE 0 END +
        CASE WHEN welcome_enabled IS TRUE THEN 35 ELSE 0 END +
        CASE WHEN NULLIF(BTRIM(COALESCE(knowledge_base, '')), '') IS NOT NULL THEN 30 ELSE 0 END +
        CASE WHEN NULLIF(BTRIM(COALESCE(ai_instruction, '')), '') IS NOT NULL THEN 25 ELSE 0 END +
        CASE WHEN NULLIF(BTRIM(COALESCE(welcome_message, '')), '') IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN NULLIF(BTRIM(COALESCE(page_name, '')), '') IS NOT NULL THEN 5 ELSE 0 END
      ) DESC,
      updated_at DESC NULLS LAST,
      created_at DESC NULLS LAST
  ) AS row_rank
FROM public.client_facebook_page_settings
WHERE page_id IS NOT NULL
  AND NULLIF(BTRIM(page_id), '') IS NOT NULL;

INSERT INTO public.client_facebook_page_settings_cleanup_backup
SELECT
  settings.*,
  NOW()::TIMESTAMPTZ AS backed_up_at,
  'duplicate page_id cleanup; lower-ranked duplicate deleted' AS cleanup_reason
FROM public.client_facebook_page_settings settings
JOIN tmp_client_fb_page_settings_ranked ranked
  ON ranked.id = settings.id
WHERE ranked.row_rank > 1;

DELETE FROM public.client_facebook_page_settings settings
USING tmp_client_fb_page_settings_ranked ranked
WHERE ranked.id = settings.id
  AND ranked.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_fb_page_settings_one_active_page_global
  ON public.client_facebook_page_settings (page_id)
  WHERE archived_at IS NULL
    AND page_id IS NOT NULL
    AND NULLIF(BTRIM(page_id), '') IS NOT NULL;
