import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";

function isAdminRole(role) {
  return ["admin", "superadmin"].includes(
    String(role || "").toLowerCase()
  );
}

function statusClass(status) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function roleClass(role) {
  if (isAdminRole(role)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export function AccountControlHeader({ onRefresh }) {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Account Control
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage admin and client accounts, status, and access.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}

export function AccountControlKPIs({ accounts }) {
  const activeCount = accounts.filter(
    (account) => account.status === "active"
  ).length;

  const inactiveCount = accounts.filter(
    (account) => account.status === "inactive"
  ).length;

  const adminCount = accounts.filter((account) =>
    isAdminRole(account.role)
  ).length;

  const cards = [
    {
      label: "Total Accounts",
      value: accounts.length,
      icon: UserCog,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      label: "Admins",
      value: adminCount,
      icon: ShieldCheck,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      label: "Active",
      value: activeCount,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: AlertCircle,
      color: "text-red-600 bg-red-50 border-red-200",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {card.label}
                </p>

                <h3 className="mt-4 text-3xl font-bold text-gray-900">
                  {card.value}
                </h3>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AccountSearchBar({
  searchTerm,
  onSearchChange,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search accounts..."
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}

export function AccountsTable({
  title,
  description,
  rows,
  type,
  onEdit,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <div className="flex items-center gap-2">
          {type === "admin" ? (
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          ) : (
            <Users className="h-5 w-5 text-gray-600" />
          )}

          <h2 className="text-lg font-bold text-gray-900">
            {title}
          </h2>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 && (
            <tr>
              <td
                colSpan="5"
                className="px-4 py-8 text-center text-gray-500"
              >
                No accounts found.
              </td>
            </tr>
          )}

          {rows.map((account) => (
            <tr key={account.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-semibold text-gray-900">
                  {account.full_name || "Unnamed Account"}
                </p>

                <p className="text-xs text-gray-500">
                  {account.email}
                </p>
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${roleClass(
                    account.role
                  )}`}
                >
                  {account.role || "Client"}
                </span>
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    account.status
                  )}`}
                >
                  {account.status || "active"}
                </span>
              </td>

              <td className="px-4 py-3 text-gray-600">
                {account.created_at
                  ? new Date(account.created_at).toLocaleDateString(
                      "en-PH"
                    )
                  : "—"}
              </td>

              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(account)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EditAccountModal({
  account,
  form,
  saving,
  roleOptions,
  statusOptions,
  onChange,
  onClose,
  onSave,
}) {
  if (!account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Edit Account
            </h2>

            <p className="text-sm text-gray-500">
              {account.email}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 p-5">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Full Name
            </label>

            <input
              value={form.full_name}
              onChange={(e) =>
                onChange("full_name", e.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Role
            </label>

            <select
              value={form.role}
              onChange={(e) =>
                onChange("role", e.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Status
            </label>

            <select
              value={form.status}
              onChange={(e) =>
                onChange("status", e.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccountControlLoadingState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />

      <p className="mt-3 text-sm font-medium text-gray-600">
        Loading accounts...
      </p>
    </div>
  );
}

export function AccountControlErrorState({
  message,
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600" />

        <div>
          <h3 className="font-semibold text-red-900">
            Failed to load accounts
          </h3>

          <p className="mt-1 text-sm text-red-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
