-- 060_hide_facebook_override_from_marketing.sql
-- Hide the standalone "Facebook Connect Override" feature from the Marketing sidebar
-- It is now accessible via Social Media Hub → Connections tab (with workspace override support)

-- ── 1. Hide any facebook override / facebook_connect_override features from sidebar ──
UPDATE public.erp_features
SET admin_visible = false, client_visible = false
WHERE feature_key IN (
  'facebook_connect_override',
  'facebook_override',
  'facebook_connect'
);

-- ── 2. Ensure Social Media Hub is visible under Marketing division ──
-- (It was added in migration 055, but make sure it's still visible)
UPDATE public.erp_features
SET admin_visible = true, client_visible = true, status = 'active'
WHERE feature_key = 'social_media_hub';
