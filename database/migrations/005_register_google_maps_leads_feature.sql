-- ============================================
-- MIGRATION 005: REGISTER GOOGLE MAPS LEADS IN ERP REGISTRY
-- ============================================
-- The client sidebar + route guard are driven by the ERP registry tables
-- (erp_divisions / erp_features) and per-workspace feature access
-- (workspace_feature_access), NOT by client/src/constants/modules.js.
--
-- Migration 004 created the data tables but never registered the feature,
-- so the module was unreachable from the UI (sidebar hid it and the route
-- guard redirected to /unauthorized).
--
-- This migration:
--   1. Ensures a "Marketing" division exists (client-visible).
--   2. Registers the google_maps_leads feature under it (active, client_route).
--   3. Enables the feature for every existing workspace.
--
-- Idempotent: safe to re-run.

DO $$
DECLARE
  v_division_id UUID;
  v_feature_exists BOOLEAN;
BEGIN
  -- 1. Find or create the Marketing division --------------------------------
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
    RAISE NOTICE 'Created Marketing division %', v_division_id;
  ELSE
    -- Make sure it is client-visible and active so the section renders.
    UPDATE erp_divisions
    SET client_visible = true, status = 'active'
    WHERE id = v_division_id;
  END IF;

  -- 2. Register the google_maps_leads feature -------------------------------
  SELECT EXISTS (
    SELECT 1 FROM erp_features WHERE feature_key = 'google_maps_leads'
  ) INTO v_feature_exists;

  IF v_feature_exists THEN
    UPDATE erp_features
    SET division_id   = v_division_id,
        label         = 'Google Maps Leads',
        icon          = 'MapPin',
        description    = 'Find & enrich local business leads from Google Maps using AI.',
        admin_route   = '/Admin/GoogleMapsLeads',
        client_route  = '/Client/GoogleMapsLeads',
        client_visible = true,
        admin_visible  = true,
        status        = 'active',
        order_index   = 10
    WHERE feature_key = 'google_maps_leads';
  ELSE
    INSERT INTO erp_features (
      division_id, feature_key, label, icon, description,
      admin_route, client_route, admin_visible, client_visible,
      status, auto_enable_with_division, order_index
    ) VALUES (
      v_division_id, 'google_maps_leads', 'Google Maps Leads', 'MapPin',
      'Find & enrich local business leads from Google Maps using AI.',
      '/Admin/GoogleMapsLeads', '/Client/GoogleMapsLeads', true, true,
      'active', false, 10
    );
  END IF;

  -- 3. Enable for every existing workspace ----------------------------------
  INSERT INTO workspace_feature_access (workspace_id, feature_key, is_enabled)
  SELECT w.id, 'google_maps_leads', true
  FROM workspaces w
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_feature_access wfa
    WHERE wfa.workspace_id = w.id
      AND wfa.feature_key = 'google_maps_leads'
  );

  RAISE NOTICE 'google_maps_leads feature registered and enabled for all workspaces.';
END $$;
