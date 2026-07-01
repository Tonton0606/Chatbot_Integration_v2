import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

export const EMPLOYEE_STATUSES = ["active", "on_leave", "inactive", "terminated"];
export const EMPLOYEE_TYPES = ["full_time", "part_time", "contract", "intern"];

export const EMPLOYEE_STATUS_LABELS = {
  active: "Active",
  on_leave: "On Leave",
  inactive: "Inactive",
  terminated: "Terminated",
};

export const EMPLOYEE_TYPE_LABELS = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

function normalizeLeaveBalance(row, leaveTypeMap = {}) {
  const leaveType = leaveTypeMap[row.leave_type_id];

  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    leaveType: leaveType?.name || "Unassigned",
    leaveKey: leaveType?.leave_key || "",
    year: row.year,
    allocatedDays: Number(row.allocated_days || 0),
    usedDays: Number(row.used_days || 0),
    pendingDays: Number(row.pending_days || 0),
    remainingDays: Number(row.remaining_days || 0),
    isPaid: !!row.is_paid,
    isUnlimited: !!row.is_unlimited,
    notes: row.notes || "",
  };
}

function normalizeEmployee(row, leaveBalances = [], leaveTypeMap = {}) {
  const employeeLeaveBalances = leaveBalances
    .filter((balance) => balance.employee_id === row.id)
    .map((balance) => normalizeLeaveBalance(balance, leaveTypeMap));

  return {
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    name: [row.first_name, row.last_name].filter(Boolean).join(" "),
    email: row.email,
    phone: row.phone,
    salary: Number(row.salary || 0),
    departmentId: row.department?.id || "",
    positionId: row.position?.id || "",
    department: row.department?.name || "Unassigned",
    position: row.position?.title || "Unassigned",
    manager: "—",
    type: row.employment_type || "full_time",
    status: row.employment_status || "active",
    hireDate: row.hire_date,
    attendanceStatus: "Not connected",
    payrollStatus: "Not connected",
    performanceRating: null,
    aiRisk: "Pending",
    leaveBalances: employeeLeaveBalances,
  };
}

export async function getEmployeesData({ includeInactive = false } = {}) {
  const [employeesResult, balancesResult, leaveTypesResult] = await Promise.all([
    supabase
      .from("hr_employees")
      .select(`
        id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        salary,
        employment_type,
        employment_status,
        hire_date,
        department:hr_departments (
          id,
          name
        ),
        position:hr_positions (
          id,
          title
        )
      `)
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
        notes
      `)
      .order("year", { ascending: false }),

    supabase
      .from("hr_leave_types")
      .select(`
        id,
        name,
        leave_key,
        is_paid,
        is_active,
        default_annual_days
      `)
      .order("name", { ascending: true }),
  ]);

  if (employeesResult.error) throw employeesResult.error;
  if (balancesResult.error) throw balancesResult.error;
  if (leaveTypesResult.error) throw leaveTypesResult.error;

  const leaveTypes = leaveTypesResult.data || [];

  const leaveTypeMap = leaveTypes.reduce((map, type) => {
    map[type.id] = type;
    return map;
  }, {});

  const leaveBalances = balancesResult.data || [];

  const employees = (employeesResult.data || [])
    .filter((employee) => includeInactive || employee.is_active === true)
    .map((employee) => normalizeEmployee(employee, leaveBalances, leaveTypeMap));

  const departments = Array.from(
    new Set(
      employees
        .map((employee) => employee.department)
        .filter((department) => department && department !== "Unassigned")
    )
  );

  return {
    employees,
    departments,
    statuses: EMPLOYEE_STATUSES,
    types: EMPLOYEE_TYPES,
    leaveTypes,
  };
}

export async function getEmployeeFormOptions() {
  const [departmentsResult, positionsResult, employeesResult] =
    await Promise.all([
      supabase
        .from("hr_departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      supabase
        .from("hr_positions")
        .select("id, title")
        .eq("is_active", true)
        .order("title", { ascending: true }),

      supabase
        .from("hr_employees")
        .select("id, first_name, last_name")
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
    ]);

  if (departmentsResult.error) throw departmentsResult.error;
  if (positionsResult.error) throw positionsResult.error;
  if (employeesResult.error) throw employeesResult.error;

  const uniqueDepartments = Array.from(
    new Map((departmentsResult.data || []).map((department) => [department.name, department])).values()
  );

  const uniquePositions = Array.from(
    new Map((positionsResult.data || []).map((position) => [position.title, position])).values()
  );

  return {
    departments: uniqueDepartments,
    positions: uniquePositions,
    statuses: EMPLOYEE_STATUSES,
    types: EMPLOYEE_TYPES,
    managers: (employeesResult.data || []).map((employee) => ({
      id: employee.id,
      name: [employee.first_name, employee.last_name].filter(Boolean).join(" "),
    })),
  };
}

export async function createEmployee(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_employees").insert({
    workspace_id: workspaceId,
    employee_code: payload.employeeCode?.trim(),
    first_name: payload.firstName?.trim(),
    last_name: payload.lastName?.trim(),
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    salary: payload.salary ? Number(payload.salary) : null,
    department_id: payload.departmentId || null,
    position_id: payload.positionId || null,
    employment_status: payload.status || "active",
    employment_type: payload.type || "full_time",
    hire_date: payload.hireDate || null,
  });

  if (error) throw error;

  return true;
}

export async function updateEmployee(id, payload) {
  if (!id) throw new Error("Employee ID is required.");

  const { error } = await supabase
    .from("hr_employees")
    .update({
      employee_code: payload.employeeCode?.trim(),
      first_name: payload.firstName?.trim(),
      last_name: payload.lastName?.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      salary: payload.salary ? Number(payload.salary) : null,
      department_id: payload.departmentId || null,
      position_id: payload.positionId || null,
      employment_status: payload.status || "active",
      employment_type: payload.type || "full_time",
      hire_date: payload.hireDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return true;
}

export async function updateEmployeeLeaveBalance(id, payload) {
  if (!id) throw new Error("Leave balance ID is required.");

  const { error } = await supabase
    .from("hr_employee_leave_balances")
    .update({
      allocated_days: Number(payload.allocatedDays || 0),
      is_paid: !!payload.isPaid,
      is_unlimited: !!payload.isUnlimited,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return true;
}

export async function archiveEmployee(id) {
  if (!id) throw new Error("Employee ID is required.");

  const { error } = await supabase
    .from("hr_employees")
    .update({
      is_active: false,
      employment_status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return true;
}


export async function restoreEmployee(id) {
  if (!id) throw new Error("Employee ID is required.");

  const { error } = await supabase
    .from("hr_employees")
    .update({
      is_active: true,
      employment_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return true;
}
