import React, { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

export default function InventoryItemModal({
  item = null,
  categories = [],
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    categoryId: "",
    name: "",
    sku: "",
    description: "",
    currentStock: "0",
    lowStockThreshold: "0",
    unit: "pcs",
  });

  const isEditing = !!item?.id;

  const activeCategories = useMemo(
    () => categories.filter((category) => category.active),
    [categories]
  );

  useEffect(() => {
    setForm({
      categoryId: item?.categoryId || activeCategories[0]?.id || "",
      name: item?.name || "",
      sku: item?.sku || "",
      description: item?.description || "",
      currentStock: String(item?.currentStock ?? 0),
      lowStockThreshold: String(item?.lowStockThreshold ?? 0),
      unit: item?.unit || "pcs",
    });
  }, [item, activeCategories]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit?.({
      categoryId: form.categoryId,
      name: form.name,
      sku: form.sku,
      description: form.description,
      currentStock: Number(form.currentStock || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      unit: form.unit,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              {isEditing ? "Edit Item" : "Add Item"}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Inventory items belong to categories and hold the current stock
              count used by low-stock monitoring.
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
          <div className="max-h-[62vh] space-y-5 overflow-y-auto p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Category
              </span>

              <select
                value={form.categoryId}
                onChange={(event) =>
                  updateField("categoryId", event.target.value)
                }
                disabled={saving || activeCategories.length === 0}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                required
              >
                <option value="">Select category</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {activeCategories.length === 0 ? (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
                  Create an inventory category before adding items.
                </p>
              ) : null}
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Item Name
                </span>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Example: USB-C Cable"
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  SKU
                </span>

                <input
                  type="text"
                  value={form.sku}
                  onChange={(event) => updateField("sku", event.target.value)}
                  placeholder="Example: ACC-CABLE-001"
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description
              </span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Describe this item."
                disabled={saving}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Current Stock
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentStock}
                  onChange={(event) =>
                    updateField("currentStock", event.target.value)
                  }
                  disabled={saving || isEditing}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                />

                {isEditing ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Use stock movement to change current stock.
                  </p>
                ) : null}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Low Threshold
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.lowStockThreshold}
                  onChange={(event) =>
                    updateField("lowStockThreshold", event.target.value)
                  }
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Unit
                </span>

                <input
                  type="text"
                  value={form.unit}
                  onChange={(event) => updateField("unit", event.target.value)}
                  placeholder="pcs"
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  required
                />
              </label>
            </div>
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
              disabled={saving || activeCategories.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? "Save Changes" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
