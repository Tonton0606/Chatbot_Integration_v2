import {
  INVENTORY_ITEM_STATUSES,
  DEFAULT_INVENTORY_UNIT,
} from "./inventoryConstants";

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDisplayName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.email ||
    ""
  );
}

export function normalizeCategory(row = {}) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name || "",
    description: row.description || "",
    active: !!row.is_active,
    itemCount: Number(row.item_count || 0),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeItem(row = {}) {
  const currentStock = Number(row.current_stock || 0);
  const lowStockThreshold = Number(row.low_stock_threshold || 0);

  const isLowStock = currentStock <= lowStockThreshold;

  return {
    id: row.id,
    workspaceId: row.workspace_id,

    categoryId: row.category_id,
    category: row.category?.name || "Uncategorized",

    sku: row.sku || "",

    name: row.name || "",
    description: row.description || "",

    unit: row.unit || DEFAULT_INVENTORY_UNIT,

    currentStock,
    lowStockThreshold,

    status: isLowStock
      ? INVENTORY_ITEM_STATUSES.LOW_STOCK
      : INVENTORY_ITEM_STATUSES.IN_STOCK,

    active: !!row.is_active,

    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeMovement(row = {}) {
  const recordedByName =
    getDisplayName(row.created_by_profile) ||
    getDisplayName(row.profile) ||
    row.recorded_by_name ||
    "System User";

  return {
    id: row.id,

    workspaceId: row.workspace_id,

    itemId: row.item_id,
    itemName: row.item?.name || "Unknown Item",
    itemSku: row.item?.sku || "",

    category:
      row.item?.category?.name ||
      row.category?.name ||
      "Uncategorized",

    type: row.movement_type,

    quantity: Number(row.quantity || 0),

    previousStock: Number(row.previous_stock || 0),

    newStock: Number(row.new_stock || 0),

    referenceType: row.reference_type || "",
    referenceId: row.reference_id || "",

    reason: row.notes || "",

    recordedById: row.created_by || null,
    recordedBy: recordedByName,

    date: formatDateTime(row.created_at),
    createdAt: row.created_at,
  };
}
