import { supabase } from "../../config/supabaseClient";

export const ATTENDANCE_STATUSES = [
  "present",
  "late",
  "absent",
  "on_leave",
  "half_day",
  "remote",
  "holiday",
  "training",
  "official_business",
];

export const ATTENDANCE_STATUS_LABELS = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "On Leave",
  half_day: "Half Day",
  remote: "Remote",
  holiday: "Holiday",
  training: "Training",
  official_business: "Official Business",
};

export const ATTENDANCE_SOURCES = [
  "manual",
  "biometric",
  "qr",
  "mobile",
  "system",
  "imported",
];

export const ATTENDANCE_SOURCE_LABELS = {
  manual: "Manual",
  biometric: "Biometric",
  qr: "QR",
  mobile: "Mobile",
  system: "System",
  imported: "Imported",
};

function fullName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(" ");
}

function formatTime(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toTimestamp(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}`).toISOString();
}

function timestampToTime(value) {
  if (!value) return "";

  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function calculateWorkHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end <= start) return 0;

  const diffMs = end - start;
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
}

function generateAIFlag({ status, workHours, overtimeHours, checkIn, checkOut }) {
  if (checkIn && !checkOut) return "Missing Checkout";
  if (status === "late") return "Late Arrival";
  if (Number(overtimeHours || 0) >= 3) return "Extended Overtime";
  if (Number(workHours || 0) >= 10) return "Long Shift";
  if (status === "absent") return "Absence Review";
  if (status === "half_day") return "Half-Day Review";
  if (status === "present" || status === "remote") return "Normal";

  return "Review Needed";
}

function normalizeAttendance(row) {
  const employeeName = row.employee ? fullName(row.employee) : "Unknown Employee";

  return {
    id: row.id,
    employeeId: row.employee_id || "",
    employee: employeeName,
    employeeCode: row.employee?.employee_code || "—",
    department: row.employee?.department?.name || "Unassigned",
    date: row.attendance_date || "",
    checkIn: formatTime(row.check_in),
    checkOut: formatTime(row.check_out),
    checkInRaw: row.check_in || null,
    checkOutRaw: row.check_out || null,
    checkInTime: timestampToTime(row.check_in),
    checkOutTime: timestampToTime(row.check_out),
    status: row.status || "present",
    statusLabel: ATTENDANCE_STATUS_LABELS[row.status] || row.status || "Present",
    workHours: Number(row.work_hours || 0),
    overtimeHours: Number(row.overtime_hours || 0),
    aiFlag: row.ai_flag || "Normal",
    source: row.source || "manual",
    sourceLabel: ATTENDANCE_SOURCE_LABELS[row.source] || row.source || "Manual",
    notes: row.notes || "",
    isCorrected: !!row.is_corrected,
    correctedAt: row.corrected_at || null,
  };
}

export async function getAttendanceData() {
  const [attendanceResult, employeesResult] = await Promise.all([
    supabase
      .from("hr_attendance_logs")
      .select(`
        id,
        workspace_id,
        employee_id,
        attendance_date,
        check_in,
        check_out,
        status,
        work_hours,
        overtime_hours,
        notes,
        ai_flag,
        source,
        is_corrected,
        corrected_at,
        employee:hr_employees (
          id,
          employee_code,
          first_name,
          last_name,
          department:hr_departments (
            id,
            name
          )
        )
      `)
      .order("attendance_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_employees")
      .select("id, employee_code, first_name, last_name")
      .eq("is_active", true)
      .order("employee_code", { ascending: true }),
  ]);

  if (attendanceResult.error) throw attendanceResult.error;
  if (employeesResult.error) throw employeesResult.error;

  return {
    attendance: (attendanceResult.data || []).map(normalizeAttendance),
    employees: (employeesResult.data || []).map((employee) => ({
      id: employee.id,
      employeeCode: employee.employee_code,
      name: fullName(employee),
    })),
    statuses: ATTENDANCE_STATUSES,
    sources: ATTENDANCE_SOURCES,
  };
}

export async function createAttendanceLog(payload) {
  const checkIn = toTimestamp(payload.attendanceDate, payload.checkIn);
  const checkOut = toTimestamp(payload.attendanceDate, payload.checkOut);
  const workHours = calculateWorkHours(checkIn, checkOut);
  const overtimeHours = Number(payload.overtimeHours || 0);
  const status = payload.status || "present";

  const { error } = await supabase.from("hr_attendance_logs").insert({
    employee_id: payload.employeeId,
    attendance_date: payload.attendanceDate,
    check_in: checkIn,
    check_out: checkOut,
    status,
    work_hours: workHours,
    overtime_hours: overtimeHours,
    notes: payload.notes?.trim() || null,
    source: payload.source || "manual",
    ai_flag: generateAIFlag({
      status,
      workHours,
      overtimeHours,
      checkIn,
      checkOut,
    }),
  });

  if (error) throw error;
  return true;
}

export async function updateAttendanceLog(id, payload) {
  if (!id) throw new Error("Attendance log ID is required.");

  const checkIn = toTimestamp(payload.attendanceDate, payload.checkIn);
  const checkOut = toTimestamp(payload.attendanceDate, payload.checkOut);
  const workHours = calculateWorkHours(checkIn, checkOut);
  const overtimeHours = Number(payload.overtimeHours || 0);
  const status = payload.status || "present";

  const { error } = await supabase
    .from("hr_attendance_logs")
    .update({
      employee_id: payload.employeeId,
      attendance_date: payload.attendanceDate,
      check_in: checkIn,
      check_out: checkOut,
      status,
      work_hours: workHours,
      overtime_hours: overtimeHours,
      notes: payload.notes?.trim() || null,
      source: payload.source || "manual",
      ai_flag: generateAIFlag({
        status,
        workHours,
        overtimeHours,
        checkIn,
        checkOut,
      }),
      is_corrected: true,
      corrected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteAttendanceLog(id) {
  if (!id) throw new Error("Attendance log ID is required.");

  const { error } = await supabase
    .from("hr_attendance_logs")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
