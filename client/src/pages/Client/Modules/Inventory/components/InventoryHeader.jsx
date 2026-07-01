import React from "react";
import { Boxes, RefreshCw } from "lucide-react";

export default function InventoryHeader({
  loading = false,
  refreshing = false,
  onRefresh,
}) {
  return (
    <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            <Boxes className="h-4 w-4 text-[var(--brand-gold)]" />
            Operations
          </div>

          <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            Inventory
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Track categories, items, stock movements, and low-stock monitoring
            for client workspace inventory.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <RefreshCw
            className={[
              "h-4 w-4",
              refreshing ? "animate-spin" : "",
            ].join(" ")}
          />
          Refresh
        </button>
      </div>
    </div>
  );
}
