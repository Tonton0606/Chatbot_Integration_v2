import { Search } from "lucide-react";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

export default function ClientEmployeeFilters({
  search = "",
  status = "all",
  department = "all",
  departments = [],
  onSearchChange,
  onStatusChange,
  onDepartmentChange,
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              onSearchChange?.(event.target.value)
            }
            placeholder="Search employee, email, position..."
            className={`pl-10 ${inputClass}`}
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            onStatusChange?.(event.target.value)
          }
          className={inputClass}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="onboarding">Onboarding</option>
        </select>

        <select
          value={department}
          onChange={(event) =>
            onDepartmentChange?.(event.target.value)
          }
          className={inputClass}
        >
          <option value="all">All Departments</option>

          {departments.map((item) => (
            <option
              key={item.id}
              value={item.name}
            >
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
