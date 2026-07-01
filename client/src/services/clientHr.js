import { supabase } from "../config/supabaseClient";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "./workspaceResolver";

export const CLIENT_EMPLOYEE_STATUSES = [
  "active",
  "inactive",
  "onboarding",
  "archived",
];

export const CLIENT_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "intern",
];

export const CLIENT_EMPLOYEE_STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  onboarding: "Onboarding",
  archived: "Archived",
};

export const CLIENT_EMPLOYMENT_TYPE_LABELS = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

function buildEmployeeName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(" ");
}

function slugify(value = "") {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `item_${Date.now()}`
  );
}

function normalizeEmployee(row, managerMap = {}) {
  const managerName = row.manager_employee_id
    ? managerMap[row.manager_employee_id] || "—"
    : "—";

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    profileId: row.profile_id,
    employeeCode: row.employee_code || "",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    name: buildEmployeeName(row),
    email: row.email || "",
    phone: row.phone || "",
    avatarUrl: row.avatar_url || "",
    departmentId: row.department_id || null,
    department: row.department?.name || "Unassigned",
    positionId: row.position_id || null,
    position: row.position?.title || "Unassigned",
    managerEmployeeId: row.manager_employee_id || null,
    manager: managerName,
    status: row.employment_status || "active",
    employmentType: row.employment_type || "full_time",
    hireDate: row.hire_date || null,
    isActive: !!row.is_active,
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getClientHrData() {
  const workspaceId = await getCurrentWorkspaceId();

  const [employeesResult, departmentsResult, positionsResult] =
    await Promise.all([
      supabase
        .from("client_hr_employees")
        .select(`
          *,
          department:client_hr_departments!client_hr_employees_department_id_fkey (
            id,
            name
          ),
          position:client_hr_positions!client_hr_employees_position_id_fkey (
            id,
            title
          )
        `)
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("employee_code", { ascending: true }),

      supabase
        .from("client_hr_departments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("name", { ascending: true }),

      supabase
        .from("client_hr_positions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("title", { ascending: true }),
    ]);

  if (employeesResult.error) throw employeesResult.error;
  if (departmentsResult.error) throw departmentsResult.error;
  if (positionsResult.error) throw positionsResult.error;

  const employeeRows = employeesResult.data || [];

  const managerMap = employeeRows.reduce((map, employee) => {
    map[employee.id] = buildEmployeeName(employee) || "Unnamed employee";
    return map;
  }, {});

  return {
    employees: employeeRows.map((employee) =>
      normalizeEmployee(employee, managerMap)
    ),
    departments: departmentsResult.data || [],
    positions: positionsResult.data || [],
    statuses: CLIENT_EMPLOYEE_STATUSES,
    employmentTypes: CLIENT_EMPLOYMENT_TYPES,
  };
}

export async function getClientHrFormOptions() {
  const workspaceId = await getCurrentWorkspaceId();

  const [departmentsResult, positionsResult, employeesResult] =
    await Promise.all([
      supabase
        .from("client_hr_departments")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("name", { ascending: true }),

      supabase
        .from("client_hr_positions")
        .select("id, title")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("title", { ascending: true }),

      supabase
        .from("client_hr_employees")
        .select("id, first_name, last_name")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("first_name", { ascending: true }),
    ]);

  if (departmentsResult.error) throw departmentsResult.error;
  if (positionsResult.error) throw positionsResult.error;
  if (employeesResult.error) throw employeesResult.error;

  return {
    departments: departmentsResult.data || [],
    positions: positionsResult.data || [],
    managers: (employeesResult.data || []).map((employee) => ({
      id: employee.id,
      name: buildEmployeeName(employee) || "Unnamed employee",
    })),
    statuses: CLIENT_EMPLOYEE_STATUSES,
    employmentTypes: CLIENT_EMPLOYMENT_TYPES,
  };
}

export async function createClientDepartment(payload) {
  const workspaceId = await getCurrentWorkspaceId();
  const profileId = await getCurrentUserId();

  const name = payload.name?.trim();

  if (!name) {
    throw new Error("Department name is required.");
  }

  const { error } = await supabase.from("client_hr_departments").insert({
    workspace_id: workspaceId,
    department_key: payload.departmentKey?.trim() || slugify(name),
    name,
    description: payload.description?.trim() || null,
    is_active: true,
    created_by: profileId,
    updated_by: profileId,
  });

  if (error) throw error;

  return true;
}

export async function archiveClientDepartment(departmentId) {
  if (!departmentId) {
    throw new Error("Department ID is required.");
  }

  const profileId = await getCurrentUserId();

  const { error } = await supabase
    .from("client_hr_departments")
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archived_by: profileId,
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", departmentId);

  if (error) throw error;

  return true;
}

export async function createClientPosition(payload) {
  const workspaceId = await getCurrentWorkspaceId();
  const profileId = await getCurrentUserId();

  const title = payload.title?.trim();

  if (!title) {
    throw new Error("Position title is required.");
  }

  const { error } = await supabase.from("client_hr_positions").insert({
    workspace_id: workspaceId,
    position_key: payload.positionKey?.trim() || slugify(title),
    title,
    description: payload.description?.trim() || null,
    department_id: payload.departmentId || null,
    employment_type: payload.employmentType || "full_time",
    is_active: true,
    created_by: profileId,
    updated_by: profileId,
  });

  if (error) throw error;

  return true;
}

export async function archiveClientPosition(positionId) {
  if (!positionId) {
    throw new Error("Position ID is required.");
  }

  const profileId = await getCurrentUserId();

  const { error } = await supabase
    .from("client_hr_positions")
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archived_by: profileId,
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", positionId);

  if (error) throw error;

  return true;
}

export async function createClientEmployee(payload) {
  const workspaceId = await getCurrentWorkspaceId();
  const profileId = await getCurrentUserId();

  const { error } = await supabase.from("client_hr_employees").insert({
    workspace_id: workspaceId,
    employee_code: payload.employeeCode?.trim(),
    first_name: payload.firstName?.trim(),
    last_name: payload.lastName?.trim(),
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    department_id: payload.departmentId || null,
    position_id: payload.positionId || null,
    manager_employee_id: payload.managerEmployeeId || null,
    employment_status: payload.status || "active",
    employment_type: payload.employmentType || "full_time",
    hire_date: payload.hireDate || null,
    is_active: true,
    created_by: profileId,
    updated_by: profileId,
  });

  if (error) throw error;

  return true;
}

export async function updateClientEmployee(employeeId, payload) {
  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  const profileId = await getCurrentUserId();

  const { error } = await supabase
    .from("client_hr_employees")
    .update({
      employee_code: payload.employeeCode?.trim(),
      first_name: payload.firstName?.trim(),
      last_name: payload.lastName?.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      department_id: payload.departmentId || null,
      position_id: payload.positionId || null,
      manager_employee_id: payload.managerEmployeeId || null,
      employment_status: payload.status || "active",
      employment_type: payload.employmentType || "full_time",
      hire_date: payload.hireDate || null,
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) throw error;

  return true;
}

export async function archiveClientEmployee(employeeId) {
  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  const profileId = await getCurrentUserId();

  const { error } = await supabase
    .from("client_hr_employees")
    .update({
      is_active: false,
      employment_status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: profileId,
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) throw error;

  return true;
}
