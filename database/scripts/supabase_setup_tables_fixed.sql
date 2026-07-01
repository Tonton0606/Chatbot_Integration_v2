-- ============================================
-- SUPABASE SETUP (IDEMPOTENT VERSION)
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABLE (Required for user roles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'User' CHECK (role IN ('SuperAdmin', 'Admin', 'User')),
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to avoid errors)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "SuperAdmin full access" ON profiles;

-- Profiles RLS Policies
-- Users: Can only view/update their own profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id);

-- Admin & SuperAdmin: Can view all profiles
CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin')
  ));

-- SuperAdmin: Full access to all profiles
CREATE POLICY "SuperAdmin full access" 
  ON profiles FOR ALL 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SuperAdmin'
  ));

-- 2. SECURITY LOGS TABLE (For tracking auth events)
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Index for security logs
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

-- Enable RLS on security logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security logs" ON security_logs;

CREATE POLICY "Admins can view security logs" 
  ON security_logs FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin')
  ));

-- 3. DEMO BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS demo_bookings (
  id UUID DEFAULT gen_random_uuid(),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE demo_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage demo bookings" ON demo_bookings;
DROP POLICY IF EXISTS "SuperAdmin manage demo bookings" ON demo_bookings;

CREATE POLICY "Admins can manage demo bookings" 
  ON demo_bookings FOR ALL 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin')
  ));

-- 4. CUSTOMERS TABLE (CRM)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'qualified', 'proposal', 'contracting', 'won', 'lost')),
  assigned_to UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
DROP POLICY IF EXISTS "SuperAdmin manage customers" ON customers;

CREATE POLICY "Admins can manage customers" 
  ON customers FOR ALL 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin')
  ));

-- 5. FUNCTION: Handle new user signup (creates profile)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'company_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile after user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. FUNCTION: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before recreating
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_demo_bookings_updated_at ON demo_bookings;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demo_bookings_updated_at BEFORE UPDATE ON demo_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SETUP COMPLETE
-- ============================================
