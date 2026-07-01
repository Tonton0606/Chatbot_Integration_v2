-- 059_remove_customer_success_division.sql
-- Remove the "Customer Success" division from the ERP sidebar
-- customer_portal and feedback_portal are moved to Operations division
-- All other CS features (chatbot, knowledge_base, inbox, etc.) are already
-- consolidated into Social Media Hub via migration 055

-- ── 1. Move customer_portal and feedback_portal to Operations division ──
UPDATE public.erp_features
SET division_id = (SELECT id FROM public.erp_divisions WHERE division_key = 'operations' LIMIT 1)
WHERE feature_key IN ('customer_portal', 'feedback_portal')
  AND division_id = (SELECT id FROM public.erp_divisions WHERE division_key = 'customer' LIMIT 1);

-- ── 2. Hide any remaining features under the customer division ──
UPDATE public.erp_features
SET admin_visible = false, client_visible = false
WHERE division_id = (SELECT id FROM public.erp_divisions WHERE division_key = 'customer' LIMIT 1);

-- ── 3. Delete the customer division ──
-- This cascades to any remaining features still attached
DELETE FROM public.erp_divisions
WHERE division_key = 'customer' OR LOWER(title) = 'customer success';

-- ── 4. Verify no orphaned features remain ──
-- (If any features had division_id pointing to the deleted division,
--  the ON DELETE CASCADE on erp_features.division_id will have removed them)
