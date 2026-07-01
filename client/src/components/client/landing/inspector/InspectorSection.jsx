import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function InspectorSection({
  title,
  description = "",
  defaultOpen = true,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-black text-[var(--text-primary)]">
            {title}
          </span>
          {description && (
            <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
              {description}
            </span>
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="grid gap-4 border-t border-[var(--border-color)] p-4">
          {children}
        </div>
      )}
    </section>
  );
}
