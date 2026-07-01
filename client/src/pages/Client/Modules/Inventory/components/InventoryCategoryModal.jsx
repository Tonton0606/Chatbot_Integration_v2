import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

export default function InventoryCategoryModal({
  category = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const isEditing = !!category?.id;

  useEffect(() => {
    setForm({
      name: category?.name || "",
      description: category?.description || "",
    });
  }, [category]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit?.({
      name: form.name,
      description: form.description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              {isEditing ? "Edit Category" : "Add Category"}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Categories organize inventory items by business type or product
              group.
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
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Category Name
              </span>

              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Example: Accessories"
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description
              </span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Describe what this category contains."
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
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
