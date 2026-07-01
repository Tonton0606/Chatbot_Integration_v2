import React, { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_MOVEMENT_TYPE_LABELS,
} from "../services";

export default function InventoryMovementModal({
  item = null,
  items = [],
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    itemId: "",
    movementType: "stock_in",
    quantity: "1",
    notes: "",
  });

  const activeItems = useMemo(
    () => items.filter((inventoryItem) => inventoryItem.active),
    [items]
  );

  useEffect(() => {
    setForm({
      itemId: item?.id || activeItems[0]?.id || "",
      movementType: "stock_in",
      quantity: "1",
      notes: "",
    });
  }, [item, activeItems]);

  const selectedItem = activeItems.find(
    (inventoryItem) => inventoryItem.id === form.itemId
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit?.({
      itemId: form.itemId,
      movementType: form.movementType,
      quantity: Number(form.quantity || 0),
      notes: form.notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Add Stock Movement
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Record stock changes through the movement log so inventory remains
              traceable.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Item
              </span>

              <select
                value={form.itemId}
                onChange={(event) => updateField("itemId", event.target.value)}
                disabled={saving || activeItems.length === 0 || !!item?.id}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                required
              >
                <option value="">Select item</option>
                {activeItems.map((inventoryItem) => (
                  <option key={inventoryItem.id} value={inventoryItem.id}>
                    {inventoryItem.name}
                  </option>
                ))}
              </select>

              {activeItems.length === 0 ? (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
                  Create an inventory item before adding stock movements.
                </p>
              ) : null}
            </label>

            {selectedItem ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900/70">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Current Stock
                    </p>
                    <p className="mt-1 font-bold text-slate-950 dark:text-white">
                      {selectedItem.currentStock} {selectedItem.unit || "pcs"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Threshold
                    </p>
                    <p className="mt-1 font-bold text-slate-950 dark:text-white">
                      {selectedItem.lowStockThreshold}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Category
                    </p>
                    <p className="mt-1 font-bold text-slate-950 dark:text-white">
                      {selectedItem.category || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Movement Type
                </span>

                <select
                  value={form.movementType}
                  onChange={(event) =>
                    updateField("movementType", event.target.value)
                  }
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                >
                  {INVENTORY_MOVEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {INVENTORY_MOVEMENT_TYPE_LABELS[type] || type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Quantity
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(event) =>
                    updateField("quantity", event.target.value)
                  }
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Notes
              </span>

              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Example: Restock from supplier, damaged item, sold item, manual correction."
                disabled={saving}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || activeItems.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Movement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
