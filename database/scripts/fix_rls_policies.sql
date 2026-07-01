-- ============================================
-- FIX RLS POLICIES FOR SIGNUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Fix: Allow new users to insert their own profile during signup
CREATE POLICY IF NOT EXISTS "allow_insert_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Alternative: Disable RLS on profiles temporarily for testing
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Or create a service role policy for the trigger
CREATE POLICY IF NOT EXISTS "service_role_all" ON profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Check if trigger exists and is working
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  CASE tgenabled 
    WHEN 'O' THEN 'Origin' 
    WHEN 'D' THEN 'Disabled' 
    WHEN 'R' THEN 'Replica' 
    WHEN 'A' THEN 'Always' 
  END AS status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Test the trigger manually (optional)
-- SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 1;
-- Check if corresponding profile exists:
-- SELECT * FROM profiles WHERE id = 'USER_ID_FROM_ABOVE';
