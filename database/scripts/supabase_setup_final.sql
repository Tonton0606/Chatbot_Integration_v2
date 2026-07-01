-- ============================================
-- BULLETPROOF SUPABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Clean slate (drop everything first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS demo_bookings CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'User' CHECK (role IN ('SuperAdmin', 'Admin', 'User')),
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
-- Users can only see their own profile
CREATE POLICY "users_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "users_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Admins and SuperAdmins can see all profiles
CREATE POLICY "admins_select_all" ON profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() 
    AND p.role IN ('Admin', 'SuperAdmin')
  ));

-- SuperAdmins can do everything
CREATE POLICY "superadmin_all" ON profiles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() 
    AND p.role = 'SuperAdmin'
  ));

-- Step 4: Create the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'User'),
    NULLIF(NEW.raw_user_meta_data->>'company_name', '')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block auth
  RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 5: Attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 6: Create other tables

-- Security logs
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_logs_admin" ON security_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin')
  ));

-- Demo bookings
CREATE TABLE demo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  meeting_platform TEXT DEFAULT 'Zoom',
  preferred_date DATE,
  preferred_time TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'demo_done', 'converted', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE demo_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_bookings_admin" ON demo_bookings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin')
  ));

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'qualified', 'proposal', 'contracting', 'won', 'lost')),
  assigned_to UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_admin" ON customers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin')
  ));

-- ============================================
-- SETUP COMPLETE - Test by creating an account
-- ============================================
