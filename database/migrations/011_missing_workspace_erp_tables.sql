-- Migration: Add missing workspace and ERP registry tables
-- This migration creates the tables that are referenced in the code but missing from the database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ERP DIVISIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.erp_divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  admin_visible BOOLEAN DEFAULT true,
  client_visible BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'beta', 'planned', 'disabled')),
  status_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- ERP FEATURES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.erp_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id UUID REFERENCES public.erp_divisions(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  admin_route TEXT,
  client_route TEXT,
  admin_visible BOOLEAN DEFAULT true,
  client_visible BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'planned' CHECK (status IN ('active', 'beta', 'planned', 'disabled')),
  status_note TEXT,
  auto_enable_with_division BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (division_id, feature_key)
);

-- ============================================
-- WORKSPACES TABLE - Add missing columns if table exists
-- ============================================
DO $$
BEGIN
  -- Check if workspaces table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces' AND table_schema = 'public') THEN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'owner_user_id') THEN
      ALTER TABLE public.workspaces ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'workspace_type') THEN
      ALTER TABLE public.workspaces ADD COLUMN workspace_type TEXT DEFAULT 'individual' CHECK (workspace_type IN ('individual', 'shared', 'company', 'internal'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'status') THEN
      ALTER TABLE public.workspaces ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'updated_at') THEN
      ALTER TABLE public.workspaces ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
  ELSE
    -- Create workspaces table if it doesn't exist
    CREATE TABLE public.workspaces (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      workspace_type TEXT DEFAULT 'individual' CHECK (workspace_type IN ('individual', 'shared', 'company', 'internal')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
      owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  END IF;
END $$;

-- ============================================
-- WORKSPACE MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, workspace_id)
);

-- ============================================
-- WORKSPACE FEATURE ACCESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspace_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMP WITH TIME ZONE,
  enabled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_source TEXT DEFAULT 'admin' CHECK (access_source IN ('admin', 'api', 'system', 'bulk_import')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (workspace_id, feature_key)
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.erp_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_feature_access ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR ERP DIVISIONS
-- ============================================
DROP POLICY IF EXISTS "Admins can view all erp_divisions" ON public.erp_divisions;
DROP POLICY IF EXISTS "Admins can insert erp_divisions" ON public.erp_divisions;
DROP POLICY IF EXISTS "Admins can update erp_divisions" ON public.erp_divisions;
DROP POLICY IF EXISTS "Admins can delete erp_divisions" ON public.erp_divisions;

CREATE POLICY "Admins can view all erp_divisions" ON public.erp_divisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can insert erp_divisions" ON public.erp_divisions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can update erp_divisions" ON public.erp_divisions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete erp_divisions" ON public.erp_divisions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- RLS POLICIES FOR ERP FEATURES
-- ============================================
DROP POLICY IF EXISTS "Admins can view all erp_features" ON public.erp_features;
DROP POLICY IF EXISTS "Admins can insert erp_features" ON public.erp_features;
DROP POLICY IF EXISTS "Admins can update erp_features" ON public.erp_features;
DROP POLICY IF EXISTS "Admins can delete erp_features" ON public.erp_features;

CREATE POLICY "Admins can view all erp_features" ON public.erp_features
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can insert erp_features" ON public.erp_features
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can update erp_features" ON public.erp_features
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete erp_features" ON public.erp_features
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- RLS POLICIES FOR WORKSPACES
-- ============================================
DROP POLICY IF EXISTS "Admins can view all workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can insert workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can delete workspaces" ON public.workspaces;

CREATE POLICY "Admins can view all workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Members can view own workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = public.workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can update workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete workspaces" ON public.workspaces
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- RLS POLICIES FOR WORKSPACE MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Admins can view all workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can insert workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can delete workspace_members" ON public.workspace_members;

CREATE POLICY "Admins can view all workspace_members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Users can view own workspace_members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert workspace_members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can update workspace_members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete workspace_members" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- RLS POLICIES FOR WORKSPACE FEATURE ACCESS
-- ============================================
DROP POLICY IF EXISTS "Admins can view all workspace_feature_access" ON public.workspace_feature_access;
DROP POLICY IF EXISTS "Admins can insert workspace_feature_access" ON public.workspace_feature_access;
DROP POLICY IF EXISTS "Admins can update workspace_feature_access" ON public.workspace_feature_access;
DROP POLICY IF EXISTS "Admins can delete workspace_feature_access" ON public.workspace_feature_access;
DROP POLICY IF EXISTS "Members can view own workspace feature access" ON public.workspace_feature_access;

CREATE POLICY "Admins can view all workspace_feature_access" ON public.workspace_feature_access
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Members can view own workspace feature access" ON public.workspace_feature_access
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_feature_access.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert workspace_feature_access" ON public.workspace_feature_access
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can update workspace_feature_access" ON public.workspace_feature_access
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete workspace_feature_access" ON public.workspace_feature_access
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_erp_divisions_division_key ON public.erp_divisions(division_key);
CREATE INDEX IF NOT EXISTS idx_erp_divisions_status ON public.erp_divisions(status);
CREATE INDEX IF NOT EXISTS idx_erp_divisions_order ON public.erp_divisions(order_index);

CREATE INDEX IF NOT EXISTS idx_erp_features_division_id ON public.erp_features(division_id);
CREATE INDEX IF NOT EXISTS idx_erp_features_feature_key ON public.erp_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_erp_features_status ON public.erp_features(status);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON public.workspaces(workspace_type);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

CREATE INDEX IF NOT EXISTS idx_workspace_feature_access_workspace_id ON public.workspace_feature_access(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_feature_access_feature_key ON public.workspace_feature_access(feature_key);
CREATE INDEX IF NOT EXISTS idx_workspace_feature_access_is_enabled ON public.workspace_feature_access(is_enabled);

-- ============================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_erp_divisions_updated_at ON public.erp_divisions;
CREATE TRIGGER update_erp_divisions_updated_at BEFORE UPDATE ON public.erp_divisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_erp_features_updated_at ON public.erp_features;
CREATE TRIGGER update_erp_features_updated_at BEFORE UPDATE ON public.erp_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_feature_access_updated_at ON public.workspace_feature_access;
CREATE TRIGGER update_workspace_feature_access_updated_at BEFORE UPDATE ON public.workspace_feature_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- SEED DATA - ERP DIVISIONS
-- ============================================
INSERT INTO public.erp_divisions (division_key, title, icon, description, order_index, admin_visible, client_visible, status)
VALUES
  ('work', 'Work', 'Briefcase', 'Work management modules', 1, true, true, 'active'),
  ('intelligence', 'Intelligence', 'Brain', 'Analytics and insights', 2, true, true, 'active'),
  ('customer', 'Customer', 'Users', 'Customer management and portals', 3, true, true, 'active'),
  ('operations', 'Operations', 'Zap', 'Operational modules', 4, true, true, 'active'),
  ('manage', 'Manage', 'Settings', 'Management and administration', 5, true, true, 'active')
ON CONFLICT (division_key) DO NOTHING;

-- ============================================
-- SEED DATA - ERP FEATURES
-- ============================================
-- Insert work division features
INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'projects', 'Projects', 'Briefcase', 'Track service delivery projects', '/Admin/Projects', '/Client/Projects', true, true, 'active', false, 1
FROM public.erp_divisions d WHERE d.division_key = 'work'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'tasks', 'Tasks', 'CheckSquare', 'Manage assigned tasks', '/Admin/Tasks', '/Client/Tasks', true, true, 'active', false, 2
FROM public.erp_divisions d WHERE d.division_key = 'work'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'deals', 'Deals', 'TrendingUp', 'Sales deals pipeline', '/Admin/Deals', '/Client/Deals', true, true, 'active', false, 3
FROM public.erp_divisions d WHERE d.division_key = 'work'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'contacts', 'Contacts', 'Users', 'Manage contacts', '/Admin/Contacts', '/Client/Contacts', true, true, 'active', false, 4
FROM public.erp_divisions d WHERE d.division_key = 'work'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'inbox', 'Inbox', 'Mail', 'Message inbox', '/Admin/Inbox', '/Client/Inbox', true, true, 'active', false, 5
FROM public.erp_divisions d WHERE d.division_key = 'work'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'booking', 'Booking', 'CalendarDays', 'Demo bookings', '/Admin/Booking', '/Client/Booking', true, true, 'active', false, 6
FROM public.erp_divisions d WHERE d.division_key = 'work'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'crm', 'CRM', 'MessageCircle', 'Customer relationship management', '/Admin/CRM', '/Client/CRM', true, true, 'active', false, 7
FROM public.erp_divisions d WHERE d.division_key = 'work'
ON CONFLICT DO NOTHING;

-- Insert intelligence division features
INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'revenue', 'Revenue', 'Wallet', 'Revenue tracking', '/Admin/Revenue', '/Client/Revenue', true, true, 'active', false, 1
FROM public.erp_divisions d WHERE d.division_key = 'intelligence'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'analytics', 'Analytics', 'BarChart3', 'Analytics dashboard', '/Admin/Analytics', '/Client/Analytics', true, true, 'active', false, 2
FROM public.erp_divisions d WHERE d.division_key = 'intelligence'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'data_analytics', 'Data Analytics', 'PieChart', 'Detailed data analytics', '/Admin/DataAnalytics', '/Client/DataAnalytics', true, true, 'active', false, 3
FROM public.erp_divisions d WHERE d.division_key = 'intelligence'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'pipeline_analytics', 'Pipeline Analytics', 'LineChart', 'Sales pipeline analytics', '/Admin/PipelineAnalytics', '/Client/PipelineAnalytics', true, true, 'active', false, 4
FROM public.erp_divisions d WHERE d.division_key = 'intelligence'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'revenue_projections', 'Revenue Projections', 'Target', 'Revenue forecasting', '/Admin/RevenueProjections', '/Client/RevenueProjections', true, true, 'active', false, 5
FROM public.erp_divisions d WHERE d.division_key = 'intelligence'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'predictive', 'Predictive', 'Sparkles', 'AI predictive analytics', '/Admin/Predictive', '/Client/Predictive', true, true, 'active', false, 6
FROM public.erp_divisions d WHERE d.division_key = 'intelligence'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'leaderboard', 'Leaderboard', 'Award', 'Sales leaderboard', '/Admin/SalesLeaderBoards', '/Client/Leaderboard', true, true, 'active', false, 7
FROM public.erp_divisions d WHERE d.division_key = 'intelligence'
ON CONFLICT DO NOTHING;

-- Insert customer division features
INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'customer_portal', 'Customer Portal', 'UserCircle', 'Customer portal access', '/Admin/CustomerPortal', '/Client/CustomerPortal', true, true, 'active', false, 1
FROM public.erp_divisions d WHERE d.division_key = 'customer'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'feedback_portal', 'Feedback Portal', 'MessageSquare', 'Customer feedback', '/Admin/FeedbackPortal', '/Client/FeedbackPortal', true, true, 'active', false, 2
FROM public.erp_divisions d WHERE d.division_key = 'customer'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'knowledge_base', 'Knowledge Base', 'BookOpen', 'Knowledge base articles', '/Admin/KnowledgeBase', '/Client/KnowledgeBase', true, true, 'active', false, 3
FROM public.erp_divisions d WHERE d.division_key = 'customer'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'chatbot', 'Chatbot', 'Bot', 'AI chatbot support', '/Admin/Chatbot', '/Client/Chatbot', true, true, 'active', false, 4
FROM public.erp_divisions d WHERE d.division_key = 'customer'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'facebook_connect', 'Facebook Connect', 'MessageSquare', 'Facebook integration', '/Admin/FacebookConnect', '/Client/FacebookConnect', true, true, 'active', false, 5
FROM public.erp_divisions d WHERE d.division_key = 'customer'
ON CONFLICT DO NOTHING;

-- Insert operations division features
INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'inventory', 'Inventory', 'Package', 'Inventory management', '/Admin/Inventory', '/Client/Inventory', true, true, 'active', false, 1
FROM public.erp_divisions d WHERE d.division_key = 'operations'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'marketing', 'Marketing', 'Target', 'Marketing campaigns', '/Admin/Marketing', '/Client/Marketing', true, true, 'active', false, 2
FROM public.erp_divisions d WHERE d.division_key = 'operations'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'data_export', 'Data Export', 'Download', 'Data export tools', '/Admin/DataExport', '/Client/DataExport', true, true, 'active', false, 3
FROM public.erp_divisions d WHERE d.division_key = 'operations'
ON CONFLICT DO NOTHING;

-- Insert manage division features
INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'team', 'Team', 'Users2', 'Team management', '/Admin/Team', '/Client/Team', true, true, 'active', false, 1
FROM public.erp_divisions d WHERE d.division_key = 'manage'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'workflows', 'Workflows', 'Workflow', 'Workflow automation', '/Admin/Workflows', '/Client/Workflows', true, true, 'active', false, 2
FROM public.erp_divisions d WHERE d.division_key = 'manage'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'reports', 'Reports', 'FileText', 'Reports', '/Admin/Reports', '/Client/Reports', true, true, 'active', false, 3
FROM public.erp_divisions d WHERE d.division_key = 'manage'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'notifications', 'Notifications', 'Bell', 'Notification management', '/Admin/Notifications', '/Client/Notifications', true, true, 'active', false, 4
FROM public.erp_divisions d WHERE d.division_key = 'manage'
ON CONFLICT DO NOTHING;

INSERT INTO public.erp_features (division_id, feature_key, label, icon, description, admin_route, client_route, admin_visible, client_visible, status, auto_enable_with_division, order_index)
SELECT d.id, 'audit_logs', 'Audit Logs', 'ClipboardList', 'Audit logs', '/Admin/AuditLogs', '/Client/AuditLogs', true, true, 'active', false, 5
FROM public.erp_divisions d WHERE d.division_key = 'manage'
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DATA - ENABLE ALL FEATURES FOR ALL CLIENT WORKSPACES
-- ============================================
-- Get all feature keys and all non-internal workspaces, then enable all features
INSERT INTO public.workspace_feature_access (workspace_id, feature_key, is_enabled, enabled_at, access_source)
SELECT w.id, f.feature_key, true, NOW(), 'system'
FROM public.workspaces w
CROSS JOIN public.erp_features f
WHERE w.workspace_type != 'internal'
  AND f.status = 'active'
  AND f.client_visible = true
ON CONFLICT (workspace_id, feature_key) DO UPDATE
SET is_enabled = true, enabled_at = NOW();

