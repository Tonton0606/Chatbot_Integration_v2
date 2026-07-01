-- Fix: Profiles RLS Policy for User Registration
-- This fixes the "new row violates row-level security policy for table profiles" error

-- ============================================
-- FIX 1: Allow users to create their own profile on signup
-- ============================================

-- Drop existing insert policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new insert policy - allows users to create their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- FIX 2: Ensure update policy exists
-- ============================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- FIX 3: Allow admins to manage all profiles
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'Admin'
    )
  );

-- ============================================
-- FIX 4: Ensure select policy exists
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- ALTERNATIVE: Disable RLS temporarily if needed (NOT RECOMMENDED for production)
-- ============================================
-- Uncomment the line below ONLY if the above doesn't work
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check all policies on profiles table
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
