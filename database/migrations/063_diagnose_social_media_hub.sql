-- 063_diagnose_social_media_hub.sql
-- Diagnostic: Check the actual state of social_media_hub and related features
-- Run this in Supabase SQL editor to see what's in the database

SELECT 
  feature_key,
  label,
  admin_route,
  admin_visible,
  client_visible,
  status,
  division_id,
  order_index
FROM public.erp_features
WHERE feature_key LIKE '%social%' OR feature_key LIKE '%facebook%' OR label ILIKE '%social%'
ORDER BY order_index;

-- Also check divisions
SELECT 
  division_key,
  title,
  status,
  admin_visible
FROM public.erp_divisions
ORDER BY order_index;

-- Check workspace_feature_access for social_media_hub
SELECT 
  workspace_id,
  feature_key,
  is_enabled
FROM public.workspace_feature_access
WHERE feature_key = 'social_media_hub'
LIMIT 10;
