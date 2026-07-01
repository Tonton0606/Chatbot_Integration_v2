import { useEffect, useMemo, useState } from "react";

import {
  EmployeeDetailDrawer,
  EmployeeFormModal,
  EmployeeLeaveBalanceModal,
  EmployeesDirectoryView,
  EmployeesErrorState,
  EmployeesFilterToolbar,
  EmployeesHeader,
  EmployeesKPICards,
  EmployeesListView,
  EmployeesLoadingState,
  EmployeesViewTabs,
} from "../../components/admin/layout/Admin_Employees_Components.jsx";

import {
  archiveEmployee,
  createEmployee,
  getEmployeeFormOptions,
  getEmployeesData,
  restoreEmployee,
  updateEmployee,
  updateEmployeeLeaveBalance,
} from "../../services/human_resources/employees";

const EMPTY_FORM = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  salary: "",
  departmentId: "",
  positionId: "",
  type: "full_time",
  status: "active",
  hireDate: "",
};

const EMPTY_LEAVE_FORM = {
  allocatedDays: 0,
  isPaid: false,
  isUnlimited: false,
  notes: "",
};

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [types, setTypes] = useState([]);
  const [formOptions, setFormOptions] = useState({
    departments: [],
    positions: [],
    statuses: [],
    types: [],
    managers: [],
  });

  const [activeView, setActiveView] = useState("list");
  const [recordScope, setRecordScope] = useState("active");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(EMPTY_FORM);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveBalance, setSelectedLeaveBalance] = useState(null);
  const [leaveForm, setLeaveForm] = useState(EMPTY_LEAVE_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    department: "all",
    status: "all",
    type: "all",
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      setLoading(true);
      setError("");

      const [employeeData, options] = await Promise.all([
        getEmployeesData({ includeInactive: true }),
        getEmployeeFormOptions(),
      ]);

      setEmployees(employeeData.employees || []);
      setDepartments(employeeData.departments || []);
      setStatuses(employeeData.statuses || []);
      setTypes(employeeData.types || []);
      setFormOptions(options);
    } catch (err) {
      console.error("Employees load error:", err);
      setError(err.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateEmployee() {
    setEditingEmployee(null);
    setEmployeeForm(EMPTY_FORM);
    setShowEmployeeModal(true);
  }

  function openEditEmployee(employee) {
    setEditingEmployee(employee);
    setSelectedEmployee(null);

    setEmployeeForm({
      employeeCode: employee.employeeCode || "",
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      salary: employee.salary || "",
      departmentId: employee.departmentId || "",
      positionId: employee.positionId || "",
      type: employee.type || "full_time",
      status: employee.status || "active",
      hireDate: employee.hireDate || "",
    });

    setShowEmployeeModal(true);
  }

  function closeEmployeeModal() {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeForm(EMPTY_FORM);
  }

  function openLeaveModal(balance, employee) {
    setSelectedEmployee(employee);
    setSelectedLeaveBalance(balance);

    setLeaveForm({
      allocatedDays: balance.allocatedDays || 0,
      isPaid: balance.isPaid || false,
      isUnlimited: balance.isUnlimited || false,
      notes: balance.notes || "",
    });

    setShowLeaveModal(true);
  }

  function closeLeaveModal() {
    setShowLeaveModal(false);
    setSelectedLeaveBalance(null);
    setLeaveForm(EMPTY_LEAVE_FORM);
  }

  async function handleSaveEmployee(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingEmployee?.id) {
        await updateEmployee(editingEmployee.id, employeeForm);
      } else {
        await createEmployee(employeeForm);
      }

      closeEmployeeModal();
      await loadEmployees();
    } catch (err) {
      console.error("Save employee error:", err);
      alert(err.message || "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLeaveBalance(event) {
    event.preventDefault();

    if (!selectedLeaveBalance?.id) {
      alert("Leave balance ID is missing.");
      return;
    }

    try {
      setSaving(true);

      await updateEmployeeLeaveBalance(selectedLeaveBalance.id, leaveForm);

      closeLeaveModal();
      await loadEmployees();
    } catch (err) {
      console.error("Update leave entitlement error:", err);
      alert(err.message || "Failed to update leave entitlement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreEmployee(employee) {
    const confirmed = window.confirm(
      `Restore ${employee.name}? This will return the employee to active records.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await restoreEmployee(employee.id);

      setSelectedEmployee(null);
      await loadEmployees();
    } catch (err) {
      console.error("Restore employee error:", err);
      alert(err.message || "Failed to restore employee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveEmployee(employee) {
    const confirmed = window.confirm(
      `Archive ${employee.name}? This will hide the employee from active records.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await archiveEmployee(employee.id);

      setSelectedEmployee(null);
      await loadEmployees();
    } catch (err) {
      console.error("Archive employee error:", err);
      alert(err.message || "Failed to archive employee.");
    } finally {
      setSaving(false);
    }
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesScope =
        recordScope === "archived"
          ? employee.status !== "active"
          : employee.status === "active";

      const search = filters.search.trim().toLowerCase();

      const matchesSearch =
        !search ||
        employee.name.toLowerCase().includes(search) ||
        employee.employeeCode.toLowerCase().includes(search) ||
        employee.email?.toLowerCase().includes(search) ||
        employee.position.toLowerCase().includes(search);

      return (
        matchesScope &&
        matchesSearch &&
        (filters.department === "all" ||
          employee.department === filters.department) &&
        (filters.status === "all" || employee.status === filters.status) &&
        (filters.type === "all" || employee.type === filters.type)
      );
    });
  }, [employees, filters, recordScope]);

  return (
    <div className="space-y-6">
      <EmployeesHeader
        onRefresh={loadEmployees}
        onCreate={openCreateEmployee}
      />

      {loading && <EmployeesLoadingState />}

      {!loading && error && (
        <EmployeesErrorState message={error} onRetry={loadEmployees} />
      )}

      {!loading && !error && (
        <>
          <EmployeesKPICards employees={filteredEmployees} />

          <div className="space-y-4">
            <EmployeesViewTabs
              activeView={activeView}
              onViewChange={setActiveView}
              recordScope={recordScope}
              onScopeChange={setRecordScope}
            />

            <EmployeesFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              departments={departments}
              statuses={statuses}
              types={types}
              formOptions={formOptions}
            />

            {activeView === "list" && (
              <EmployeesListView
                employees={filteredEmployees}
                onRowClick={setSelectedEmployee}
              />
            )}

            {activeView === "directory" && (
              <EmployeesDirectoryView
                employees={filteredEmployees}
                onCardClick={setSelectedEmployee}
              />
            )}
          </div>
        </>
      )}

      {selectedEmployee && (
        <EmployeeDetailDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onEdit={openEditEmployee}
          onArchive={handleArchiveEmployee}
          onRestore={handleRestoreEmployee}
          onEditLeaveBalance={openLeaveModal}
          saving={saving}
        />
      )}

      {showEmployeeModal && (
        <EmployeeFormModal
          mode={editingEmployee ? "edit" : "create"}
          form={employeeForm}
          onChange={setEmployeeForm}
          onSubmit={handleSaveEmployee}
          onClose={closeEmployeeModal}
          saving={saving}
          formOptions={formOptions}
        />
      )}

      {showLeaveModal && (
        <EmployeeLeaveBalanceModal
          employee={selectedEmployee}
          balance={selectedLeaveBalance}
          form={leaveForm}
          onChange={setLeaveForm}
          onSubmit={handleSaveLeaveBalance}
          onClose={closeLeaveModal}
          saving={saving}
        />
      )}
    </div>
  );
}
