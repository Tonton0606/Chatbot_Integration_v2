-- ============================================
-- HERMES 1.0 - SUPABASE DATABASE SETUP
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- WORKSPACES TABLE (For multi-tenancy)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Client' CHECK (role IN ('Admin', 'Client')),
  avatar_url TEXT,
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CUSTOMERS TABLE (CRM)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  value DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DOCUMENTS TABLE (ERP)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES public.profiles(id),
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- METRICS TABLE (Analytics)
CREATE TABLE IF NOT EXISTS public.metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SECURITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON public.metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON public.metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON public.security_logs(action);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR WORKSPACES
CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND workspace_id = workspaces.id
  )
);
CREATE POLICY "Users can insert own workspaces" ON public.workspaces FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);
CREATE POLICY "Users can update own workspaces" ON public.workspaces FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND workspace_id = workspaces.id
  )
);
CREATE POLICY "Users can delete own workspaces" ON public.workspaces FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND workspace_id = workspaces.id
  )
);

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view own profiles" ON public.profiles FOR SELECT USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (
  auth.uid() = id
);

-- RLS POLICIES FOR CUSTOMERS
CREATE POLICY "Users can view own workspace customers" ON public.customers FOR SELECT USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert own workspace customers" ON public.customers FOR INSERT WITH CHECK (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update own workspace customers" ON public.customers FOR UPDATE USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can delete own workspace customers" ON public.customers FOR DELETE USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS POLICIES FOR DOCUMENTS
CREATE POLICY "Users can view own workspace documents" ON public.documents FOR SELECT USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert own workspace documents" ON public.documents FOR INSERT WITH CHECK (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update own workspace documents" ON public.documents FOR UPDATE USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can delete own workspace documents" ON public.documents FOR DELETE USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS POLICIES FOR METRICS
CREATE POLICY "Users can view own workspace metrics" ON public.metrics FOR SELECT USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert own workspace metrics" ON public.metrics FOR INSERT WITH CHECK (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS POLICIES FOR SECURITY LOGS
CREATE POLICY "Users can view own workspace security logs" ON public.security_logs FOR SELECT USING (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert own workspace security logs" ON public.security_logs FOR INSERT WITH CHECK (
  workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())
);

-- CREATE FUNCTION TO HANDLE NEW USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default workspace for new users if they don't have one
  INSERT INTO public.workspaces (id, name, owner_id, settings)
  SELECT 
    gen_random_uuid(),
    'Default Workspace',
    new.id,
    '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workspaces WHERE owner_id = new.id
  )
  RETURNING id INTO NEW_WORKSPACE_ID;

  -- Update the user's profile with the workspace ID
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, workspace_id)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'Client'),
    COALESCE(NEW_WORKSPACE_ID, (SELECT id FROM public.workspaces WHERE owner_id = new.id LIMIT 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER FOR NEW USER SIGNUP
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- CREATE FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGERS FOR UPDATED_AT
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;