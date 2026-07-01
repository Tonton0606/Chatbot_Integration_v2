-- ============================================
-- CHECK SUPABASE RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if RLS is enabled on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 2. List all RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if trigger exists
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled_status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 5. Check trigger function
SELECT 
  proname AS function_name,
  prosrc AS function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 6. Count users and profiles
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM auth.users u 
   LEFT JOIN public.profiles p ON u.id = p.id 
   WHERE p.id IS NULL) AS users_without_profiles;
