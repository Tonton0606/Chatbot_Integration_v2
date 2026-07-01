import { supabase } from "@/config/supabaseClient";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/services/workspaceResolver";

import {
  INVENTORY_TABLES,
  DEFAULT_INVENTORY_UNIT,
  CREATE_INVENTORY_MOVEMENT_RPC,
} from "./inventoryConstants";

import {
  normalizeCategory,
  normalizeItem,
} from "./inventoryNormalizers";

function requireId(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

export async function createInventoryCategory(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const name = payload.name?.trim();

  if (!name) {
    throw new Error("Category name is required.");
  }

  const { data, error } = await supabase
    .from(INVENTORY_TABLES.CATEGORIES)
    .insert({
      workspace_id: workspaceId,
      name,
      description: payload.description?.trim() || null,
      is_active: true,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  return normalizeCategory(data);
}

export async function updateInventoryCategory(
  categoryId,
  payload = {}
) {
  requireId(categoryId, "Category ID is required.");

  const workspaceId = await getCurrentWorkspaceId();

  const name = payload.name?.trim();

  if (!name) {
    throw new Error("Category name is required.");
  }

  const { data, error } = await supabase
    .from(INVENTORY_TABLES.CATEGORIES)
    .update({
      name,
      description: payload.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw error;

  return normalizeCategory(data);
}

export async function archiveInventoryCategory(categoryId) {
  requireId(categoryId, "Category ID is required.");

  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase
    .from(INVENTORY_TABLES.CATEGORIES)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  return true;
}

export async function createInventoryItem(payload = {}) {
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();

  const name = payload.name?.trim();

  if (!name) {
    throw new Error("Item name is required.");
  }

  if (!payload.categoryId) {
    throw new Error("Category is required.");
  }

  const { data, error } = await supabase
    .from(INVENTORY_TABLES.ITEMS)
    .insert({
      workspace_id: workspaceId,
      category_id: payload.categoryId,

      sku: payload.sku?.trim() || null,

      name,

      description: payload.description?.trim() || null,

      unit:
        payload.unit?.trim() ||
        DEFAULT_INVENTORY_UNIT,

      current_stock: Number(payload.currentStock || 0),

      low_stock_threshold: Number(
        payload.lowStockThreshold || 0
      ),

      is_active: true,

      created_by: userId,
    })
    .select(`
      *,
      category:client_inventory_categories (
        id,
        name
      )
    `)
    .single();

  if (error) throw error;

  return normalizeItem(data);
}

export async function updateInventoryItem(
  itemId,
  payload = {}
) {
  requireId(itemId, "Item ID is required.");

  const workspaceId = await getCurrentWorkspaceId();

  const name = payload.name?.trim();

  if (!name) {
    throw new Error("Item name is required.");
  }

  if (!payload.categoryId) {
    throw new Error("Category is required.");
  }

  const { data, error } = await supabase
    .from(INVENTORY_TABLES.ITEMS)
    .update({
      category_id: payload.categoryId,

      sku: payload.sku?.trim() || null,

      name,

      description: payload.description?.trim() || null,

      unit:
        payload.unit?.trim() ||
        DEFAULT_INVENTORY_UNIT,

      low_stock_threshold: Number(
        payload.lowStockThreshold || 0
      ),

      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .select(`
      *,
      category:client_inventory_categories (
        id,
        name
      )
    `)
    .single();

  if (error) throw error;

  return normalizeItem(data);
}

export async function archiveInventoryItem(itemId) {
  requireId(itemId, "Item ID is required.");

  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase
    .from(INVENTORY_TABLES.ITEMS)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  return true;
}

export async function createInventoryMovement(
  payload = {}
) {
  const workspaceId = await getCurrentWorkspaceId();

  requireId(payload.itemId, "Item is required.");
  requireId(
    payload.movementType,
    "Movement type is required."
  );

  const quantity = Number(payload.quantity || 0);

  if (quantity <= 0) {
    throw new Error(
      "Quantity must be greater than zero."
    );
  }

  const { data, error } = await supabase.rpc(
    CREATE_INVENTORY_MOVEMENT_RPC,
    {
      p_workspace_id: workspaceId,
      p_item_id: payload.itemId,
      p_movement_type: payload.movementType,
      p_quantity: quantity,
      p_notes: payload.notes?.trim() || null,
      p_reference_type:
        payload.referenceType?.trim() || null,
      p_reference_id:
        payload.referenceId?.trim() || null,
    }
  );

  if (error) throw error;

  return data?.[0] || null;
}
