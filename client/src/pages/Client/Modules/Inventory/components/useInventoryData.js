import { useCallback, useEffect, useState } from "react";

import { getClientInventoryData } from "../services";

const EMPTY_INVENTORY_DATA = {
  categories: [],
  items: [],
  movements: [],
  lowStockItems: [],
};

export default function useInventoryData() {
  const [inventoryData, setInventoryData] = useState(EMPTY_INVENTORY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInventory = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await getClientInventoryData();

      setInventoryData({
        categories: data?.categories || [],
        items: data?.items || [],
        movements: data?.movements || [],
        lowStockItems: data?.lowStockItems || [],
      });
    } catch (err) {
      console.error("Inventory load error:", err);
      setError(err?.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const refreshInventory = useCallback(() => {
    loadInventory({ silent: true });
  }, [loadInventory]);

  return {
    inventoryData,
    loading,
    refreshing,
    error,
    loadInventory,
    refreshInventory,
  };
}
