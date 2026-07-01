-- ============================================
-- SUPABASE SETUP FOR HERMES DEPLOYMENT
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABLE (Required for user roles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'Client' CHECK (role IN ('Client', 'Admin')),
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'
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

CREATE POLICY "Admins can view security logs" 
  ON security_logs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'
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

CREATE POLICY "Admins can manage demo bookings" 
  ON demo_bookings FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'
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

CREATE POLICY "Admins can manage customers" 
  ON customers FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'Client'),
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
