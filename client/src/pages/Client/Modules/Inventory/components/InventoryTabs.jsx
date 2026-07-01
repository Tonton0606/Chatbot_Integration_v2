import React from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Layers3,
  LayoutDashboard,
  Package,
} from "lucide-react";

export const INVENTORY_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "categories", label: "Categories", icon: Layers3 },
  { id: "items", label: "Items", icon: Package },
  { id: "movements", label: "Movements", icon: ArrowLeftRight },
  { id: "low_stock", label: "Low Stock", icon: AlertTriangle },
];

export default function InventoryTabs({ activeTab, onChange }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {INVENTORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "bg-[var(--brand-gold)] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
