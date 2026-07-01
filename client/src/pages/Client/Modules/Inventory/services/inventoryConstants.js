export const INVENTORY_MOVEMENT_TYPES = [
  "stock_in",
  "stock_out",
  "adjustment",
  "damage",
  "return",
];

export const INVENTORY_MOVEMENT_TYPE_LABELS = {
  stock_in: "Received",
  stock_out: "Issued",
  adjustment: "Adjusted",
  damage: "Damaged",
  return: "Returned",
};

export const INVENTORY_ITEM_STATUSES = {
  IN_STOCK: "in_stock",
  LOW_STOCK: "low_stock",
};

export const DEFAULT_INVENTORY_UNIT = "pcs";

export const INVENTORY_TABLES = {
  CATEGORIES: "client_inventory_categories",
  ITEMS: "client_inventory_items",
  MOVEMENTS: "client_inventory_movements",
};

export const CREATE_INVENTORY_MOVEMENT_RPC =
  "create_client_inventory_movement";
