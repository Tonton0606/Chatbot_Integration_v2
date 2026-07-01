-- ============================================
-- MIGRATION 003: ACCOUNTING & INVOICING MODULE
-- ============================================
-- Creates tables for invoices, quotes, chart of accounts,
-- general ledger, expenses, and Philippine BIR compliance.

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_code VARCHAR(10) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense', 'contra_asset', 'contra_liability'
  )),
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  description TEXT,
  tax_category VARCHAR(50) DEFAULT 'none' CHECK (tax_category IN (
    'none', 'vat_standard', 'vat_zero', 'vat_exempt', 'ewt_subject', 'final_tax'
  )),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, account_code)
);

CREATE TABLE IF NOT EXISTS gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','cogs','expense')),
  parent_id UUID REFERENCES gl_accounts(id) ON DELETE SET NULL,
  currency VARCHAR(10) DEFAULT 'PHP',
  description TEXT,
  balance DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, account_code)
);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  
  -- Parties
  customer_id UUID,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_tin VARCHAR(50),
  customer_address TEXT,
  deal_id UUID,
  contact_id UUID,
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void'
  )),
  invoice_type VARCHAR(20) NOT NULL DEFAULT 'invoice' CHECK (invoice_type IN (
    'invoice', 'official_receipt', 'credit_memo', 'debit_memo'
  )),
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Amounts (all in PHP)
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Philippine Tax Fields
  vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 12.00,
  vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat_type VARCHAR(20) DEFAULT 'inclusive' CHECK (vat_type IN ('inclusive', 'exclusive')),
  
  ewt_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ewt_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- BIR Fields
  bir_serial_number VARCHAR(50),
  or_number VARCHAR(50),
  tin_number VARCHAR(50),
  
  -- Metadata
  notes TEXT,
  terms TEXT,
  payment_terms VARCHAR(50) DEFAULT 'net_30',
  currency VARCHAR(10) DEFAULT 'PHP',
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- File
  pdf_url TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(workspace_id, invoice_number)
);

-- ============================================
-- INVOICE LINE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  
  vat_rate DECIMAL(5, 2) DEFAULT 12.00,
  vat_amount DECIMAL(12, 2) DEFAULT 0,
  
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Link to chart of accounts for accounting
  revenue_account_id UUID REFERENCES gl_accounts(id),
  expense_account_id UUID REFERENCES gl_accounts(id),
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUOTES / PROPOSALS
-- ============================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quote_number VARCHAR(50) NOT NULL,
  
  -- Parties
  customer_id UUID,
  deal_id UUID,
  contact_id UUID,
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'
  )),
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  converted_to_invoice_id UUID REFERENCES invoices(id),
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 12.00,
  vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  title VARCHAR(255),
  notes TEXT,
  terms TEXT,
  currency VARCHAR(10) DEFAULT 'PHP',
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(workspace_id, quote_number)
);

-- ============================================
-- QUOTE LINE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  
  vat_rate DECIMAL(5, 2) DEFAULT 12.00,
  vat_amount DECIMAL(12, 2) DEFAULT 0,
  
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EXPENSES
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  
  category VARCHAR(100),
  expense_account_id UUID REFERENCES chart_of_accounts(id),
  payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN (
    'cash', 'bank_transfer', 'check', 'gcash', 'maya', 'credit_card', 'other'
  )),
  
  -- Philippine Tax
  vat_rate DECIMAL(5, 2) DEFAULT 12.00,
  vat_amount DECIMAL(12, 2) DEFAULT 0,
  ewt_rate DECIMAL(5, 2) DEFAULT 0,
  ewt_amount DECIMAL(12, 2) DEFAULT 0,
  is_vat_inclusive BOOLEAN DEFAULT true,
  
  -- References
  vendor_name VARCHAR(255),
  reference_number VARCHAR(100),
  receipt_url TEXT,
  or_number VARCHAR(50),
  
  -- Approval
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending', 'approved', 'rejected', 'paid', 'reimbursed'
  )),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GENERAL LEDGER (double-entry bookkeeping)
-- ============================================

CREATE TABLE IF NOT EXISTS general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_number VARCHAR(50) NOT NULL,
  
  -- Source document
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
    'invoice', 'quote', 'expense', 'payment', 'journal', 'adjustment', 'payroll'
  )),
  source_id UUID,
  source_number VARCHAR(50),
  
  -- Double entry
  account_id UUID NOT NULL REFERENCES gl_accounts(id),
  debit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  
  description TEXT,
  memo TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  je_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  memo TEXT,
  reference TEXT,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  reverses_je_id UUID REFERENCES journal_entries(id),
  reversed_by_je_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, je_number)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES gl_accounts(id),
  debit DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  line_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENTS RECEIVED
-- ============================================

CREATE TABLE IF NOT EXISTS payments_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID,
  
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'bank_transfer' CHECK (payment_method IN (
    'cash', 'bank_transfer', 'check', 'gcash', 'maya', 'credit_card', 'other'
  )),
  
  reference_number VARCHAR(100),
  notes TEXT,
  
  -- Philippine fields
  official_receipt_number VARCHAR(50),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENT TERMS
-- ============================================

CREATE TABLE IF NOT EXISTS payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  term_code VARCHAR(20) NOT NULL,
  term_name VARCHAR(100) NOT NULL,
  days INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, term_code)
);

-- ============================================
-- VENDOR / SUPPLIER MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  vendor_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Philippine fields
  tin_number VARCHAR(50),
  business_registration_number VARCHAR(50),
  bir_regulated BOOLEAN DEFAULT false,
  
  -- Financial
  payment_terms_id UUID REFERENCES payment_terms(id),
  default_expense_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_workspace ON chart_of_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_workspace ON gl_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_type ON gl_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(workspace_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotes_workspace ON quotes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace ON expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_workspace ON general_ledger(workspace_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_date ON general_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_account ON general_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_source ON general_ledger(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_je_workspace ON journal_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_jel_journal_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_workspace ON payments_received(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_invoice ON payments_received(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vendors_workspace ON vendors(workspace_id);

-- ============================================
-- RLS POLICIES (workspace-scoped)
-- ============================================

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (workspace_id filtering done at app level)
CREATE POLICY "workspace_members_read_chart_of_accounts" ON chart_of_accounts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = chart_of_accounts.workspace_id)
);
CREATE POLICY "workspace_members_write_chart_of_accounts" ON chart_of_accounts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = chart_of_accounts.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = chart_of_accounts.workspace_id)
);
CREATE POLICY "workspace_members_read_gl_accounts" ON gl_accounts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = gl_accounts.workspace_id)
);
CREATE POLICY "workspace_members_write_gl_accounts" ON gl_accounts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = gl_accounts.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = gl_accounts.workspace_id)
);
CREATE POLICY "workspace_members_read_invoices" ON invoices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = invoices.workspace_id)
);
CREATE POLICY "workspace_members_write_invoices" ON invoices FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = invoices.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = invoices.workspace_id)
);
CREATE POLICY "workspace_members_read_invoice_items" ON invoice_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM invoices i JOIN profiles p ON p.id = auth.uid() WHERE i.id = invoice_items.invoice_id AND p.workspace_id = i.workspace_id)
);
CREATE POLICY "workspace_members_write_invoice_items" ON invoice_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM invoices i JOIN profiles p ON p.id = auth.uid() WHERE i.id = invoice_items.invoice_id AND p.workspace_id = i.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM invoices i JOIN profiles p ON p.id = auth.uid() WHERE i.id = invoice_items.invoice_id AND p.workspace_id = i.workspace_id)
);
CREATE POLICY "workspace_members_read_quotes" ON quotes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = quotes.workspace_id)
);
CREATE POLICY "workspace_members_write_quotes" ON quotes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = quotes.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = quotes.workspace_id)
);
CREATE POLICY "workspace_members_read_quote_items" ON quote_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q JOIN profiles p ON p.id = auth.uid() WHERE q.id = quote_items.quote_id AND p.workspace_id = q.workspace_id)
);
CREATE POLICY "workspace_members_write_quote_items" ON quote_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM quotes q JOIN profiles p ON p.id = auth.uid() WHERE q.id = quote_items.quote_id AND p.workspace_id = q.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM quotes q JOIN profiles p ON p.id = auth.uid() WHERE q.id = quote_items.quote_id AND p.workspace_id = q.workspace_id)
);
CREATE POLICY "workspace_members_read_expenses" ON expenses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = expenses.workspace_id)
);
CREATE POLICY "workspace_members_write_expenses" ON expenses FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = expenses.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = expenses.workspace_id)
);
CREATE POLICY "workspace_members_read_general_ledger" ON general_ledger FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = general_ledger.workspace_id)
);
CREATE POLICY "workspace_members_write_general_ledger" ON general_ledger FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = general_ledger.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = general_ledger.workspace_id)
);
CREATE POLICY "workspace_members_read_journal_entries" ON journal_entries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = journal_entries.workspace_id)
);
CREATE POLICY "workspace_members_write_journal_entries" ON journal_entries FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = journal_entries.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = journal_entries.workspace_id)
);
CREATE POLICY "workspace_members_read_journal_entry_lines" ON journal_entry_lines FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM journal_entries je JOIN profiles p ON p.id = auth.uid() WHERE je.id = journal_entry_lines.journal_entry_id AND p.workspace_id = je.workspace_id)
);
CREATE POLICY "workspace_members_write_journal_entry_lines" ON journal_entry_lines FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM journal_entries je JOIN profiles p ON p.id = auth.uid() WHERE je.id = journal_entry_lines.journal_entry_id AND p.workspace_id = je.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM journal_entries je JOIN profiles p ON p.id = auth.uid() WHERE je.id = journal_entry_lines.journal_entry_id AND p.workspace_id = je.workspace_id)
);
CREATE POLICY "workspace_members_read_payments_received" ON payments_received FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = payments_received.workspace_id)
);
CREATE POLICY "workspace_members_write_payments_received" ON payments_received FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = payments_received.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = payments_received.workspace_id)
);
CREATE POLICY "workspace_members_read_payment_terms" ON payment_terms FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = payment_terms.workspace_id)
);
CREATE POLICY "workspace_members_write_payment_terms" ON payment_terms FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = payment_terms.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = payment_terms.workspace_id)
);
CREATE POLICY "workspace_members_read_vendors" ON vendors FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = vendors.workspace_id)
);
CREATE POLICY "workspace_members_write_vendors" ON vendors FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = vendors.workspace_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.workspace_id = vendors.workspace_id)
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_payments_received_updated_at BEFORE UPDATE ON payments_received
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- DEFAULT PAYMENT TERMS (Philippine standards)
-- ============================================

-- Insert default payment terms (workspace_id = NULL means system default)
INSERT INTO payment_terms (id, workspace_id, term_code, term_name, days, description, is_default) VALUES
  (gen_random_uuid(), NULL, 'cod', 'Cash on Delivery', 0, 'Payment due upon delivery', false),
  (gen_random_uuid(), NULL, 'net7', 'Net 7', 7, 'Payment due within 7 days', false),
  (gen_random_uuid(), NULL, 'net15', 'Net 15', 15, 'Payment due within 15 days', false),
  (gen_random_uuid(), NULL, 'net30', 'Net 30', 30, 'Payment due within 30 days', true),
  (gen_random_uuid(), NULL, 'net60', 'Net 60', 60, 'Payment due within 60 days', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT CHART OF ACCOUNTS (Philippine BIR Standard)
-- ============================================

-- These are system-level templates. Each workspace gets their own copy on setup.
-- INSERT will be done via application logic per workspace.