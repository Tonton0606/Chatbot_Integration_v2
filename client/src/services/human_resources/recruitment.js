import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

export const JOB_STATUSES = ["active", "closed", "paused", "draft"];
export const CANDIDATE_STAGES = [
  "applied",
  "screening",
  "interview",
  "technical_review",
  "final_interview",
  "offer",
  "hired",
  "rejected",
];

export const JOB_STATUS_LABELS = {
  active: "Active",
  closed: "Closed",
  paused: "Paused",
  draft: "Draft",
};

export const CANDIDATE_STAGE_LABELS = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  technical_review: "Technical Review",
  final_interview: "Final Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

function fullName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(" ");
}

function normalizeJob(row) {
  return {
    id: row.id,
    jobCode: row.job_code,
    title: row.title,
    departmentId: row.department_id || "",
    department: row.department?.name || "Unassigned",
    type: row.employment_type || "full_time",
    priority: row.priority || "medium",
    status: row.status || "active",
    statusLabel: JOB_STATUS_LABELS[row.status] || row.status || "Active",
    openDate: row.open_date,
    deadline: row.deadline,
    recruiterId: row.recruiter_employee_id || "",
    recruiter: row.recruiter ? fullName(row.recruiter) : "—",
    description: row.description || "",
    aiNotes: row.ai_notes || "No AI notes yet.",
    applicants: Number(row.candidates?.[0]?.count || 0),
  };
}

function normalizeCandidate(row) {
  return {
    id: row.id,
    candidateCode: row.candidate_code,
    name: fullName(row),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || "",
    phone: row.phone || "",
    jobOpeningId: row.job_opening_id || "",
    position: row.job?.title || "Unassigned",
    source: row.source || "Direct",
    stage: row.stage || "applied",
    stageLabel: CANDIDATE_STAGE_LABELS[row.stage] || row.stage || "Applied",
    fitScore: Number(row.fit_score || 0),
    skillsMatch: Number(row.skills_match || 0),
    interviewStatus: row.interview_status || "pending",
    recruiterId: row.recruiter_employee_id || "",
    recruiter: row.recruiter ? fullName(row.recruiter) : "—",
    needsReview: !!row.needs_review,
    aiSummary: row.ai_summary || "No AI summary yet.",
    aiRecommendation: row.ai_recommendation || "Needs recruiter review.",
    createdAt: row.created_at,
  };
}

export async function getRecruitmentData() {
  const [jobsResult, candidatesResult, departmentsResult, employeesResult] =
    await Promise.all([
      supabase
        .from("hr_job_openings")
        .select(`
          id,
          department_id,
          job_code,
          title,
          employment_type,
          priority,
          status,
          open_date,
          deadline,
          recruiter_employee_id,
          description,
          ai_notes,
          department:hr_departments (
            id,
            name
          ),
          recruiter:hr_employees!hr_job_openings_recruiter_employee_id_fkey (
            id,
            first_name,
            last_name
          ),
          candidates:hr_candidates(count)
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("hr_candidates")
        .select(`
          id,
          job_opening_id,
          candidate_code,
          first_name,
          last_name,
          email,
          phone,
          source,
          stage,
          fit_score,
          skills_match,
          interview_status,
          recruiter_employee_id,
          needs_review,
          ai_summary,
          ai_recommendation,
          created_at,
          job:hr_job_openings (
            id,
            title
          ),
          recruiter:hr_employees!hr_candidates_recruiter_employee_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("hr_departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true }),

      supabase
        .from("hr_employees")
        .select("id, employee_code, first_name, last_name")
        .eq("is_active", true)
        .order("employee_code", { ascending: true }),
    ]);

  if (jobsResult.error) throw jobsResult.error;
  if (candidatesResult.error) throw candidatesResult.error;
  if (departmentsResult.error) throw departmentsResult.error;
  if (employeesResult.error) throw employeesResult.error;

  const jobs = (jobsResult.data || []).map(normalizeJob);
  const candidates = (candidatesResult.data || []).map(normalizeCandidate);

  return {
    jobs,
    candidates,
    departments: departmentsResult.data || [],
    employees: (employeesResult.data || []).map((employee) => ({
      id: employee.id,
      employeeCode: employee.employee_code,
      name: fullName(employee),
    })),
    insights: [
      {
        id: "recruitment-review",
        title: "Recruitment Review",
        detail:
          "AI fit scores are decision-support only. Recruiter review is required before hiring decisions.",
      },
    ],
  };
}

export async function createJobOpening(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_job_openings").insert({
    workspace_id: workspaceId,
    department_id: payload.departmentId || null,
    job_code: payload.jobCode?.trim(),
    title: payload.title?.trim(),
    employment_type: payload.type || "full_time",
    priority: payload.priority || "medium",
    status: payload.status || "active",
    open_date: payload.openDate,
    deadline: payload.deadline || null,
    recruiter_employee_id: payload.recruiterId || null,
    description: payload.description?.trim() || null,
    ai_notes: payload.aiNotes?.trim() || null,
  });

  if (error) throw error;
  return true;
}

export async function updateJobOpening(id, payload) {
  if (!id) throw new Error("Job opening ID is required.");

  const { error } = await supabase
    .from("hr_job_openings")
    .update({
      department_id: payload.departmentId || null,
      job_code: payload.jobCode?.trim(),
      title: payload.title?.trim(),
      employment_type: payload.type || "full_time",
      priority: payload.priority || "medium",
      status: payload.status || "active",
      open_date: payload.openDate,
      deadline: payload.deadline || null,
      recruiter_employee_id: payload.recruiterId || null,
      description: payload.description?.trim() || null,
      ai_notes: payload.aiNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteJobOpening(id) {
  if (!id) throw new Error("Job opening ID is required.");

  const { error } = await supabase.from("hr_job_openings").delete().eq("id", id);
  if (error) throw error;

  return true;
}

export async function createCandidate(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_candidates").insert({
    workspace_id: workspaceId,
    job_opening_id: payload.jobOpeningId || null,
    candidate_code: payload.candidateCode?.trim(),
    first_name: payload.firstName?.trim(),
    last_name: payload.lastName?.trim(),
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    source: payload.source?.trim() || "Direct",
    stage: payload.stage || "applied",
    fit_score: Number(payload.fitScore || 0),
    skills_match: Number(payload.skillsMatch || 0),
    interview_status: payload.interviewStatus || "pending",
    recruiter_employee_id: payload.recruiterId || null,
    needs_review: !!payload.needsReview,
    ai_summary: payload.aiSummary?.trim() || null,
    ai_recommendation: payload.aiRecommendation?.trim() || null,
  });

  if (error) throw error;
  return true;
}

export async function updateCandidate(id, payload) {
  if (!id) throw new Error("Candidate ID is required.");

  const { error } = await supabase
    .from("hr_candidates")
    .update({
      job_opening_id: payload.jobOpeningId || null,
      candidate_code: payload.candidateCode?.trim(),
      first_name: payload.firstName?.trim(),
      last_name: payload.lastName?.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      source: payload.source?.trim() || "Direct",
      stage: payload.stage || "applied",
      fit_score: Number(payload.fitScore || 0),
      skills_match: Number(payload.skillsMatch || 0),
      interview_status: payload.interviewStatus || "pending",
      recruiter_employee_id: payload.recruiterId || null,
      needs_review: !!payload.needsReview,
      ai_summary: payload.aiSummary?.trim() || null,
      ai_recommendation: payload.aiRecommendation?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteCandidate(id) {
  if (!id) throw new Error("Candidate ID is required.");

  const { error } = await supabase.from("hr_candidates").delete().eq("id", id);
  if (error) throw error;

  return true;
}
