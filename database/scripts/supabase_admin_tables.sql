-- Supabase Migration: Admin Panel Tables
-- Run this in Supabase SQL Editor to create CRM/ERP tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEADS TABLE (CRM)
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  value NUMERIC(12, 2) DEFAULT 0,
  stage VARCHAR(20) DEFAULT 'New' CHECK (stage IN ('New', 'Contacted', 'Qualified', 'Proposal', 'Closed')),
  source VARCHAR(100),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all leads"
  ON leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Users can view assigned leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- DEALS TABLE (Sales Pipeline)
-- ============================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  value NUMERIC(12, 2) DEFAULT 0,
  stage VARCHAR(20) DEFAULT 'Discovery' CHECK (stage IN ('Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost')),
  probability INTEGER DEFAULT 20 CHECK (probability >= 0 AND probability <= 100),
  close_date DATE,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all deals"
  ON deals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  type VARCHAR(20) DEFAULT 'Lead' CHECK (type IN ('Customer', 'Lead', 'Vendor', 'Partner')),
  status VARCHAR(20) DEFAULT 'Active',
  value NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Authenticated users can view contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- PRODUCTS TABLE (Inventory)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  category VARCHAR(100),
  description TEXT,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  price NUMERIC(12, 2) DEFAULT 0,
  cost NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- INVOICES TABLE (ERP)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE,
  client VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Sample leads
INSERT INTO leads (name, company, email, value, stage, source) VALUES
  ('John Smith', 'TechCorp Inc', 'john@techcorp.com', 50000, 'New', 'Website'),
  ('Sarah Johnson', 'CloudBase Ltd', 'sarah@cloudbase.com', 75000, 'Contacted', 'Referral'),
  ('Mike Chen', 'DataSync Co', 'mike@datasync.com', 100000, 'Qualified', 'LinkedIn')
ON CONFLICT DO NOTHING;

-- Sample contacts
INSERT INTO contacts (name, company, email, phone, type) VALUES
  ('Alice Brown', 'Acme Corp', 'alice@acme.com', '+1234567890', 'Customer'),
  ('Bob Wilson', 'StartupXYZ', 'bob@startupxyz.com', '+0987654321', 'Lead'),
  ('Carol Davis', 'BigCompany', 'carol@bigcompany.com', '+1122334455', 'Partner')
ON CONFLICT DO NOTHING;

-- Sample products
INSERT INTO products (name, sku, category, stock, price, cost) VALUES
  ('Premium Plan', 'PLAN-PREMIUM', 'Subscription', 100, 99.00, 0),
  ('Enterprise License', 'LIC-ENT', 'License', 50, 499.00, 0),
  ('Consulting Hours', 'SRV-CONSULT', 'Service', 1000, 150.00, 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- REALTIME ENABLE (for live updates)
-- ============================================
BEGIN;
  -- Drop existing publication if exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create new publication
  CREATE PUBLICATION supabase_realtime;
  
  -- Add tables to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  ALTER PUBLICATION supabase_realtime ADD TABLE deals;
  ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
COMMIT;
