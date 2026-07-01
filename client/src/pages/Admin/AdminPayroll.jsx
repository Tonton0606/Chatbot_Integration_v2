import { useEffect, useMemo, useState } from "react";

import {
  PayrollAIInsights,
  PayrollEmployeesTable,
  PayrollErrorState,
  PayrollHeader,
  PayrollItemFormModal,
  PayrollKPICards,
  PayrollLoadingState,
  PayrollRunFormModal,
  PayrollRunsTable,
} from "../../components/admin/layout/Admin_Payroll_Components.jsx";

import {
  createPayrollItem,
  createPayrollRun,
  deletePayrollItem,
  deletePayrollRun,
  generatePayrollItemsForRun,
  getPayrollData,
  updatePayrollItem,
  updatePayrollRun,
  updatePayrollRunStatus,
} from "../../services/human_resources/payroll";

const EMPTY_RUN_FORM = {
  payrollCode: "",
  periodLabel: "",
  periodStart: "",
  periodEnd: "",
  status: "draft",
};

const EMPTY_ITEM_FORM = {
  payrollRunId: "",
  employeeId: "",
  basicSalary: 0,
  allowances: 0,
  overtimePay: 0,
  bonus: 0,
  deductions: 0,
  status: "pending",
};

export default function AdminPayroll() {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [payrollEmployees, setPayrollEmployees] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [insights, setInsights] = useState([]);

  const [selectedRunId, setSelectedRunId] = useState("");

  const [showRunModal, setShowRunModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [runForm, setRunForm] = useState(EMPTY_RUN_FORM);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPayroll();
  }, []);

  async function loadPayroll() {
    try {
      setLoading(true);
      setError("");

      const data = await getPayrollData();

      const runs = data.payrollRuns || [];

      setPayrollRuns(runs);
      setPayrollEmployees(data.payrollEmployees || []);
      setEmployees(data.employees || []);
      setInsights(data.insights || []);

      setSelectedRunId((current) => {
        if (current && runs.some((run) => run.id === current)) {
          return current;
        }

        return runs[0]?.id || "";
      });
    } catch (err) {
      console.error("Payroll load error:", err);
      setError(err.message || "Failed to load payroll.");
    } finally {
      setLoading(false);
    }
  }

  const selectedRun = useMemo(() => {
    return payrollRuns.find((run) => run.id === selectedRunId) || payrollRuns[0] || null;
  }, [payrollRuns, selectedRunId]);

  const selectedRunItems = useMemo(() => {
    if (!selectedRun?.id) return [];

    return payrollEmployees.filter(
      (item) => item.payrollRunId === selectedRun.id
    );
  }, [payrollEmployees, selectedRun]);

  function openCreateRun() {
    setEditingRun(null);
    setRunForm(EMPTY_RUN_FORM);
    setShowRunModal(true);
  }

  function openEditRun(run) {
    setEditingRun(run);
    setRunForm({
      payrollCode: run.payrollCode || "",
      periodLabel: run.periodLabel || run.period || "",
      periodStart: run.periodStart || "",
      periodEnd: run.periodEnd || "",
      status: run.status || "draft",
    });
    setShowRunModal(true);
  }

  function closeRunModal() {
    setShowRunModal(false);
    setEditingRun(null);
    setRunForm(EMPTY_RUN_FORM);
  }

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({
      ...EMPTY_ITEM_FORM,
      payrollRunId: selectedRun?.id || payrollRuns[0]?.id || "",
    });
    setShowItemModal(true);
  }

  function openEditItem(item) {
    setEditingItem(item);
    setItemForm({
      payrollRunId: item.payrollRunId || "",
      employeeId: item.employeeId || "",
      basicSalary: item.basicSalary || 0,
      allowances: item.allowances || 0,
      overtimePay: item.overtimePay || item.overtime || 0,
      bonus: item.bonus || 0,
      deductions: item.deductions || 0,
      status: item.status || "pending",
    });
    setShowItemModal(true);
  }

  function closeItemModal() {
    setShowItemModal(false);
    setEditingItem(null);
    setItemForm(EMPTY_ITEM_FORM);
  }

  async function handleSaveRun(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingRun?.id) {
        await updatePayrollRun(editingRun.id, runForm);
      } else {
        await createPayrollRun(runForm);
      }

      closeRunModal();
      await loadPayroll();
    } catch (err) {
      console.error("Save payroll run error:", err);
      alert(err.message || "Failed to save payroll run.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveItem(event) {
    event.preventDefault();

    try {
      setSaving(true);

      const duplicate = payrollEmployees.find(
        (item) =>
          item.payrollRunId === itemForm.payrollRunId &&
          item.employeeId === itemForm.employeeId &&
          item.id !== editingItem?.id
      );

      if (duplicate) {
        throw new Error(
          "This employee already has a payroll item for the selected payroll run. Edit the existing item instead."
        );
      }

      if (editingItem?.id) {
        await updatePayrollItem(editingItem.id, itemForm);
      } else {
        await createPayrollItem(itemForm);
      }

      closeItemModal();
      await loadPayroll();
    } catch (err) {
      console.error("Save payroll item error:", err);
      alert(err.message || "Failed to save payroll item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRun(run) {
    const confirmed = window.confirm(`Delete payroll run ${run.payrollCode}?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      await deletePayrollRun(run.id);
      await loadPayroll();
    } catch (err) {
      console.error("Delete payroll run error:", err);
      alert(err.message || "Failed to delete payroll run.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(item) {
    const confirmed = window.confirm(`Delete payroll item for ${item.employee}?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      await deletePayrollItem(item.id, item.payrollRunId);
      await loadPayroll();
    } catch (err) {
      console.error("Delete payroll item error:", err);
      alert(err.message || "Failed to delete payroll item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePayroll(run) {
    const confirmed = window.confirm(
      `Generate payroll items for ${run.payrollCode}? This will create/update employee payroll items using salary, overtime, and unpaid leave.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await generatePayrollItemsForRun(run.id);
      setSelectedRunId(run.id);
      await loadPayroll();
    } catch (err) {
      console.error("Generate payroll error:", err);
      alert(err.message || "Failed to generate payroll items.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRunStatus(id, status) {
    try {
      setSaving(true);
      await updatePayrollRunStatus(id, status);
      await loadPayroll();
    } catch (err) {
      console.error("Payroll status error:", err);
      alert(err.message || "Failed to update payroll status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PayrollHeader
        onRefresh={loadPayroll}
        onCreateRun={openCreateRun}
        onCreateItem={openCreateItem}
      />

      {loading && <PayrollLoadingState />}

      {!loading && error && (
        <PayrollErrorState message={error} onRetry={loadPayroll} />
      )}

      {!loading && !error && (
        <>
          <PayrollAIInsights insights={insights} />

          <PayrollKPICards payrollRuns={payrollRuns} selectedRun={selectedRun} />

          <PayrollRunsTable
            payrollRuns={payrollRuns}
            selectedRunId={selectedRun?.id}
            saving={saving}
            onSelect={setSelectedRunId}
            onEdit={openEditRun}
            onDelete={handleDeleteRun}
            onGenerate={handleGeneratePayroll}
            onApprove={(id) => handleRunStatus(id, "approved")}
            onDisburse={(id) => handleRunStatus(id, "disbursed")}
          />

          <PayrollEmployeesTable
            selectedRun={selectedRun}
            payrollEmployees={selectedRunItems}
            saving={saving}
            onEdit={openEditItem}
            onDelete={handleDeleteItem}
          />
        </>
      )}

      {showRunModal && (
        <PayrollRunFormModal
          mode={editingRun ? "edit" : "create"}
          form={runForm}
          onChange={setRunForm}
          onSubmit={handleSaveRun}
          onClose={closeRunModal}
          saving={saving}
        />
      )}

      {showItemModal && (
        <PayrollItemFormModal
          mode={editingItem ? "edit" : "create"}
          form={itemForm}
          onChange={setItemForm}
          onSubmit={handleSaveItem}
          onClose={closeItemModal}
          saving={saving}
          payrollRuns={payrollRuns}
          employees={employees}
        />
      )}
    </div>
  );
}
