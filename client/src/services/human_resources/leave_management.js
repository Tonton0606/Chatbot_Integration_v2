import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

export const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"];

export const LEAVE_STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function normalizeLeaveRequest(row) {
  const employeeName = row.employee
    ? [row.employee.first_name, row.employee.last_name].filter(Boolean).join(" ")
    : "Unknown Employee";

  return {
    id: row.id,
    employeeId: row.employee_id,
    employee: employeeName,
    employeeName,
    employeeCode: row.employee?.employee_code || "—",
    department: row.employee?.department?.name || "Unassigned",
    leaveType: row.leave_type?.name || "Unassigned",
    type: row.leave_type?.name || "Unassigned",
    leaveTypeId: row.leave_type_id || "",
    startDate: row.start_date,
    endDate: row.end_date,
    from: row.start_date,
    to: row.end_date,
    totalDays: Number(row.total_days || 0),
    days: Number(row.total_days || 0),
    reason: row.reason || "—",
    status: row.status || "pending",
    statusLabel: LEAVE_STATUS_LABELS[row.status] || row.status || "Pending",
    aiFlag: row.ai_flag || "Normal",
    createdAt: row.created_at,
  };
}

function eachDateBetween(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (
    let current = new Date(start);
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }

  return dates;
}

async function syncApprovedLeaveToAttendance(leave) {
  if (!leave?.employee_id || !leave?.start_date || !leave?.end_date) return;

  const dates = eachDateBetween(leave.start_date, leave.end_date);

  const logs = dates.map((date) => ({
    workspace_id: leave.workspace_id,
    employee_id: leave.employee_id,
    attendance_date: date,
    check_in: null,
    check_out: null,
    status: "on_leave",
    work_hours: 0,
    overtime_hours: 0,
    source: "system",
    ai_flag: "Auto-generated from approved leave",
    notes: `Generated from approved leave request ${leave.id}`,
    updated_at: new Date().toISOString(),
  }));

  if (!logs.length) return;

  const { error } = await supabase
    .from("hr_attendance_logs")
    .upsert(logs, {
      onConflict: "employee_id,attendance_date",
    });

  if (error) throw error;
}

async function deductLeaveBalance(leave) {
  const requestedDays = Number(leave.total_days || 0);

  if (!requestedDays || requestedDays <= 0) {
    throw new Error("Leave request total days must be greater than zero.");
  }

  const year = new Date(leave.start_date || new Date()).getFullYear();

  const { data: balance, error } = await supabase
    .from("hr_employee_leave_balances")
    .select("*")
    .eq("employee_id", leave.employee_id)
    .eq("leave_type_id", leave.leave_type_id)
    .eq("year", year)
    .maybeSingle();

  if (error) throw error;

  if (!balance) {
    throw new Error("Employee leave balance is missing for this leave type.");
  }

  if (!balance.is_unlimited) {
    const remaining = Number(balance.remaining_days || 0);

    if (requestedDays > remaining) {
      throw new Error(
        `Insufficient leave balance. Remaining: ${remaining}. Requested: ${requestedDays}.`
      );
    }
  }

  const { error: updateError } = await supabase
    .from("hr_employee_leave_balances")
    .update({
      used_days: Number(balance.used_days || 0) + requestedDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", balance.id);

  if (updateError) throw updateError;
}

export async function getLeaveManagementData() {
  const [requestsResult, typesResult, employeesResult, balancesResult] =
    await Promise.all([
      supabase
        .from("hr_leave_requests")
        .select(`
          id,
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          total_days,
          reason,
          status,
          ai_flag,
          created_at,
          employee:hr_employees!hr_leave_requests_employee_id_fkey (
            id,
            employee_code,
            first_name,
            last_name,
            department:hr_departments (
              id,
              name
            )
          ),
          leave_type:hr_leave_types (
            id,
            name,
            leave_key
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("hr_leave_types")
        .select("id, name, leave_key, default_annual_days, is_paid")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      supabase
        .from("hr_employees")
        .select("id, employee_code, first_name, last_name")
        .eq("is_active", true)
        .order("employee_code", { ascending: true }),

      supabase
        .from("hr_employee_leave_balances")
        .select(`
          id,
          employee_id,
          leave_type_id,
          year,
          allocated_days,
          used_days,
          pending_days,
          remaining_days,
          is_paid,
          is_unlimited,
          notes,
          leave_type:hr_leave_types (
            id,
            name,
            leave_key
          ),
          employee:hr_employees (
            id,
            employee_code,
            first_name,
            last_name
          )
        `)
        .order("year", { ascending: false }),
    ]);

  if (requestsResult.error) throw requestsResult.error;
  if (typesResult.error) throw typesResult.error;
  if (employeesResult.error) throw employeesResult.error;
  if (balancesResult.error) throw balancesResult.error;

  const requests = (requestsResult.data || []).map(normalizeLeaveRequest);

  return {
    requests,
    leaveRequests: requests,
    leaves: requests,
    leaveTypes: typesResult.data || [],
    employees: (employeesResult.data || []).map((employee) => ({
      id: employee.id,
      employeeCode: employee.employee_code,
      name: [employee.first_name, employee.last_name].filter(Boolean).join(" "),
    })),
    statuses: LEAVE_STATUSES,
    balances: balancesResult.data || [],
  };
}

export async function createLeaveRequest(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_leave_requests").insert({
    workspace_id: workspaceId,
    employee_id: payload.employeeId,
    leave_type_id: payload.leaveTypeId || null,
    start_date: payload.startDate,
    end_date: payload.endDate,
    total_days: Number(payload.totalDays || 1),
    reason: payload.reason?.trim() || null,
    status: "pending",
    ai_flag: "Needs HR review",
  });

  if (error) throw error;
  return true;
}

export async function updateLeaveRequest(id, payload) {
  if (!id) throw new Error("Leave request ID is required.");

  const { error } = await supabase
    .from("hr_leave_requests")
    .update({
      employee_id: payload.employeeId,
      leave_type_id: payload.leaveTypeId || null,
      start_date: payload.startDate,
      end_date: payload.endDate,
      total_days: Number(payload.totalDays || 1),
      reason: payload.reason?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function updateLeaveRequestStatus(id, status) {
  if (!id) throw new Error("Leave request ID is required.");

  const { data: leave, error: leaveError } = await supabase
    .from("hr_leave_requests")
    .select(`
      id,
      workspace_id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      total_days,
      status,
      leave_type:hr_leave_types (
        id,
        name,
        is_paid
      )
    `)
    .eq("id", id)
    .single();

  if (leaveError) throw leaveError;
  if (!leave) throw new Error("Leave request not found.");

  if (leave.status === "approved" && status === "approved") {
    throw new Error("Leave request is already approved.");
  }

  if (status === "approved") {
    await deductLeaveBalance(leave);
  }

  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved") {
    updates.approved_at = new Date().toISOString();
    updates.ai_flag = leave.leave_type?.is_paid
      ? "Approved paid leave"
      : "Approved unpaid leave - payroll deduction required";
  }

  if (status === "rejected") {
    updates.ai_flag = "Rejected by HR";
  }

  if (status === "cancelled") {
    updates.ai_flag = "Cancelled";
  }

  const { error } = await supabase
    .from("hr_leave_requests")
    .update(updates)
    .eq("id", id);

  if (error) throw error;

  if (status === "approved") {
    await syncApprovedLeaveToAttendance(leave);
  }

  return true;
}

export async function deleteLeaveRequest(id) {
  if (!id) throw new Error("Leave request ID is required.");

  const { error } = await supabase
    .from("hr_leave_requests")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
