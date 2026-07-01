import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

export const REVIEW_STATUSES = ["pending", "in_progress", "completed", "overdue"];
export const GOAL_STATUSES = ["on_track", "at_risk", "completed", "not_started"];

export const REVIEW_STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

export const GOAL_STATUS_LABELS = {
  on_track: "On Track",
  at_risk: "At Risk",
  completed: "Completed",
  not_started: "Not Started",
};

function fullName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(" ");
}

function normalizeCycle(row) {
  return {
    id: row.id,
    cycleCode: row.cycle_code,
    name: row.name,
    reviewType: row.review_type,
    type: row.review_type,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status || "in_progress",
    statusLabel: REVIEW_STATUS_LABELS[row.status] || row.status,
    description: row.description || "",
  };
}

function normalizeEvaluation(row) {
  return {
    id: row.id,
    reviewCycleId: row.review_cycle_id || "",
    employeeId: row.employee_id,
    reviewerEmployeeId: row.reviewer_employee_id || "",
    employee: row.employee ? fullName(row.employee) : "Unknown Employee",
    employeeCode: row.employee?.employee_code || "—",
    department: row.employee?.department?.name || "Unassigned",
    reviewer: row.reviewer ? fullName(row.reviewer) : "—",
    score: row.score === null ? null : Number(row.score),
    status: row.status || "pending",
    statusLabel: REVIEW_STATUS_LABELS[row.status] || row.status,
    reviewDate: row.review_date,
    summary: row.summary || "",
    strengths: row.strengths || "",
    improvementAreas: row.improvement_areas || "",
    aiSignal: row.ai_signal || "Needs HR review",
  };
}

function normalizeGoal(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employee: row.employee ? fullName(row.employee) : "Unknown Employee",
    employeeCode: row.employee?.employee_code || "—",
    goalTitle: row.goal_title,
    goal: row.goal_title,
    category: row.category || "General",
    progress: Number(row.progress || 0),
    status: row.status || "on_track",
    statusLabel: GOAL_STATUS_LABELS[row.status] || row.status,
    dueDate: row.due_date,
  };
}

export async function getPerformanceData() {
  const [cyclesResult, evaluationsResult, goalsResult, employeesResult] =
    await Promise.all([
      supabase
        .from("hr_review_cycles")
        .select("id, cycle_code, name, review_type, start_date, end_date, status, description")
        .order("start_date", { ascending: false }),

      supabase
        .from("hr_performance_evaluations")
        .select(`
          id,
          review_cycle_id,
          employee_id,
          reviewer_employee_id,
          score,
          status,
          review_date,
          summary,
          strengths,
          improvement_areas,
          ai_signal,
          employee:hr_employees!hr_performance_evaluations_employee_id_fkey (
            id,
            employee_code,
            first_name,
            last_name,
            department:hr_departments (
              id,
              name
            )
          ),
          reviewer:hr_employees!hr_performance_evaluations_reviewer_employee_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("hr_employee_goals")
        .select(`
          id,
          employee_id,
          goal_title,
          category,
          progress,
          status,
          due_date,
          employee:hr_employees (
            id,
            employee_code,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("hr_employees")
        .select("id, employee_code, first_name, last_name")
        .eq("is_active", true)
        .order("employee_code", { ascending: true }),
    ]);

  if (cyclesResult.error) throw cyclesResult.error;
  if (evaluationsResult.error) throw evaluationsResult.error;
  if (goalsResult.error) throw goalsResult.error;
  if (employeesResult.error) throw employeesResult.error;

  const reviewCycles = (cyclesResult.data || []).map(normalizeCycle);
  const evaluations = (evaluationsResult.data || []).map(normalizeEvaluation);
  const goals = (goalsResult.data || []).map(normalizeGoal);

  return {
    reviewCycles,
    evaluations,
    goals,
    employees: (employeesResult.data || []).map((employee) => ({
      id: employee.id,
      employeeCode: employee.employee_code,
      name: fullName(employee),
    })),
    insights: [
      {
        id: "performance-review",
        title: "Performance Review",
        detail:
          "AI performance signals are for HR review only and should not be used as automatic promotion or disciplinary decisions.",
      },
    ],
  };
}

export async function createReviewCycle(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_review_cycles").insert({
    workspace_id: workspaceId,
    cycle_code: payload.cycleCode?.trim(),
    name: payload.name?.trim(),
    review_type: payload.reviewType || "quarterly",
    start_date: payload.startDate,
    end_date: payload.endDate,
    status: payload.status || "in_progress",
    description: payload.description?.trim() || null,
  });

  if (error) throw error;
  return true;
}

export async function updateReviewCycle(id, payload) {
  if (!id) throw new Error("Review cycle ID is required.");

  const { error } = await supabase
    .from("hr_review_cycles")
    .update({
      cycle_code: payload.cycleCode?.trim(),
      name: payload.name?.trim(),
      review_type: payload.reviewType || "quarterly",
      start_date: payload.startDate,
      end_date: payload.endDate,
      status: payload.status || "in_progress",
      description: payload.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteReviewCycle(id) {
  const { error } = await supabase.from("hr_review_cycles").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function createEvaluation(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_performance_evaluations").insert({
    workspace_id: workspaceId,
    review_cycle_id: payload.reviewCycleId || null,
    employee_id: payload.employeeId,
    reviewer_employee_id: payload.reviewerEmployeeId || null,
    score: payload.score === "" ? null : Number(payload.score),
    status: payload.status || "pending",
    review_date: payload.reviewDate || null,
    summary: payload.summary?.trim() || null,
    strengths: payload.strengths?.trim() || null,
    improvement_areas: payload.improvementAreas?.trim() || null,
    ai_signal: payload.aiSignal?.trim() || null,
  });

  if (error) throw error;
  return true;
}

export async function updateEvaluation(id, payload) {
  if (!id) throw new Error("Evaluation ID is required.");

  const { error } = await supabase
    .from("hr_performance_evaluations")
    .update({
      review_cycle_id: payload.reviewCycleId || null,
      employee_id: payload.employeeId,
      reviewer_employee_id: payload.reviewerEmployeeId || null,
      score: payload.score === "" ? null : Number(payload.score),
      status: payload.status || "pending",
      review_date: payload.reviewDate || null,
      summary: payload.summary?.trim() || null,
      strengths: payload.strengths?.trim() || null,
      improvement_areas: payload.improvementAreas?.trim() || null,
      ai_signal: payload.aiSignal?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteEvaluation(id) {
  const { error } = await supabase
    .from("hr_performance_evaluations")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function createGoal(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_employee_goals").insert({
    workspace_id: workspaceId,
    employee_id: payload.employeeId,
    goal_title: payload.goalTitle?.trim(),
    category: payload.category?.trim() || null,
    progress: Number(payload.progress || 0),
    status: payload.status || "on_track",
    due_date: payload.dueDate || null,
  });

  if (error) throw error;
  return true;
}

export async function updateGoal(id, payload) {
  if (!id) throw new Error("Goal ID is required.");

  const { error } = await supabase
    .from("hr_employee_goals")
    .update({
      employee_id: payload.employeeId,
      goal_title: payload.goalTitle?.trim(),
      category: payload.category?.trim() || null,
      progress: Number(payload.progress || 0),
      status: payload.status || "on_track",
      due_date: payload.dueDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteGoal(id) {
  const { error } = await supabase.from("hr_employee_goals").delete().eq("id", id);
  if (error) throw error;
  return true;
}
