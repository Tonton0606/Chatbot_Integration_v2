-- Dedupe active Facebook page settings rows before enforcing one active row per page.
-- Review the ranked query output in staging before applying this to production.

WITH ranked_settings AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, page_id
      ORDER BY
        (
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
  WHERE archived_at IS NULL
    AND page_id IS NOT NULL
    AND NULLIF(BTRIM(page_id), '') IS NOT NULL
)
UPDATE public.client_facebook_page_settings settings
SET
  archived_at = NOW(),
  updated_at = NOW()
FROM ranked_settings ranked
WHERE settings.id = ranked.id
  AND ranked.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_fb_page_settings_one_active_page
  ON public.client_facebook_page_settings (workspace_id, page_id)
  WHERE archived_at IS NULL
    AND page_id IS NOT NULL
    AND NULLIF(BTRIM(page_id), '') IS NOT NULL;
