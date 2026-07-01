-- 062_fix_social_media_hub_route.sql
-- Fix: social_media_hub feature may have been deleted by migration 059
-- (ON DELETE CASCADE when customer division was deleted) or may have
-- a wrong admin_route. This migration ensures the feature exists with
-- the correct route and is visible in the sidebar.

-- ── 1. Find the best division for Social Media Hub ──
-- Try marketing first, then operations, then any visible division
DO $$
DECLARE
  v_division_id UUID;
  v_feature_exists BOOLEAN;
BEGIN
  -- Try marketing division
  SELECT id INTO v_division_id
  FROM public.erp_divisions
  WHERE division_key = 'marketing' OR LOWER(title) = 'marketing'
  LIMIT 1;

  -- Fallback to operations
  IF v_division_id IS NULL THEN
    SELECT id INTO v_division_id
    FROM public.erp_divisions
    WHERE division_key = 'operations' OR LOWER(title) = 'operations'
    LIMIT 1;
  END IF;

  -- Fallback to first available visible division
  IF v_division_id IS NULL THEN
    SELECT id INTO v_division_id
    FROM public.erp_divisions
    WHERE status = 'active' AND admin_visible = true
    ORDER BY order_index ASC
    LIMIT 1;
  END IF;

  IF v_division_id IS NULL THEN
    RAISE NOTICE 'No suitable division found — skipping migration';
    RETURN;
  END IF;

  -- ── 2. Check if social_media_hub feature exists ──
  SELECT EXISTS (
    SELECT 1 FROM public.erp_features WHERE feature_key = 'social_media_hub'
  ) INTO v_feature_exists;

  IF v_feature_exists THEN
    UPDATE public.erp_features SET
      division_id    = v_division_id,
      label          = 'Social Media Hub',
      icon           = 'Megaphone',
      description    = 'Unified inbox, AI chatbot, ad campaigns, channel connections, and knowledge base for all social media channels.',
      admin_route    = '/Admin/SocialMediaHub',
      client_route   = '/Admin/SocialMediaHub',
      admin_visible  = true,
      client_visible = true,
      status         = 'active',
      auto_enable_with_division = true,
      order_index    = 5
    WHERE feature_key = 'social_media_hub';
  ELSE
    INSERT INTO public.erp_features (
      division_id, feature_key, label, icon, description,
      admin_route, client_route, admin_visible, client_visible,
      status, auto_enable_with_division, order_index
    ) VALUES (
      v_division_id, 'social_media_hub', 'Social Media Hub', 'Megaphone',
      'Unified inbox, AI chatbot, ad campaigns, channel connections, and knowledge base for all social media channels.',
      '/Admin/SocialMediaHub', '/Admin/SocialMediaHub', true, true,
      'active', true, 5
    );
  END IF;

  -- ── 3. Ensure workspace_feature_access exists for all workspaces ──
  INSERT INTO public.workspace_feature_access (workspace_id, feature_key, is_enabled)
  SELECT w.id, 'social_media_hub', true
  FROM public.workspaces w
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_feature_access wfa
    WHERE wfa.workspace_id = w.id
      AND wfa.feature_key = 'social_media_hub'
  );

  RAISE NOTICE 'Social Media Hub feature fixed: route=/Admin/SocialMediaHub, visible=true';
END $$;
