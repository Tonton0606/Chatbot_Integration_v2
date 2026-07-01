import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Settings2 } from "lucide-react";

import ClientEmployeeCards from "../../../components/client/hr/ClientEmployeeCards.jsx";
import ClientEmployeeFilters from "../../../components/client/hr/ClientEmployeeFilters.jsx";
import ClientEmployeeFormModal from "../../../components/client/hr/ClientEmployeeFormModal.jsx";
import ClientEmployeeTable from "../../../components/client/hr/ClientEmployeeTable.jsx";
import ClientHrSetupPanel from "../../../components/client/hr/ClientHrSetupPanel.jsx";

import {
  archiveClientDepartment,
  archiveClientEmployee,
  archiveClientPosition,
  createClientDepartment,
  createClientEmployee,
  createClientPosition,
  getClientHrData,
  getClientHrFormOptions,
  updateClientEmployee,
} from "../../../services/clientHr";

const emptyEmployeeForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  departmentId: "",
  positionId: "",
  managerEmployeeId: "",
  employmentType: "full_time",
  status: "active",
  hireDate: "",
};

export default function ClientEmployees() {
  const [activeTab, setActiveTab] = useState("employees");

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [formOptions, setFormOptions] = useState({
    departments: [],
    positions: [],
    managers: [],
    statuses: [],
    employmentTypes: [],
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    department: "all",
  });

  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyEmployeeForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      setLoading(true);
      setError("");

      const [hrData, options] = await Promise.all([
        getClientHrData(),
        getClientHrFormOptions(),
      ]);

      setEmployees(hrData.employees || []);
      setDepartments(hrData.departments || []);
      setPositions(hrData.positions || []);
      setFormOptions(options);
    } catch (err) {
      console.error("Client employees load error:", err);
      setError(err.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setForm(emptyEmployeeForm);
    setModalMode("create");
  }

  function openEditModal(employee) {
    setForm({
      employeeCode: employee.employeeCode || "",
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      departmentId: employee.departmentId || "",
      positionId: employee.positionId || "",
      managerEmployeeId: employee.managerEmployeeId || "",
      employmentType: employee.employmentType || "full_time",
      status:
        employee.status === "archived"
          ? "inactive"
          : employee.status || "active",
      hireDate: employee.hireDate || "",
    });

    setModalMode({
      type: "edit",
      id: employee.id,
    });
  }

  function closeModal() {
    setModalMode(null);
    setForm(emptyEmployeeForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (modalMode === "create") {
        await createClientEmployee(form);
      } else {
        await updateClientEmployee(modalMode.id, form);
      }

      closeModal();
      await loadEmployees();
    } catch (err) {
      alert(err.message || "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveEmployee(employee) {
    const confirmed = window.confirm(
      `Archive "${employee.name}"?\n\nArchived employees disappear from active HR lists but remain recoverable in the database.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await archiveClientEmployee(employee.id);
      await loadEmployees();
    } catch (err) {
      alert(err.message || "Failed to archive employee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDepartment(payload) {
    try {
      setSaving(true);
      await createClientDepartment(payload);
      await loadEmployees();
    } catch (err) {
      alert(err.message || "Failed to create department.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveDepartment(department) {
    const confirmed = window.confirm(
      `Archive "${department.name}"?\n\nEmployees assigned to this department will remain, but the department will disappear from active setup lists.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await archiveClientDepartment(department.id);
      await loadEmployees();
    } catch (err) {
      alert(err.message || "Failed to archive department.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePosition(payload) {
    try {
      setSaving(true);
      await createClientPosition(payload);
      await loadEmployees();
    } catch (err) {
      alert(err.message || "Failed to create position.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchivePosition(position) {
    const confirmed = window.confirm(
      `Archive "${position.title}"?\n\nEmployees assigned to this position will remain, but the position will disappear from active setup lists.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await archiveClientPosition(position.id);
      await loadEmployees();
    } catch (err) {
      alert(err.message || "Failed to archive position.");
    } finally {
      setSaving(false);
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return employees.filter((employee) => {
      if (employee.archivedAt) return false;

      const matchesSearch =
        !query ||
        employee.name?.toLowerCase().includes(query) ||
        employee.employeeCode?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.department?.toLowerCase().includes(query) ||
        employee.position?.toLowerCase().includes(query);

      const matchesStatus =
        filters.status === "all" || employee.status === filters.status;

      const matchesDepartment =
        filters.department === "all" ||
        employee.department === filters.department;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, filters]);

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Human Resources
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
            Employees
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Manage workspace employee records, departments, and positions used
            by teams, assignments, projects, tasks, and ownership flows.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadEmployees}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Settings2 className="h-4 w-4" />
            HR Setup
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)]">
        <TabButton
          active={activeTab === "employees"}
          onClick={() => setActiveTab("employees")}
        >
          Employees
        </TabButton>

        <TabButton
          active={activeTab === "setup"}
          onClick={() => setActiveTab("setup")}
        >
          HR Setup
        </TabButton>
      </div>

      {loading && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Loading employees...
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

            <div>
              <h3 className="font-semibold text-[var(--danger)]">
                Failed to load employees
              </h3>

              <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>

              <button
                type="button"
                onClick={loadEmployees}
                className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "employees" && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Total Employees" value={employees.length} />

            <SummaryCard
              label="Active Employees"
              value={
                employees.filter((employee) => employee.status === "active")
                  .length
              }
            />

            <SummaryCard label="Departments" value={departments.length} />

            <SummaryCard label="Positions" value={positions.length} />
          </div>

          <ClientEmployeeFilters
            search={filters.search}
            status={filters.status}
            department={filters.department}
            departments={departments}
            onSearchChange={(search) =>
              setFilters((current) => ({
                ...current,
                search,
              }))
            }
            onStatusChange={(status) =>
              setFilters((current) => ({
                ...current,
                status,
              }))
            }
            onDepartmentChange={(department) =>
              setFilters((current) => ({
                ...current,
                department,
              }))
            }
          />

          <div className="hidden lg:block">
            <ClientEmployeeTable
              employees={filteredEmployees}
              onEdit={openEditModal}
              onArchive={handleArchiveEmployee}
            />
          </div>

          <ClientEmployeeCards
            employees={filteredEmployees}
            onEdit={openEditModal}
            onArchive={handleArchiveEmployee}
          />
        </>
      )}

      {!loading && !error && activeTab === "setup" && (
        <ClientHrSetupPanel
          departments={departments}
          positions={positions}
          saving={saving}
          onCreateDepartment={handleCreateDepartment}
          onArchiveDepartment={handleArchiveDepartment}
          onCreatePosition={handleCreatePosition}
          onArchivePosition={handleArchivePosition}
        />
      )}

      {modalMode && (
        <ClientEmployeeFormModal
          mode={modalMode === "create" ? "create" : "edit"}
          form={form}
          formOptions={formOptions}
          saving={saving}
          onChange={setForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>

      <h3 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </h3>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm font-semibold ${
        active
          ? "border-[var(--brand-gold)] text-[var(--brand-gold)]"
          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}
