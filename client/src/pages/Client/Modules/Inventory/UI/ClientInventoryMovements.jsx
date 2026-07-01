import React from "react";
import { ArrowLeftRight, Download, Plus } from "lucide-react";

function MovementTypeBadge({ type }) {
  const labels = {
    stock_in: "Received",
    stock_out: "Issued",
    adjustment: "Adjusted",
    damage: "Damaged",
    return: "Returned",
  };

  const styles = {
    stock_in:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    stock_out:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    adjustment:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    damage:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    return:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[type] ||
          "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
      ].join(" ")}
    >
      {labels[type] || type || "Unknown"}
    </span>
  );
}

export default function ClientInventoryMovements({
  data,
  onCreateMovement,
}) {
  const movements = data?.movements || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Inventory Movements
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Audit trail of every inventory change made in this workspace.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            onClick={() => {}}
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            onClick={onCreateMovement}
          >
            <Plus className="h-4 w-4" />
            Add Movement
          </button>
        </div>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <ArrowLeftRight className="h-7 w-7" />
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
            No inventory movements yet
          </h3>

          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Movement records will appear here whenever inventory is received,
            issued, adjusted, damaged, or returned.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Item</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Movement</th>
                <th className="px-5 py-3 font-semibold">Quantity</th>
                <th className="px-5 py-3 font-semibold">Previous Stock</th>
                <th className="px-5 py-3 font-semibold">New Stock</th>
                <th className="px-5 py-3 font-semibold">Reason</th>
                <th className="px-5 py-3 font-semibold">Recorded By</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {movement.date || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                        <ArrowLeftRight className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">
                          {movement.itemName || "Unknown Item"}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {movement.itemSku
                            ? `SKU: ${movement.itemSku}`
                            : "No SKU"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {movement.category || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <MovementTypeBadge type={movement.type} />
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">
                    {movement.quantity || 0}
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {movement.previousStock || 0}
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">
                    {movement.newStock || 0}
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {movement.reason || "—"}
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {movement.recordedBy || "—"}
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
