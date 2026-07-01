/**
 * Inventory Route — /api/inventory
 * CRUD for inventory items + automatic low-stock / out-of-stock workflow triggers
 */

const express = require("express");
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { supabase } = require("../config/supabase");

// req.workspaceId is set by requireAuth from the validated x-workspace-id header.
// Never read workspace from body/query — those are attacker-controlled.
function getWorkspaceId(req) {
  return req.workspaceId || null;
}

// ── Internal: fire workflow trigger ──────────────────────────────────────────

async function fireTrigger(trigger_module, trigger_event, trigger_data) {
  try {
    const { data: rules } = await supabase
      .from("workflow_rules")
      .select("*")
      .eq("workspace_id", trigger_data.workspace_id)
      .eq("is_active", true)
      .eq("trigger_module", trigger_module)
      .eq("trigger_event", trigger_event);

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      await supabase.from("workflow_executions").insert({
        rule_id: rule.id,
        workspace_id: trigger_data.workspace_id,
        trigger_event: `${trigger_module}.${trigger_event}`,
        trigger_record_id: trigger_data.id || null,
        trigger_data,
        status: "pending",
      });
    }
  } catch {
    // non-blocking
  }
}

// ── Ownership guard ───────────────────────────────────────────────────────────
// Fetch an item and assert it belongs to the requester's workspace.
// Returns { item } on success or sends a 403/404 response and returns null.

async function fetchOwnedItem(req, res) {
  const workspace_id = getWorkspaceId(req);
  if (!workspace_id) {
    res.status(400).json({ success: false, error: "Workspace context is required." });
    return null;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", req.params.id)
    .eq("workspace_id", workspace_id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return null;
  }

  if (!data) {
    res.status(404).json({ success: false, error: "Item not found." });
    return null;
  }

  return data;
}

// ── List items ────────────────────────────────────────────────────────────────

router.get("/items", requireAuth, async (req, res) => {
  try {
    const workspace_id = getWorkspaceId(req);
    if (!workspace_id) return res.status(400).json({ success: false, error: "Workspace context is required." });

    const { category, search, low_stock, limit = 100, offset = 0 } = req.query;

    let q = supabase
      .from("inventory_items")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category) q = q.eq("category", category);
    if (search) q = q.ilike("name", `%${search}%`);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    // Filter low-stock in JS — supabase-js v2 client has no raw() method and
    // PostgREST column-reference filter syntax is unreliable across versions.
    const items = low_stock === "true"
      ? (data || []).filter((item) => (item.quantity ?? 0) <= (item.low_stock_threshold ?? 5))
      : (data || []);

    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Low-stock summary ─────────────────────────────────────────────────────────

router.get("/low-stock", requireAuth, async (req, res) => {
  try {
    const workspace_id = getWorkspaceId(req);
    if (!workspace_id) return res.status(400).json({ success: false, error: "Workspace context is required." });

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (error) throw new Error(error.message);

    // Filter in JS — column-to-column comparison is not supported by the JS client filter
    const items = (data || []).filter(
      (item) => (item.quantity ?? 0) <= (item.low_stock_threshold ?? 5)
    );

    res.json({ success: true, count: items.length, items });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Create item ───────────────────────────────────────────────────────────────

router.post("/items", requireAuth, async (req, res) => {
  try {
    const workspace_id = getWorkspaceId(req);
    if (!workspace_id) return res.status(400).json({ success: false, error: "Workspace context is required." });

    const { name, sku, category, quantity, unit, cost_price, selling_price, low_stock_threshold, image_url, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "name is required" });

    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        workspace_id,
        name,
        sku: sku || null,
        category: category || "General",
        quantity: quantity ?? 0,
        unit: unit || "pcs",
        cost_price: cost_price || null,
        selling_price: selling_price || null,
        low_stock_threshold: low_stock_threshold ?? 5,
        image_url: image_url || null,
        notes: notes || null,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await fireTrigger("inventory", "item_created", { ...data, workspace_id });
    res.status(201).json({ success: true, item: data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Get single item ───────────────────────────────────────────────────────────

router.get("/items/:id", requireAuth, async (req, res) => {
  try {
    const item = await fetchOwnedItem(req, res);
    if (!item) return; // fetchOwnedItem already sent response
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Update item (with low-stock trigger) ─────────────────────────────────────

router.patch("/items/:id", requireAuth, async (req, res) => {
  try {
    const existing = await fetchOwnedItem(req, res);
    if (!existing) return;

    const allowed = ["name", "sku", "category", "quantity", "unit", "cost_price", "selling_price", "low_stock_threshold", "image_url", "notes", "is_active"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("inventory_items")
      .update(updates)
      .eq("id", req.params.id)
      .eq("workspace_id", existing.workspace_id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // ── Low-stock / out-of-stock automation ───────────────────────────────────
    if (updates.quantity !== undefined) {
      const threshold = data.low_stock_threshold ?? 5;
      const qty = data.quantity ?? 0;

      if (qty === 0) {
        await fireTrigger("inventory", "out_of_stock", { ...data, workspace_id: data.workspace_id });
      } else if (qty <= threshold) {
        await fireTrigger("inventory", "low_stock", { ...data, workspace_id: data.workspace_id });
      } else if (updates.quantity > threshold) {
        await fireTrigger("inventory", "restock", { ...data, workspace_id: data.workspace_id });
      }
    }

    await fireTrigger("inventory", "item_updated", { ...data, workspace_id: data.workspace_id });
    res.json({ success: true, item: data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Stock adjustment ──────────────────────────────────────────────────────────

router.post("/items/:id/adjust", requireAuth, async (req, res) => {
  try {
    const existing = await fetchOwnedItem(req, res);
    if (!existing) return;

    const { delta, reason } = req.body;
    if (delta === undefined) return res.status(400).json({ success: false, error: "delta required (positive=in, negative=out)" });

    const newQty = Math.max(0, (existing.quantity || 0) + Number(delta));

    // Record movement
    await supabase.from("inventory_movements").insert({
      workspace_id: existing.workspace_id,
      item_id: req.params.id,
      delta: Number(delta),
      reason: reason || (Number(delta) > 0 ? "Stock in" : "Stock out"),
      quantity_before: existing.quantity,
      quantity_after: newQty,
      created_by: req.user?.id,
    });

    const { data, error } = await supabase
      .from("inventory_items")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("workspace_id", existing.workspace_id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const threshold = data.low_stock_threshold ?? 5;
    if (newQty === 0) {
      await fireTrigger("inventory", "out_of_stock", { ...data, workspace_id: data.workspace_id });
    } else if (newQty <= threshold && Number(delta) < 0) {
      await fireTrigger("inventory", "low_stock", { ...data, workspace_id: data.workspace_id });
    }

    res.json({ success: true, item: data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────

router.delete("/items/:id", requireAuth, async (req, res) => {
  try {
    const existing = await fetchOwnedItem(req, res);
    if (!existing) return;

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", req.params.id)
      .eq("workspace_id", existing.workspace_id);

    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", requireAuth, async (req, res) => {
  try {
    const workspace_id = getWorkspaceId(req);
    if (!workspace_id) return res.status(400).json({ success: false, error: "Workspace context is required." });

    const { data, error } = await supabase
      .from("inventory_items")
      .select("category")
      .eq("workspace_id", workspace_id);

    if (error) throw new Error(error.message);
    const cats = [...new Set((data || []).map((d) => d.category).filter(Boolean))].sort();
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
