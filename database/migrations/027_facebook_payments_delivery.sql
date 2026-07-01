-- ═══════════════════════════════════════════════════════════════════════════
-- 027 — Facebook follow-up columns, comment table, payments, delivery,
--        inventory, and ad attribution columns
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Facebook conversation: follow-up scheduler columns ────────────────
ALTER TABLE client_facebook_conversations
  ADD COLUMN IF NOT EXISTS follow_up_wave     INT          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sender_type   TEXT         DEFAULT 'bot';

-- ── 2. Facebook conversation: ad attribution columns ─────────────────────
ALTER TABLE client_facebook_conversations
  ADD COLUMN IF NOT EXISTS ad_id          TEXT,
  ADD COLUMN IF NOT EXISTS adset_id       TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id    TEXT,
  ADD COLUMN IF NOT EXISTS ad_ref         TEXT,
  ADD COLUMN IF NOT EXISTS ad_source      TEXT;

-- ── 3. Facebook comment auto-reply log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS client_facebook_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  page_id      TEXT        NOT NULL,
  comment_id   TEXT        UNIQUE NOT NULL,
  post_id      TEXT,
  from_psid    TEXT,
  from_name    TEXT,
  comment_text TEXT,
  bot_reply    TEXT,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_comments_page_id
  ON client_facebook_comments (page_id);
CREATE INDEX IF NOT EXISTS idx_fb_comments_workspace_id
  ON client_facebook_comments (workspace_id);

ALTER TABLE client_facebook_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_comments_select" ON client_facebook_comments;
CREATE POLICY "workspace_comments_select"
  ON client_facebook_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "workspace_comments_insert" ON client_facebook_comments;
CREATE POLICY "workspace_comments_insert"
  ON client_facebook_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 4. Payments table (PayMongo: GCash, Maya, Card, COD) ─────────────────
CREATE TABLE IF NOT EXISTS client_payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID,
  payment_type   TEXT        NOT NULL DEFAULT 'link',  -- link | gcash | paymaya | cod
  amount         BIGINT      NOT NULL,                 -- centavos
  description    TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending',
  checkout_url   TEXT,
  paymongo_id    TEXT        UNIQUE,
  customer_name  TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  reference_no   TEXT,
  remarks        TEXT,
  metadata       JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_payments_workspace_id
  ON client_payments (workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_status
  ON client_payments (status);
CREATE INDEX IF NOT EXISTS idx_client_payments_type
  ON client_payments (payment_type);

ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON client_payments;
CREATE POLICY "payments_select" ON client_payments FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "payments_insert" ON client_payments;
CREATE POLICY "payments_insert" ON client_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "payments_update" ON client_payments;
CREATE POLICY "payments_update" ON client_payments FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "payments_delete" ON client_payments;
CREATE POLICY "payments_delete" ON client_payments FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 5. Delivery / shipment tracker ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_deliveries (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID,
  customer_name       TEXT        NOT NULL,
  customer_phone      TEXT,
  customer_address    TEXT,
  courier             TEXT        NOT NULL DEFAULT 'Own Delivery',
  tracking_number     TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending',
  estimated_delivery  DATE,
  actual_delivery     TIMESTAMPTZ,
  notes               TEXT,
  timeline            JSONB       DEFAULT '[]',
  metadata            JSONB       DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_deliveries_workspace_id
  ON client_deliveries (workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_deliveries_status
  ON client_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_client_deliveries_courier
  ON client_deliveries (courier);

ALTER TABLE client_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_select" ON client_deliveries;
CREATE POLICY "deliveries_select" ON client_deliveries FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "deliveries_insert" ON client_deliveries;
CREATE POLICY "deliveries_insert" ON client_deliveries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "deliveries_update" ON client_deliveries;
CREATE POLICY "deliveries_update" ON client_deliveries FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "deliveries_delete" ON client_deliveries;
CREATE POLICY "deliveries_delete" ON client_deliveries FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 6. Inventory items ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID,
  name              TEXT        NOT NULL,
  sku               TEXT,
  category          TEXT,
  quantity          INT         NOT NULL DEFAULT 0,
  low_stock_threshold INT       DEFAULT 10,
  unit              TEXT        DEFAULT 'pcs',
  cost_price        NUMERIC(12,2) DEFAULT 0,
  selling_price     NUMERIC(12,2) DEFAULT 0,
  supplier          TEXT,
  location          TEXT,
  notes             TEXT,
  metadata          JSONB       DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_workspace_id
  ON inventory_items (workspace_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category
  ON inventory_items (category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku
  ON inventory_items (sku);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select" ON inventory_items;
CREATE POLICY "inventory_select" ON inventory_items FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "inventory_insert" ON inventory_items;
CREATE POLICY "inventory_insert" ON inventory_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "inventory_update" ON inventory_items;
CREATE POLICY "inventory_update" ON inventory_items FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "inventory_delete" ON inventory_items;
CREATE POLICY "inventory_delete" ON inventory_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 7. Inventory stock movements log ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  item_id      UUID        REFERENCES inventory_items(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,  -- 'in' | 'out' | 'adjustment'
  quantity     INT         NOT NULL,
  reason       TEXT,
  reference    TEXT,
  performed_by TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id
  ON inventory_movements (item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_workspace_id
  ON inventory_movements (workspace_id);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_movements_select" ON inventory_movements;
CREATE POLICY "inv_movements_select" ON inventory_movements FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "inv_movements_insert" ON inventory_movements;
CREATE POLICY "inv_movements_insert" ON inventory_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
