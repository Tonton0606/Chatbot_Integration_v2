-- 055_social_media_hub_consolidation.sql
-- Consolidates 5 separate social media modules into a single Social Media Hub
-- Old feature keys are hidden from sidebar but kept enabled for backwards compatibility
-- New feature: social_media_hub (replaces facebook_connect, ai_chatbot_tester, social_media_ads, omni_channel_inbox)

DO $$
DECLARE
  v_division_id UUID;
  v_feature_exists BOOLEAN;
BEGIN
  -- Find the Marketing division
  SELECT id INTO v_division_id
  FROM public.erp_divisions
  WHERE division_key = 'marketing' OR LOWER(title) = 'marketing'
  LIMIT 1;

  IF v_division_id IS NULL THEN
    SELECT id INTO v_division_id
    FROM public.erp_divisions
    WHERE division_key = 'customer' OR LOWER(title) = 'customer success'
    LIMIT 1;
  END IF;

  IF v_division_id IS NULL THEN
    RAISE NOTICE 'No Marketing or Customer division found — skipping migration';
    RETURN;
  END IF;

  -- ── 1. Register the new social_media_hub feature ──
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

  -- ── 2. Hide old feature keys from sidebar (keep enabled for backwards compat) ──
  -- Old routes redirect to SocialMediaHub tabs, so features still work
  -- We set admin_visible=false and client_visible=false to remove from sidebar
  -- Includes: facebook_connect, ai_chatbot_tester, social_media_ads, omni_channel_inbox
  --           chatbot (AI Chatbot), knowledge_base (KB Articles)
  UPDATE public.erp_features
  SET admin_visible = false, client_visible = false
  WHERE feature_key IN (
    'facebook_connect',
    'ai_chatbot_tester',
    'social_media_ads',
    'omni_channel_inbox',
    'chatbot',
    'knowledge_base'
  );

  -- ── 3. Enable social_media_hub for all existing workspaces ──
  INSERT INTO public.workspace_feature_access (workspace_id, feature_key, is_enabled)
  SELECT w.id, 'social_media_hub', true
  FROM public.workspaces w
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_feature_access wfa
    WHERE wfa.workspace_id = w.id
      AND wfa.feature_key = 'social_media_hub'
  );

  RAISE NOTICE 'Social Media Hub consolidation complete. Old features hidden, new hub enabled for all workspaces.';
END $$;
