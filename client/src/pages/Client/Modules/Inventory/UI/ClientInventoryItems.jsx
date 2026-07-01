import React from "react";
import { Archive, Edit3, Package, Plus } from "lucide-react";

function StockStatusBadge({ item }) {
  const isLowStock =
    Number(item.currentStock || 0) <= Number(item.lowStockThreshold || 0);

  if (isLowStock) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        Low Stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      In Stock
    </span>
  );
}

export default function ClientInventoryItems({
  data,
  onCreateItem,
  onEditItem,
  onArchiveItem,
}) {
  const items = data?.items || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Inventory Items
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage inventory items, stock levels, SKU references, and thresholds.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          onClick={onCreateItem}
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Package className="h-7 w-7" />
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
            No inventory items yet
          </h3>

          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Create your first inventory item after setting up inventory
            categories.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Item</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">SKU</th>
                <th className="px-5 py-3 font-semibold">Current Stock</th>
                <th className="px-5 py-3 font-semibold">Low Threshold</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                        <Package className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">
                          {item.name || "Unnamed Item"}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {item.category || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {item.sku || "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">
                    {item.currentStock || 0}
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {item.lowStockThreshold || 0}
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {item.unit || "pcs"}
                  </td>

                  <td className="px-5 py-4">
                    <StockStatusBadge item={item} />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                        onClick={() => onEditItem?.(item)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                        onClick={() => onArchiveItem?.(item)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
