import { supabase } from "@/config/supabaseClient";
import { getCurrentWorkspaceId } from "@/services/workspaceResolver";

import { INVENTORY_TABLES } from "./inventoryConstants";

import {
  normalizeCategory,
  normalizeItem,
  normalizeMovement,
} from "./inventoryNormalizers";

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

function getProfileDisplayName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.email ||
    "System User"
  );
}

export async function getClientInventoryData() {
  const workspaceId = await getCurrentWorkspaceId();

  const [
    categoriesResult,
    itemsResult,
    movementsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from(INVENTORY_TABLES.CATEGORIES)
      .select(`
        *,
        client_inventory_items(count)
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("name", { ascending: true }),

    supabase
      .from(INVENTORY_TABLES.ITEMS)
      .select(`
        *,
        category:client_inventory_categories (
          id,
          name
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("name", { ascending: true }),

    supabase
      .from(INVENTORY_TABLES.MOVEMENTS)
      .select(`
        *,
        item:client_inventory_items (
          id,
          sku,
          name,
          category:client_inventory_categories (
            id,
            name
          )
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("profiles")
      .select("id, full_name, email, role, status"),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (movementsResult.error) throw movementsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const profileMap = byId(profilesResult.data || []);

  const categories = (categoriesResult.data || []).map((row) =>
    normalizeCategory({
      ...row,
      item_count: row.client_inventory_items?.[0]?.count || 0,
    })
  );

  const items = (itemsResult.data || []).map(normalizeItem);

  const movements = (movementsResult.data || []).map((row) => {
    const profile = profileMap.get(row.created_by);

    return normalizeMovement({
      ...row,
      recorded_by_name: getProfileDisplayName(profile),
    });
  });

  const lowStockItems = items.filter(
    (item) =>
      Number(item.currentStock) <= Number(item.lowStockThreshold)
  );

  return {
    categories,
    items,
    movements,
    lowStockItems,
  };
}

export async function getInventoryCategories() {
  const data = await getClientInventoryData();
  return data.categories;
}

export async function getInventoryItems() {
  const data = await getClientInventoryData();
  return data.items;
}

export async function getInventoryMovements() {
  const data = await getClientInventoryData();
  return data.movements;
}

export async function getInventoryLowStockItems() {
  const data = await getClientInventoryData();
  return data.lowStockItems;
}
