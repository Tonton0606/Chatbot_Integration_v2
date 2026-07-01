import { useEffect, useState } from "react";

import {
  LeaveErrorState,
  LeaveFormModal,
  LeaveHeader,
  LeaveKPICards,
  LeaveLoadingState,
  LeaveRequestsTable,
} from "../../components/admin/layout/Admin_LeaveManagement_Components.jsx";

import {
  createLeaveRequest,
  deleteLeaveRequest,
  getLeaveManagementData,
  updateLeaveRequest,
  updateLeaveRequestStatus,
} from "../../services/human_resources/leave_management";

const EMPTY_FORM = {
  employeeId: "",
  leaveTypeId: "",
  startDate: "",
  endDate: "",
  totalDays: 1,
  reason: "",
};

export default function AdminLeaveManagement() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLeaveData();
  }, []);

  async function loadLeaveData() {
    try {
      setLoading(true);
      setError("");

      const data = await getLeaveManagementData();

      setRequests(data.requests || []);
      setEmployees(data.employees || []);
      setLeaveTypes(data.leaveTypes || []);
    } catch (err) {
      console.error("Leave load error:", err);
      setError(err.message || "Failed to load leave management.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingRequest(null);
    setForm({
      ...EMPTY_FORM,
      employeeId: employees[0]?.id || "",
    });
    setShowModal(true);
  }

  function openEditModal(request) {
    setEditingRequest(request);
    setForm({
      employeeId: request.employeeId || "",
      leaveTypeId: request.leaveTypeId || "",
      startDate: request.startDate || "",
      endDate: request.endDate || "",
      totalDays: request.totalDays || 1,
      reason: request.reason === "—" ? "" : request.reason || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRequest(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingRequest?.id) {
        await updateLeaveRequest(editingRequest.id, form);
      } else {
        await createLeaveRequest(form);
      }

      closeModal();
      await loadLeaveData();
    } catch (err) {
      console.error("Save leave request error:", err);
      alert(err.message || "Failed to save leave request.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id, status) {
    try {
      setSaving(true);
      await updateLeaveRequestStatus(id, status);
      await loadLeaveData();
    } catch (err) {
      console.error("Leave status error:", err);
      alert(err.message || "Failed to update leave status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(request) {
    const confirmed = window.confirm(
      `Delete leave request for ${request.employee}?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await deleteLeaveRequest(request.id);
      await loadLeaveData();
    } catch (err) {
      console.error("Delete leave request error:", err);
      alert(err.message || "Failed to delete leave request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <LeaveHeader onRefresh={loadLeaveData} onCreate={openCreateModal} />

      {loading && <LeaveLoadingState />}

      {!loading && error && (
        <LeaveErrorState message={error} onRetry={loadLeaveData} />
      )}

      {!loading && !error && (
        <>
          <LeaveKPICards requests={requests} />

          <LeaveRequestsTable
            requests={requests}
            saving={saving}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onApprove={(id) => handleStatus(id, "approved")}
            onReject={(id) => handleStatus(id, "rejected")}
          />
        </>
      )}

      {showModal && (
        <LeaveFormModal
          mode={editingRequest ? "edit" : "create"}
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
          saving={saving}
          employees={employees}
          leaveTypes={leaveTypes}
        />
      )}
    </div>
  );
}
