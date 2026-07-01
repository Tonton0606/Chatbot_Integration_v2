-- ============================================
-- MIGRATION 017: AI CHATBOT TESTER INTEGRATION
-- ============================================
-- 1. Add ai_instruction column to public.fb_pages table
ALTER TABLE public.fb_pages
ADD COLUMN IF NOT EXISTS ai_instruction TEXT;

-- 2. Register the ai_chatbot_tester feature under the Marketing division
DO $$
DECLARE
  v_division_id UUID;
  v_feature_exists BOOLEAN;
BEGIN
  -- Find the Marketing division
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

  -- Register the ai_chatbot_tester feature
  SELECT EXISTS (
    SELECT 1 FROM erp_features WHERE feature_key = 'ai_chatbot_tester'
  ) INTO v_feature_exists;

  IF v_feature_exists THEN
    UPDATE erp_features
    SET division_id   = v_division_id,
        label         = 'AI Chatbot Tester',
        icon          = 'Bot',
        description    = 'Test AI chatbot responses locally with custom instructions.',
        admin_route   = '/Admin/AIChatbotTester',
        client_route  = '/Admin/AIChatbotTester',
        client_visible = true,
        admin_visible  = true,
        status        = 'active',
        order_index   = 20
    WHERE feature_key = 'ai_chatbot_tester';
  ELSE
    INSERT INTO erp_features (
      division_id, feature_key, label, icon, description,
      admin_route, client_route, admin_visible, client_visible,
      status, auto_enable_with_division, order_index
    ) VALUES (
      v_division_id, 'ai_chatbot_tester', 'AI Chatbot Tester', 'Bot',
      'Test AI chatbot responses locally with custom instructions.',
      '/Admin/AIChatbotTester', '/Admin/AIChatbotTester', true, true,
      'active', true, 20
    );
  END IF;

  -- Enable for every existing workspace
  INSERT INTO workspace_feature_access (workspace_id, feature_key, is_enabled)
  SELECT w.id, 'ai_chatbot_tester', true
  FROM workspaces w
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_feature_access wfa
    WHERE wfa.workspace_id = w.id
      AND wfa.feature_key = 'ai_chatbot_tester'
  );
END $$;
