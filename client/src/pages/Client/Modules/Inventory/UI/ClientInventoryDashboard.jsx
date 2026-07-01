import React from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Layers3,
  Package,
} from "lucide-react";

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {value}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MovementBadge({ type }) {
  const labelMap = {
    stock_in: "Stock In",
    stock_out: "Stock Out",
    adjustment: "Adjustment",
    damage: "Damage",
    return: "Return",
  };

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
      {labelMap[type] || type}
    </span>
  );
}

export default function ClientInventoryDashboard({ data }) {
  const categories = data?.categories || [];
  const items = data?.items || [];
  const movements = data?.movements || [];
  const lowStockItems = data?.lowStockItems || [];

  const totalStock = items.reduce(
    (sum, item) => sum + Number(item.currentStock || 0),
    0
  );

  const recentMovements = movements.slice(0, 5);

  const healthyItems = Math.max(items.length - lowStockItems.length, 0);

  const healthPercent = items.length
    ? Math.round((healthyItems / items.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Categories"
          value={categories.length}
          description="Active inventory groups"
          icon={Layers3}
        />
        <StatCard
          title="Total Items"
          value={items.length}
          description="Tracked inventory items"
          icon={Package}
        />
        <StatCard
          title="Total Stock"
          value={totalStock}
          description="Combined quantity on hand"
          icon={Boxes}
        />
        <StatCard
          title="Low Stock"
          value={lowStockItems.length}
          description="Items needing attention"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Recent Movements
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Latest recorded stock activity for this workspace.
              </p>
            </div>

            <ArrowLeftRight className="h-5 w-5 text-slate-400" />
          </div>

          {recentMovements.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                No stock movements yet
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Movement history will appear here after stock is added, removed,
                adjusted, damaged, or returned.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Item</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Qty</th>
                    <th className="px-5 py-3 font-semibold">New Stock</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {recentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {movement.date}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">
                        {movement.itemName}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {movement.category}
                      </td>
                      <td className="px-5 py-4">
                        <MovementBadge type={movement.type} />
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {movement.quantity}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">
                        {movement.newStock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Inventory Health
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current stock health based on active inventory items.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Healthy Items
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {healthyItems}/{items.length}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                Data Driven
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                These metrics are calculated from live inventory categories,
                items, and movement records.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {lowStockItems.length} low-stock item
                    {lowStockItems.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    Review the Low Stock tab before creating stock adjustments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
