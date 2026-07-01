import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function InventoryErrorState({
  message,
  onRetry,
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-rose-900 dark:text-rose-100">
              Failed to load inventory
            </h3>

            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
              {message ||
                "Something went wrong while loading inventory data."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
