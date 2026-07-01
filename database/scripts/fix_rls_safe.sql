-- FIX RLS POLICIES - Safe Helper Function Approach
-- Run this in Supabase SQL Editor

-- 1. Create safe helper function
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- 2. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- 3. Create new safe policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (
  id = auth.uid()
  OR public.current_user_role() IN ('Admin', 'SuperAdmin')
);

-- SuperAdmin has full access
CREATE POLICY "SuperAdmin full access"
ON public.profiles FOR ALL
USING (public.current_user_role() = 'SuperAdmin')
WITH CHECK (public.current_user_role() = 'SuperAdmin');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow trigger to insert profiles (service role)
CREATE POLICY "Service role can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- 4. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';
