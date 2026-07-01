-- ============================================
-- MIGRATION 066: MOVE "AI ASSISTANT" TO THE INTELLIGENCE NAV
-- ============================================
-- The AI Assistant (AdminChatbot) was surfaced only as a tab inside the
-- Social Media Hub. This registers it as a first-class feature under the
-- Intelligence division so it appears in the Intelligence module nav.
-- Admin-only (admin nav); route: /Admin/Intelligence/AIAssistant.
-- Idempotent — safe to run more than once.

DO $$
DECLARE
  v_division_id UUID;
  v_feature_exists BOOLEAN;
BEGIN
  -- Find the Intelligence division.
  SELECT id INTO v_division_id
  FROM erp_divisions
  WHERE division_key = 'intelligence'
     OR lower(title) = 'intelligence'
  LIMIT 1;

  IF v_division_id IS NULL THEN
    INSERT INTO erp_divisions (
      division_key, title, icon, description,
      order_index, admin_visible, client_visible, status
    ) VALUES (
      'intelligence', 'Intelligence', 'Brain',
      'Analytics, forecasting, and AI-driven insights.',
      40, true, true, 'active'
    )
    RETURNING id INTO v_division_id;
  END IF;

  -- Register / move the ai_assistant feature under Intelligence.
  SELECT EXISTS (
    SELECT 1 FROM erp_features WHERE feature_key = 'ai_assistant'
  ) INTO v_feature_exists;

  IF v_feature_exists THEN
    UPDATE erp_features
    SET division_id    = v_division_id,
        label          = 'AI Assistant',
        icon           = 'Brain',
        description     = 'Conversational AI assistant.',
        admin_route    = '/Admin/Intelligence/AIAssistant',
        admin_visible   = true,
        client_visible  = false,
        status          = 'active',
        order_index     = 10
    WHERE feature_key = 'ai_assistant';
  ELSE
    INSERT INTO erp_features (
      division_id, feature_key, label, icon, description,
      admin_route, client_route, admin_visible, client_visible,
      status, auto_enable_with_division, order_index
    ) VALUES (
      v_division_id, 'ai_assistant', 'AI Assistant', 'Brain',
      'Conversational AI assistant.',
      '/Admin/Intelligence/AIAssistant', NULL, true, false,
      'active', false, 10
    );
  END IF;
END $$;
