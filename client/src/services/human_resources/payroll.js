import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

export const PAYROLL_STATUSES = [
  "draft",
  "processing",
  "pending_approval",
  "approved",
  "disbursed",
];

export const PAYROLL_STATUS_LABELS = {
  draft: "Draft",
  processing: "Processing",
  pending_approval: "Pending Approval",
  approved: "Approved",
  disbursed: "Disbursed",
};

const STANDARD_WORK_DAYS = 22;
const STANDARD_WORK_HOURS_PER_DAY = 8;
const OVERTIME_MULTIPLIER = 1.25;

function money(value) {
  return Number(value || 0);
}

function roundMoney(value) {
  return Math.round(money(value) * 100) / 100;
}

function normalizePayrollRun(row) {
  return {
    id: row.id,
    payrollCode: row.payroll_code,
    period: row.period_label,
    periodLabel: row.period_label,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status || "draft",
    statusLabel: PAYROLL_STATUS_LABELS[row.status] || row.status || "Draft",
    grossPay: money(row.gross_pay),
    deductions: money(row.deductions),
    netPay: money(row.net_pay),
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

function normalizeEmployee(row) {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: [row.first_name, row.last_name].filter(Boolean).join(" "),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    salary: money(row.salary),
    employmentType: row.employment_type || "full_time",
    department: row.department?.name || "Unassigned",
    position: row.position?.title || "Unassigned",
  };
}

function normalizePayrollEmployee(row) {
  const employeeName = row.employee
    ? [row.employee.first_name, row.employee.last_name].filter(Boolean).join(" ")
    : "Unknown Employee";

  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    employeeId: row.employee_id,
    employee: employeeName,
    name: employeeName,
    employeeCode: row.employee?.employee_code || "—",
    department: row.employee?.department?.name || "Unassigned",
    position: row.employee?.position?.title || "Unassigned",
    basicSalary: money(row.basic_salary),
    allowances: money(row.allowances),
    overtime: money(row.overtime_pay),
    overtimePay: money(row.overtime_pay),
    bonus: money(row.bonus),
    deductions: money(row.deductions),
    netPay: money(row.net_pay),
    status: row.status || "pending",
  };
}

function dateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function overlapsPeriod(startDate, endDate, periodStart, periodEnd) {
  const start = dateOnly(startDate);
  const end = dateOnly(endDate || startDate);

  return start <= periodEnd && end >= periodStart;
}

function buildBalanceKey(employeeId, leaveTypeId, year) {
  return `${employeeId}:${leaveTypeId}:${year}`;
}

function calculateEmployeePayroll({
  employee,
  payrollRun,
  attendanceLogs,
  leaveRequests,
  leaveBalanceMap,
  existingItem,
}) {
  const basicSalary = money(employee.salary);
  const dailyRate = basicSalary / STANDARD_WORK_DAYS;
  const hourlyRate = dailyRate / STANDARD_WORK_HOURS_PER_DAY;

  const employeeAttendance = attendanceLogs.filter(
    (item) => item.employee_id === employee.id
  );

  const overtimeHours = employeeAttendance.reduce(
    (sum, item) => sum + money(item.overtime_hours),
    0
  );

  const overtimePay = roundMoney(
    overtimeHours * hourlyRate * OVERTIME_MULTIPLIER
  );

  const periodYear = new Date(payrollRun.period_start).getFullYear();

  const employeeApprovedLeaves = leaveRequests.filter((item) => {
    return (
      item.employee_id === employee.id &&
      item.status === "approved" &&
      overlapsPeriod(
        item.start_date,
        item.end_date,
        payrollRun.period_start,
        payrollRun.period_end
      )
    );
  });

  const unpaidLeaveDays = employeeApprovedLeaves.reduce((sum, request) => {
    const balanceKey = buildBalanceKey(
      request.employee_id,
      request.leave_type_id,
      periodYear
    );

    const balance = leaveBalanceMap[balanceKey];

    if (!balance) return sum;

    if (balance.is_paid) return sum;

    return sum + money(request.total_days);
  }, 0);

  const unpaidLeaveDeduction = roundMoney(unpaidLeaveDays * dailyRate);

  const allowances = money(existingItem?.allowances);
  const bonus = money(existingItem?.bonus);
  const deductions = unpaidLeaveDeduction;

  const grossPay = roundMoney(
    basicSalary + allowances + overtimePay + bonus
  );

  const netPay = roundMoney(grossPay - deductions);

  return {
    basicSalary,
    allowances,
    overtimePay,
    bonus,
    deductions,
    netPay,
    status: existingItem?.status || "pending",
  };
}

async function recalculatePayrollRun(payrollRunId) {
  if (!payrollRunId) return true;

  const { data, error } = await supabase
    .from("hr_employee_payroll_items")
    .select("basic_salary, allowances, overtime_pay, bonus, deductions, net_pay")
    .eq("payroll_run_id", payrollRunId);

  if (error) throw error;

  const totals = (data || []).reduce(
    (acc, item) => {
      acc.grossPay +=
        money(item.basic_salary) +
        money(item.allowances) +
        money(item.overtime_pay) +
        money(item.bonus);
      acc.deductions += money(item.deductions);
      acc.netPay += money(item.net_pay);
      return acc;
    },
    { grossPay: 0, deductions: 0, netPay: 0 }
  );

  const { error: updateError } = await supabase
    .from("hr_payroll_runs")
    .update({
      gross_pay: roundMoney(totals.grossPay),
      deductions: roundMoney(totals.deductions),
      net_pay: roundMoney(totals.netPay),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payrollRunId);

  if (updateError) throw updateError;

  return true;
}

export async function getPayrollData() {
  const workspaceId = await getCurrentWorkspaceId();

  const [runsResult, itemsResult, employeesResult] = await Promise.all([
    supabase
      .from("hr_payroll_runs")
      .select(`
        id,
        payroll_code,
        period_label,
        period_start,
        period_end,
        status,
        gross_pay,
        deductions,
        net_pay,
        processed_at,
        created_at
      `)
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false }),

    supabase
      .from("hr_employee_payroll_items")
      .select(`
        id,
        payroll_run_id,
        employee_id,
        basic_salary,
        allowances,
        overtime_pay,
        bonus,
        deductions,
        net_pay,
        status,
        employee:hr_employees (
          id,
          employee_code,
          first_name,
          last_name,
          department:hr_departments (
            id,
            name
          ),
          position:hr_positions (
            id,
            title
          )
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_employees")
      .select(`
        id,
        employee_code,
        first_name,
        last_name,
        email,
        salary,
        employment_type,
        department:hr_departments (
          id,
          name
        ),
        position:hr_positions (
          id,
          title
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("employee_code", { ascending: true }),
  ]);

  if (runsResult.error) throw runsResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (employeesResult.error) throw employeesResult.error;

  const payrollRuns = (runsResult.data || []).map(normalizePayrollRun);
  const payrollEmployees = (itemsResult.data || []).map(normalizePayrollEmployee);
  const employees = (employeesResult.data || []).map(normalizeEmployee);

  const employeesWithoutSalary = employees.filter(
    (employee) => !money(employee.salary)
  );

  return {
    payrollRuns,
    runs: payrollRuns,
    payrollEmployees,
    employeePayroll: payrollEmployees,
    payroll: payrollEmployees,
    employees,
    statuses: PAYROLL_STATUSES,
    insights: [
      {
        id: "payroll-generation",
        type: "info",
        title: "Payroll Generation",
        detail:
          "Payroll items can be generated from employee salary, attendance overtime, and unpaid approved leave.",
      },
      ...(employeesWithoutSalary.length
        ? [
            {
              id: "missing-salary",
              type: "warning",
              title: "Missing Salary Data",
              detail: `${employeesWithoutSalary.length} active employee(s) have no salary and will generate ₱0 basic pay.`,
            },
          ]
        : []),
    ],
  };
}

export async function createPayrollRun(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_payroll_runs").insert({
    workspace_id: workspaceId,
    payroll_code: payload.payrollCode?.trim(),
    period_label: payload.periodLabel?.trim(),
    period_start: payload.periodStart,
    period_end: payload.periodEnd,
    status: payload.status || "draft",
  });

  if (error) throw error;

  return true;
}

export async function updatePayrollRun(id, payload) {
  if (!id) throw new Error("Payroll run ID is required.");

  const { error } = await supabase
    .from("hr_payroll_runs")
    .update({
      payroll_code: payload.payrollCode?.trim(),
      period_label: payload.periodLabel?.trim(),
      period_start: payload.periodStart,
      period_end: payload.periodEnd,
      status: payload.status || "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return true;
}

export async function deletePayrollRun(id) {
  if (!id) throw new Error("Payroll run ID is required.");

  const { error } = await supabase.from("hr_payroll_runs").delete().eq("id", id);

  if (error) throw error;

  return true;
}

export async function updatePayrollRunStatus(id, status) {
  if (!id) throw new Error("Payroll run ID is required.");

  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved" || status === "disbursed") {
    updates.processed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("hr_payroll_runs")
    .update(updates)
    .eq("id", id);

  if (error) throw error;

  return true;
}

export async function createPayrollItem(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const basicSalary = money(payload.basicSalary);
  const allowances = money(payload.allowances);
  const overtimePay = money(payload.overtimePay);
  const bonus = money(payload.bonus);
  const deductions = money(payload.deductions);
  const netPay = roundMoney(
    basicSalary + allowances + overtimePay + bonus - deductions
  );

  const { error } = await supabase.from("hr_employee_payroll_items").insert({
    workspace_id: workspaceId,
    payroll_run_id: payload.payrollRunId,
    employee_id: payload.employeeId,
    basic_salary: basicSalary,
    allowances,
    overtime_pay: overtimePay,
    bonus,
    deductions,
    net_pay: netPay,
    status: payload.status || "pending",
  });

  if (error) throw error;

  await recalculatePayrollRun(payload.payrollRunId);

  return true;
}

export async function updatePayrollItem(id, payload) {
  if (!id) throw new Error("Payroll item ID is required.");

  const basicSalary = money(payload.basicSalary);
  const allowances = money(payload.allowances);
  const overtimePay = money(payload.overtimePay);
  const bonus = money(payload.bonus);
  const deductions = money(payload.deductions);
  const netPay = roundMoney(
    basicSalary + allowances + overtimePay + bonus - deductions
  );

  const { error } = await supabase
    .from("hr_employee_payroll_items")
    .update({
      payroll_run_id: payload.payrollRunId,
      employee_id: payload.employeeId,
      basic_salary: basicSalary,
      allowances,
      overtime_pay: overtimePay,
      bonus,
      deductions,
      net_pay: netPay,
      status: payload.status || "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  await recalculatePayrollRun(payload.payrollRunId);

  return true;
}

export async function deletePayrollItem(id, payrollRunId) {
  if (!id) throw new Error("Payroll item ID is required.");

  const { error } = await supabase
    .from("hr_employee_payroll_items")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await recalculatePayrollRun(payrollRunId);

  return true;
}

export async function generatePayrollItemsForRun(payrollRunId) {
  if (!payrollRunId) {
    throw new Error("Payroll run ID is required.");
  }

  const workspaceId = await getCurrentWorkspaceId();

  const { data: run, error: runError } = await supabase
    .from("hr_payroll_runs")
    .select(`
      id,
      workspace_id,
      payroll_code,
      period_label,
      period_start,
      period_end,
      status
    `)
    .eq("id", payrollRunId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (runError) throw runError;

  if (!run) {
    throw new Error("Payroll run not found.");
  }

  if (!run.period_start || !run.period_end) {
    throw new Error("Payroll run period is incomplete.");
  }

  const periodYear = new Date(run.period_start).getFullYear();

  const [
    employeesResult,
    attendanceResult,
    leaveRequestsResult,
    leaveBalancesResult,
    existingItemsResult,
  ] = await Promise.all([
    supabase
      .from("hr_employees")
      .select(`
        id,
        employee_code,
        first_name,
        last_name,
        salary,
        employment_type
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("employee_code", { ascending: true }),

    supabase
      .from("hr_attendance_logs")
      .select(`
        id,
        employee_id,
        attendance_date,
        overtime_hours,
        status
      `)
      .eq("workspace_id", workspaceId)
      .gte("attendance_date", run.period_start)
      .lte("attendance_date", run.period_end),

    supabase
      .from("hr_leave_requests")
      .select(`
        id,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        status
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "approved")
      .lte("start_date", run.period_end)
      .gte("end_date", run.period_start),

    supabase
      .from("hr_employee_leave_balances")
      .select(`
        id,
        employee_id,
        leave_type_id,
        year,
        is_paid,
        is_unlimited
      `)
      .eq("year", periodYear),

    supabase
      .from("hr_employee_payroll_items")
      .select(`
        id,
        payroll_run_id,
        employee_id,
        allowances,
        bonus,
        status
      `)
      .eq("workspace_id", workspaceId)
      .eq("payroll_run_id", payrollRunId),
  ]);

  if (employeesResult.error) throw employeesResult.error;
  if (attendanceResult.error) throw attendanceResult.error;
  if (leaveRequestsResult.error) throw leaveRequestsResult.error;
  if (leaveBalancesResult.error) throw leaveBalancesResult.error;
  if (existingItemsResult.error) throw existingItemsResult.error;

  const employees = employeesResult.data || [];
  const attendanceLogs = attendanceResult.data || [];
  const leaveRequests = leaveRequestsResult.data || [];
  const leaveBalances = leaveBalancesResult.data || [];
  const existingItems = existingItemsResult.data || [];

  const leaveBalanceMap = leaveBalances.reduce((map, balance) => {
    map[
      buildBalanceKey(
        balance.employee_id,
        balance.leave_type_id,
        balance.year
      )
    ] = balance;

    return map;
  }, {});

  const existingItemMap = existingItems.reduce((map, item) => {
    map[item.employee_id] = item;
    return map;
  }, {});

  for (const employee of employees) {
    const existingItem = existingItemMap[employee.id];

    const computed = calculateEmployeePayroll({
      employee,
      payrollRun: run,
      attendanceLogs,
      leaveRequests,
      leaveBalanceMap,
      existingItem,
    });

    if (existingItem?.id) {
      const { error } = await supabase
        .from("hr_employee_payroll_items")
        .update({
          basic_salary: computed.basicSalary,
          allowances: computed.allowances,
          overtime_pay: computed.overtimePay,
          bonus: computed.bonus,
          deductions: computed.deductions,
          net_pay: computed.netPay,
          status: computed.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("hr_employee_payroll_items").insert({
        workspace_id: workspaceId,
        payroll_run_id: payrollRunId,
        employee_id: employee.id,
        basic_salary: computed.basicSalary,
        allowances: computed.allowances,
        overtime_pay: computed.overtimePay,
        bonus: computed.bonus,
        deductions: computed.deductions,
        net_pay: computed.netPay,
        status: computed.status,
      });

      if (error) throw error;
    }
  }

  await recalculatePayrollRun(payrollRunId);

  await supabase
    .from("hr_payroll_runs")
    .update({
      status: run.status === "draft" ? "processing" : run.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payrollRunId);

  return {
    generated: employees.length,
  };
}
