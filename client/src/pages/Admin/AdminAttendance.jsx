import { useEffect, useMemo, useState } from "react";

import {
  AttendanceErrorState,
  AttendanceFormModal,
  AttendanceHeader,
  AttendanceKPICards,
  AttendanceLoadingState,
  AttendanceTable,
  AttendanceToolbar,
} from "../../components/admin/layout/Admin_Attendance_Components.jsx";

import {
  createAttendanceLog,
  deleteAttendanceLog,
  getAttendanceData,
  updateAttendanceLog,
} from "../../services/human_resources/attendance";

const EMPTY_ATTENDANCE_FORM = {
  employeeId: "",
  attendanceDate: new Date().toISOString().slice(0, 10),
  checkIn: "",
  checkOut: "",
  status: "present",
  overtimeHours: 0,
  source: "manual",
  notes: "",
};

export default function AdminAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState(EMPTY_ATTENDANCE_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    try {
      setLoading(true);
      setError("");

      const data = await getAttendanceData();

      setAttendance(data.attendance || []);
      setEmployees(data.employees || []);
      setStatuses(data.statuses || []);
      setSources(data.sources || []);
    } catch (err) {
      console.error("Attendance load error:", err);
      setError(err.message || "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateAttendance() {
    setEditingAttendance(null);
    setAttendanceForm({
      ...EMPTY_ATTENDANCE_FORM,
      employeeId: employees[0]?.id || "",
    });
    setShowAttendanceModal(true);
  }

  function openEditAttendance(item) {
    setEditingAttendance(item);
    setAttendanceForm({
      employeeId: item.employeeId || "",
      attendanceDate: item.date || new Date().toISOString().slice(0, 10),
      checkIn: item.checkInTime || "",
      checkOut: item.checkOutTime || "",
      status: item.status || "present",
      overtimeHours: item.overtimeHours || 0,
      source: item.source || "manual",
      notes: item.notes || "",
    });
    setShowAttendanceModal(true);
  }

  async function handleSaveAttendance(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingAttendance?.id) {
        await updateAttendanceLog(editingAttendance.id, attendanceForm);
      } else {
        await createAttendanceLog(attendanceForm);
      }

      setShowAttendanceModal(false);
      setEditingAttendance(null);
      setAttendanceForm(EMPTY_ATTENDANCE_FORM);

      await loadAttendance();
    } catch (err) {
      alert(err.message || "Failed to save attendance log.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAttendance(item) {
    if (!window.confirm(`Delete attendance log for ${item.employee}?`)) return;

    try {
      setSaving(true);
      await deleteAttendanceLog(item.id);
      await loadAttendance();
    } catch (err) {
      alert(err.message || "Failed to delete attendance log.");
    } finally {
      setSaving(false);
    }
  }

  const filteredAttendance = useMemo(() => {
    const term = search.trim().toLowerCase();

    return attendance.filter((item) => {
      if (!term) return true;

      return (
        (item.employee || "").toLowerCase().includes(term) ||
        (item.employeeCode || "").toLowerCase().includes(term) ||
        (item.department || "").toLowerCase().includes(term) ||
        (item.status || "").toLowerCase().includes(term) ||
        (item.source || "").toLowerCase().includes(term) ||
        (item.aiFlag || "").toLowerCase().includes(term)
      );
    });
  }, [attendance, search]);

  return (
    <div className="space-y-6">
      <AttendanceHeader
        onRefresh={loadAttendance}
        onCreate={openCreateAttendance}
      />

      {loading && <AttendanceLoadingState />}

      {!loading && error && (
        <AttendanceErrorState message={error} onRetry={loadAttendance} />
      )}

      {!loading && !error && (
        <>
          <AttendanceKPICards attendance={attendance} />

          <AttendanceToolbar
            search={search}
            onSearchChange={setSearch}
          />

          <AttendanceTable
            attendance={filteredAttendance}
            saving={saving}
            onEdit={openEditAttendance}
            onDelete={handleDeleteAttendance}
          />
        </>
      )}

      {showAttendanceModal && (
        <AttendanceFormModal
          mode={editingAttendance ? "edit" : "create"}
          form={attendanceForm}
          onChange={setAttendanceForm}
          onSubmit={handleSaveAttendance}
          onClose={() => setShowAttendanceModal(false)}
          saving={saving}
          employees={employees}
          statuses={statuses}
          sources={sources}
        />
      )}
    </div>
  );
}
