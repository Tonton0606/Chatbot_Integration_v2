import {
  AlertCircle,
  Boxes,
  Building2,
  CheckCircle2,
  Edit,
  FileText,
  Grid3X3,
  Plus,
  RefreshCw,
  Route,
  Search,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";

import { ERP_REGISTRY_STATUSES } from "../../../services/operations/erp_registry";

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusClass(status) {
  if (status === "active")
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  if (status === "beta")
    return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
  if (status === "planned")
    return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

  return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
}

function visibilityLabel(adminVisible, clientVisible) {
  if (adminVisible && clientVisible) return "Admin + Client";
  if (adminVisible) return "Admin only";
  if (clientVisible) return "Client only";
  return "Hidden";
}

export function ERPRegistryHeader({ onRefresh, onCreateDivision, onCreateFeature }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          Admin <span className="mx-1">›</span>{" "}
          <span className="text-[var(--brand-gold)]">ERP Registry</span>
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">ERP Registry</h1>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage global ERP divisions, features, routes, statuses, and platform
          capability metadata.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm hover:bg-[var(--hover-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        <button
          type="button"
          onClick={onCreateDivision}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-gold)] shadow-sm hover:bg-[var(--brand-gold-soft)]"
        >
          <Plus className="h-4 w-4" />
          Division
        </button>

        <button
          type="button"
          onClick={onCreateFeature}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-gold-hover)]"
        >
          <Plus className="h-4 w-4" />
          Feature
        </button>
      </div>
    </div>
  );
}

export function ERPRegistryLoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading ERP registry...
      </p>
    </div>
  );
}

export function ERPRegistryErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load ERP registry
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function ERPRegistryKPICards({ divisions = [], features = [] }) {
  const activeFeatures = features.filter((feature) => feature.status === "active");
  const betaFeatures = features.filter((feature) => feature.status === "beta");
  const plannedFeatures = features.filter((feature) => feature.status === "planned");

  const cards = [
    {
      label: "Divisions",
      value: divisions.length,
      icon: Grid3X3,
      color: "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    },
    {
      label: "Features",
      value: features.length,
      icon: Boxes,
      color: "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    },
    {
      label: "Active / Beta",
      value: `${activeFeatures.length} / ${betaFeatures.length}`,
      icon: CheckCircle2,
      color: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    },
    {
      label: "Planned",
      value: plannedFeatures.length,
      icon: FileText,
      color: "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>

                <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">
                  Global platform registry
                </p>
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

export function ERPRegistryToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  divisionFilter,
  onDivisionFilterChange,
  divisions = [],
  view,
  onViewChange,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />

        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search divisions, features, routes, keys..."
          className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-gold)]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={divisionFilter}
          onChange={(event) => onDivisionFilterChange(event.target.value)}
          className="h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--brand-gold)]"
        >
          <option value="all">All divisions</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.title}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--brand-gold)]"
        >
          <option value="all">All statuses</option>
          {ERP_REGISTRY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onViewChange("features")}
          className={
            view === "features"
              ? "rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white"
              : "rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          }
        >
          Features
        </button>

        <button
          type="button"
          onClick={() => onViewChange("divisions")}
          className={
            view === "divisions"
              ? "rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white"
              : "rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          }
        >
          Divisions
        </button>
      </div>
    </div>
  );
}

export function DivisionRegistryTable({ divisions = [], onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Division</th>
            <th className="px-4 py-3">Key</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {divisions.map((division) => (
            <tr key={division.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]">
                    <Building2 className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {division.title}
                    </p>
                    <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">
                      {division.description || "No description"}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">
                <code className="rounded-lg bg-[var(--hover-bg)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                  {division.division_key}
                </code>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {visibilityLabel(division.admin_visible, division.client_visible)}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    division.status
                  )}`}
                >
                  {division.status}
                </span>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {division.order_index}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {formatDate(division.updated_at)}
              </td>

              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(division)}
                    className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(division)}
                    className="rounded-lg border border-red-500/20 p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {!divisions.length && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)]">
                No divisions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FeatureRegistryTable({ features = [], onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Feature</th>
            <th className="px-4 py-3">Division</th>
            <th className="px-4 py-3">Routes</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Auto</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {features.map((feature) => (
            <tr key={feature.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]">
                    <Settings2 className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {feature.label}
                    </p>

                    <code className="mt-1 inline-block rounded-lg bg-[var(--hover-bg)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                      {feature.feature_key}
                    </code>

                    <p className="mt-2 max-w-md text-xs text-[var(--text-muted)]">
                      {feature.description || "No description"}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {feature.division?.title || "—"}
              </td>

              <td className="px-4 py-3">
                <div className="space-y-1">
                  <RouteBadge label="Admin" value={feature.admin_route} />
                  <RouteBadge label="Client" value={feature.client_route} />
                </div>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {visibilityLabel(feature.admin_visible, feature.client_visible)}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    feature.status
                  )}`}
                >
                  {feature.status}
                </span>
              </td>

              <td className="px-4 py-3">
                {feature.auto_enable_with_division ? (
                  <ToggleRight className="h-6 w-6 text-[var(--success)]" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-[var(--text-muted)]" />
                )}
              </td>

              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(feature)}
                    className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(feature)}
                    className="rounded-lg border border-red-500/20 p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {!features.length && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)]">
                No features found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RouteBadge({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs font-semibold text-[var(--text-muted)]">{label}</span>

      {value ? (
        <code className="rounded-lg bg-[var(--hover-bg)] px-2 py-1 text-xs text-[var(--text-secondary)]">
          {value}
        </code>
      ) : (
        <span className="text-xs text-[var(--text-muted)]">—</span>
      )}
    </div>
  );
}

export function DivisionFormModal({
  open,
  mode,
  form,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  return (
    <RegistryModal
      title={mode === "edit" ? "Edit Division" : "Create Division"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Division Key"
          value={form.division_key}
          onChange={(value) => onChange("division_key", value)}
          placeholder="sales_crm"
        />

        <TextField
          label="Title"
          value={form.title}
          onChange={(value) => onChange("title", value)}
          placeholder="Sales & CRM"
          required
        />

        <TextField
          label="Icon"
          value={form.icon}
          onChange={(value) => onChange("icon", value)}
          placeholder="Users"
        />

        <TextArea
          label="Description"
          value={form.description}
          onChange={(value) => onChange("description", value)}
        />

        <FormGrid>
          <NumberField
            label="Order"
            value={form.order_index}
            onChange={(value) => onChange("order_index", value)}
          />

          <StatusField
            value={form.status}
            onChange={(value) => onChange("status", value)}
          />
        </FormGrid>

        <TextField
          label="Status Note"
          value={form.status_note}
          onChange={(value) => onChange("status_note", value)}
          placeholder="Need to develop."
        />

        <VisibilityFields form={form} onChange={onChange} />

        <ModalActions saving={saving} onClose={onClose} />
      </form>
    </RegistryModal>
  );
}

export function FeatureFormModal({
  open,
  mode,
  form,
  divisions,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  return (
    <RegistryModal
      title={mode === "edit" ? "Edit Feature" : "Create Feature"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGrid>
          <SelectField
            label="Division"
            value={form.division_id}
            onChange={(value) => onChange("division_id", value)}
            required
          >
            <option value="">Select division</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.title}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Feature Key"
            value={form.feature_key}
            onChange={(value) => onChange("feature_key", value)}
            placeholder="crm"
          />
        </FormGrid>

        <FormGrid>
          <TextField
            label="Label"
            value={form.label}
            onChange={(value) => onChange("label", value)}
            placeholder="CRM"
            required
          />

          <TextField
            label="Icon"
            value={form.icon}
            onChange={(value) => onChange("icon", value)}
            placeholder="Users"
          />
        </FormGrid>

        <TextArea
          label="Description"
          value={form.description}
          onChange={(value) => onChange("description", value)}
        />

        <FormGrid>
          <TextField
            label="Admin Route"
            value={form.admin_route}
            onChange={(value) => onChange("admin_route", value)}
            placeholder="/Admin/CRM"
          />

          <TextField
            label="Client Route"
            value={form.client_route}
            onChange={(value) => onChange("client_route", value)}
            placeholder="/Client/CRM"
          />
        </FormGrid>

        <FormGrid>
          <NumberField
            label="Order"
            value={form.order_index}
            onChange={(value) => onChange("order_index", value)}
          />

          <StatusField
            value={form.status}
            onChange={(value) => onChange("status", value)}
          />
        </FormGrid>

        <TextField
          label="Status Note"
          value={form.status_note}
          onChange={(value) => onChange("status_note", value)}
          placeholder="Need to develop."
        />

        <VisibilityFields form={form} onChange={onChange} />

        <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-3">
          <input
            type="checkbox"
            checked={!!form.auto_enable_with_division}
            onChange={(event) =>
              onChange("auto_enable_with_division", event.target.checked)
            }
          />
          <span className="text-sm font-semibold text-[var(--text-secondary)]">
            Auto-enable when division is enabled
          </span>
        </label>

        <ModalActions saving={saving} onClose={onClose} />
      </form>
    </RegistryModal>
  );
}

function RegistryModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--bg-card)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            Close
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormGrid({ children }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function TextField({ label, value, onChange, placeholder, required }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>

      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 h-11 w-full rounded-xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>

      <input
        type="number"
        value={value ?? 0}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-[var(--border-color)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>

      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-gold)]"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, children, required }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>

      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
      >
        {children}
      </select>
    </label>
  );
}

function StatusField({ value, onChange }) {
  return (
    <SelectField label="Status" value={value} onChange={onChange}>
      {ERP_REGISTRY_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </SelectField>
  );
}

function VisibilityFields({ form, onChange }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-3">
        <input
          type="checkbox"
          checked={!!form.admin_visible}
          onChange={(event) => onChange("admin_visible", event.target.checked)}
        />
        <span className="text-sm font-semibold text-[var(--text-secondary)]">
          Admin visible
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-3">
        <input
          type="checkbox"
          checked={!!form.client_visible}
          onChange={(event) => onChange("client_visible", event.target.checked)}
        />
        <span className="text-sm font-semibold text-[var(--text-secondary)]">
          Client visible
        </span>
      </label>
    </div>
  );
}

function ModalActions({ saving, onClose }) {
  return (
    <div className="flex justify-end gap-2 border-t border-[var(--border-color)] pt-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
