-- Migration 054: Register Omni-Channel Inbox in ERP sidebar navigation
--
-- Adds the Omni-Channel Inbox feature under the Marketing division so
-- it appears in the admin sidebar navigation.

DO $$
DECLARE
  v_division_id UUID;
  v_feature_exists BOOLEAN;
BEGIN
  -- Find the Marketing division (or Communication Hub)
  SELECT id INTO v_division_id
  FROM erp_divisions
  WHERE division_key = 'marketing'
     OR lower(title) = 'marketing'
  LIMIT 1;

  IF v_division_id IS NULL THEN
    INSERT INTO erp_divisions (
      division_key, title, icon, description,
      order_index, admin_visible, client_visible, status
    ) VALUES (
      'marketing', 'Marketing', 'Megaphone',
      'Campaigns, lead generation, and outreach tools.',
      55, true, true, 'active'
    )
    RETURNING id INTO v_division_id;
  END IF;

  -- Register the omni_channel_inbox feature
  SELECT EXISTS (
    SELECT 1 FROM erp_features WHERE feature_key = 'omni_channel_inbox'
  ) INTO v_feature_exists;

  IF v_feature_exists THEN
    UPDATE erp_features
    SET division_id   = v_division_id,
        label         = 'Omni-Channel Inbox',
        icon          = 'MessageSquare',
        description   = 'Unified inbox for Instagram, TikTok, Shopee, and Lazada chatbot conversations.',
        admin_route   = '/Admin/OmniChannelInbox',
        client_route  = '/Admin/OmniChannelInbox',
        client_visible = true,
        admin_visible  = true,
        status        = 'active',
        order_index   = 15
    WHERE feature_key = 'omni_channel_inbox';
  ELSE
    INSERT INTO erp_features (
      division_id, feature_key, label, icon, description,
      admin_route, client_route, admin_visible, client_visible,
      status, auto_enable_with_division, order_index
    ) VALUES (
      v_division_id, 'omni_channel_inbox', 'Omni-Channel Inbox', 'MessageSquare',
      'Unified inbox for Instagram, TikTok, Shopee, and Lazada chatbot conversations.',
      '/Admin/OmniChannelInbox', '/Admin/OmniChannelInbox', true, true,
      'active', true, 15
    );
  END IF;

  -- Enable for every existing workspace
  INSERT INTO workspace_feature_access (workspace_id, feature_key, is_enabled)
  SELECT w.id, 'omni_channel_inbox', true
  FROM workspaces w
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_feature_access wfa
    WHERE wfa.workspace_id = w.id
      AND wfa.feature_key = 'omni_channel_inbox'
  );
END $$;
