import React from "react";
import { AlertTriangle, PackageSearch, ShoppingCart } from "lucide-react";

export default function ClientInventoryLowStock({
  data,
  onReviewRestock,
}) {
  const lowStockItems = data?.lowStockItems || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Low Stock Items
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Items where current stock is equal to or below the configured
            low-stock threshold.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          {lowStockItems.length} item
          {lowStockItems.length === 1 ? "" : "s"} need review
        </div>
      </div>

      {lowStockItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <PackageSearch className="h-7 w-7" />
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
            No low-stock items
          </h3>

          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            All active inventory items are currently above their configured
            low-stock thresholds.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Item</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Current Stock</th>
                <th className="px-5 py-3 font-semibold">Threshold</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 font-semibold">Suggested Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {lowStockItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">
                          {item.name || "Unnamed Item"}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.sku || "No SKU"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {item.category || "—"}
                  </td>

                  <td className="px-5 py-4 font-semibold text-amber-700 dark:text-amber-300">
                    {item.currentStock || 0}
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {item.lowStockThreshold || 0}
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {item.unit || "pcs"}
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
                      onClick={() => onReviewRestock?.(item)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Review Restock
                    </button>
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
