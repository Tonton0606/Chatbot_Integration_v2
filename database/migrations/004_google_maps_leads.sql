-- ============================================
-- MIGRATION 004: GOOGLE MAPS LEAD GENERATOR
-- ============================================
-- Creates tables for storing Google Maps scraped business data
-- as a new marketing module feature.

-- ============================================
-- GOOGLE MAPS SEARCH CONFIGS (saved searches)
-- ============================================

CREATE TABLE IF NOT EXISTS google_maps_search_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  search_label VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  search_query VARCHAR(255) NOT NULL,
  num_pages INTEGER NOT NULL DEFAULT 1,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'partial'
  )),
  error_message TEXT,

  -- Counts
  total_found INTEGER DEFAULT 0,
  total_enriched INTEGER DEFAULT 0,

  -- API usage tracking
  serper_api_cost DECIMAL(10, 6) DEFAULT 0,
  llm_api_cost DECIMAL(10, 6) DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GOOGLE MAPS LEADS (individual business records)
-- ============================================

CREATE TABLE IF NOT EXISTS google_maps_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  search_config_id UUID NOT NULL REFERENCES google_maps_search_configs(id) ON DELETE CASCADE,

  -- Basic info from Google Maps
  business_name VARCHAR(255) NOT NULL,
  address TEXT DEFAULT '',
  website VARCHAR(500) DEFAULT '',
  phone VARCHAR(100) DEFAULT '',
  description TEXT DEFAULT '',
  rating DECIMAL(3, 1) DEFAULT NULL,
  reviews INTEGER DEFAULT NULL,
  category VARCHAR(255) DEFAULT '',
  keywords TEXT DEFAULT '',
  price_level VARCHAR(20) DEFAULT '',
  opening_hours TEXT DEFAULT '',

  -- Enriched data from web scraping + AI
  email VARCHAR(500) DEFAULT '',
  facebook VARCHAR(500) DEFAULT '',
  twitter VARCHAR(500) DEFAULT '',
  instagram VARCHAR(500) DEFAULT '',
  linkedin VARCHAR(500) DEFAULT '',
  youtube VARCHAR(500) DEFAULT '',
  contact_page VARCHAR(500) DEFAULT '',

  -- Status
  enrichment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (enrichment_status IN (
    'pending', 'processing', 'enriched', 'failed', 'skipped'
  )),
  enrichment_error TEXT DEFAULT '',

  -- Lead management
  lead_status VARCHAR(30) DEFAULT 'new' CHECK (lead_status IN (
    'new', 'contacted', 'qualified', 'unqualified', 'converted', 'archived'
  )),
  notes TEXT DEFAULT '',
  assigned_to UUID REFERENCES auth.users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GOOGLE MAPS EXPORT HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS google_maps_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  search_config_id UUID NOT NULL REFERENCES google_maps_search_configs(id) ON DELETE CASCADE,

  export_format VARCHAR(20) NOT NULL CHECK (export_format IN ('csv', 'xlsx', 'json')),
  file_url TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  exported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_gmaps_search_configs_workspace ON google_maps_search_configs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gmaps_search_configs_status ON google_maps_search_configs(status);
CREATE INDEX IF NOT EXISTS idx_gmaps_leads_workspace ON google_maps_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gmaps_leads_search_config ON google_maps_leads(search_config_id);
CREATE INDEX IF NOT EXISTS idx_gmaps_leads_status ON google_maps_leads(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_gmaps_leads_lead_status ON google_maps_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_gmaps_export_search_config ON google_maps_export_history(search_config_id);

-- ============================================
-- RLS POLICIES (workspace-scoped)
-- ============================================

ALTER TABLE google_maps_search_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_maps_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_maps_export_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (workspace_id filtering done at app level)
CREATE POLICY "Authenticated access" ON google_maps_search_configs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON google_maps_leads FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON google_maps_export_history FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- TRIGGERS
-- ============================================

DO $$ BEGIN
  CREATE TRIGGER update_google_maps_search_configs_updated_at BEFORE UPDATE ON google_maps_search_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_google_maps_leads_updated_at BEFORE UPDATE ON google_maps_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;