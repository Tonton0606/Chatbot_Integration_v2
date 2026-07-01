-- Complete Admin Panel Schema for HermesV3
-- Includes all modules: Revenue, Analytics, Customer Portal, Knowledge Base, Reports, Audit Logs

-- ============================================
-- REVENUE MODULE
-- ============================================

-- Revenue entries table
CREATE TABLE IF NOT EXISTS revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'sales', 'subscription', 'service', 'other'
  category VARCHAR(50) NOT NULL, -- 'product', 'service', 'licensing'
  description TEXT,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue projections table
CREATE TABLE IF NOT EXISTS revenue_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  projected_amount DECIMAL(12, 2) NOT NULL,
  actual_amount DECIMAL(12, 2),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ANALYTICS MODULE
-- ============================================

-- Analytics events tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- 'page_view', 'click', 'conversion', 'error'
  event_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_url TEXT,
  referrer_url TEXT
);

-- Pipeline stages tracking
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL,
  probability DECIMAL(5, 2) NOT NULL, -- win probability percentage
  color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deal pipeline history
CREATE TABLE IF NOT EXISTS deal_pipeline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  moved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- ============================================
-- CUSTOMER PORTAL MODULE
-- ============================================

-- Customer portal access
CREATE TABLE IF NOT EXISTS customer_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  portal_enabled BOOLEAN DEFAULT true,
  access_token VARCHAR(255),
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer portal activity
CREATE TABLE IF NOT EXISTS customer_portal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'view_project', 'download', 'message'
  activity_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback portal entries
CREATE TABLE IF NOT EXISTS feedback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'suggestion', 'bug', 'complaint', 'praise'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_review', 'resolved', 'closed'
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- KNOWLEDGE BASE MODULE
-- ============================================

-- Knowledge base categories
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  parent_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  tags TEXT[],
  author_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KB article attachments
CREATE TABLE IF NOT EXISTS kb_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REPORTS MODULE
-- ============================================

-- Saved reports
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- 'sales', 'revenue', 'performance', 'custom'
  filters JSONB,
  schedule VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly', null
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_run_result JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report exports
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES saved_reports(id) ON DELETE CASCADE,
  format VARCHAR(20) NOT NULL, -- 'pdf', 'csv', 'excel'
  file_url TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- AUDIT LOGS MODULE
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'export', 'view'
  resource_type VARCHAR(50) NOT NULL, -- 'deal', 'client', 'project', 'task', 'report', 'settings'
  resource_id UUID,
  resource_name VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  severity VARCHAR(20) DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_portal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON revenue_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON revenue_projections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON analytics_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON pipeline_stages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON deal_pipeline_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON customer_portal_access
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON customer_portal_activity
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON feedback_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON kb_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON kb_articles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON kb_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON saved_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON report_exports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON audit_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, order_index, probability, color) VALUES
  ('Lead', 1, 10, '#64748b'),
  ('Qualified', 2, 25, '#3b82f6'),
  ('Proposal', 3, 50, '#8b5cf6'),
  ('Negotiation', 4, 75, '#f59e0b'),
  ('Closed Won', 5, 100, '#10b981'),
  ('Closed Lost', 6, 0, '#ef4444')
ON CONFLICT DO NOTHING;

-- Insert default KB categories
INSERT INTO kb_categories (name, slug, description, icon, order_index) VALUES
  ('Getting Started', 'getting-started', 'Basic guides to get you started', 'BookOpen', 1),
  ('Products & Services', 'products-services', 'Information about our offerings', 'Package', 2),
  ('Billing & Payments', 'billing-payments', 'Payment methods, invoices, and billing FAQ', 'CreditCard', 3),
  ('Technical Support', 'technical-support', 'Technical troubleshooting and guides', 'Wrench', 4),
  ('Account Management', 'account-management', 'Managing your account settings', 'UserCog', 5)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_entries_date ON revenue_entries(date);
CREATE INDEX IF NOT EXISTS idx_revenue_entries_source ON revenue_entries(source);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_history_deal_id ON deal_pipeline_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_status ON feedback_entries(status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_revenue_entries_updated_at BEFORE UPDATE ON revenue_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_projections_updated_at BEFORE UPDATE ON revenue_projections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_entries_updated_at BEFORE UPDATE ON feedback_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_categories_updated_at BEFORE UPDATE ON kb_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_reports_updated_at BEFORE UPDATE ON saved_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_portal_access_updated_at BEFORE UPDATE ON customer_portal_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
