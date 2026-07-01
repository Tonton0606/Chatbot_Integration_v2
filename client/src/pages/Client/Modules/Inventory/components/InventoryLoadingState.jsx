import React from "react";
import { RefreshCw } from "lucide-react";

export default function InventoryLoadingState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
        Loading inventory
      </h3>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Fetching categories, items, stock movements, and low-stock data.
      </p>
    </div>
  );
}
