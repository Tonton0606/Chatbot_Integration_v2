import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

function fullName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(" ");
}

function normalizeSurvey(row) {
  return {
    id: row.id,
    surveyCode: row.survey_code,
    title: row.title,
    sentDate: row.sent_date,
    deadline: row.deadline,
    totalRecipients: Number(row.total_recipients || 0),
    responsesCount: Number(row.responses_count || 0),
    averageScore: Number(row.average_score || 0),
    status: row.status || "active",
    description: row.description || "",
  };
}

function normalizeFeedback(row) {
  return {
    id: row.id,
    employeeId: row.employee_id || "",
    employee: row.employee ? fullName(row.employee) : "Anonymous",
    type: row.feedback_type || "anonymous",
    topic: row.topic,
    content: row.content,
    sentiment: row.sentiment || "neutral",
    date: row.feedback_date,
  };
}

function normalizeRisk(row) {
  return {
    id: row.id,
    employeeId: row.employee_id || "",
    employee: row.employee ? fullName(row.employee) : "Unknown Employee",
    employeeCode: row.employee?.employee_code || "—",
    department: row.employee?.department?.name || "Unassigned",
    riskLevel: row.risk_level || "low",
    signals: row.signals || [],
    aiNote: row.ai_note || "Needs HR review.",
    status: row.status || "open",
  };
}

function normalizeRecognition(row) {
  return {
    id: row.id,
    fromEmployeeId: row.from_employee_id || "",
    toEmployeeId: row.to_employee_id || "",
    from: row.from_employee ? fullName(row.from_employee) : "System",
    to: row.to_employee ? fullName(row.to_employee) : "Unknown Employee",
    category: row.category || "excellence",
    message: row.message || "",
    likes: Number(row.likes || 0),
    date: row.recognition_date,
  };
}

export async function getEmployeeEngagementData() {
  const [
    surveysResult,
    feedbackResult,
    risksResult,
    recognitionResult,
    departmentsResult,
    employeesResult,
  ] = await Promise.all([
    supabase
      .from("hr_pulse_surveys")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_feedback_items")
      .select(`
        id,
        employee_id,
        feedback_type,
        topic,
        content,
        sentiment,
        feedback_date,
        employee:hr_employees (
          id,
          employee_code,
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_retention_risks")
      .select(`
        id,
        employee_id,
        risk_level,
        signals,
        ai_note,
        status,
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
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_recognition_items")
      .select(`
        id,
        from_employee_id,
        to_employee_id,
        category,
        message,
        likes,
        recognition_date,
        from_employee:hr_employees!hr_recognition_items_from_employee_id_fkey (
          id,
          first_name,
          last_name
        ),
        to_employee:hr_employees!hr_recognition_items_to_employee_id_fkey (
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

  if (surveysResult.error) throw surveysResult.error;
  if (feedbackResult.error) throw feedbackResult.error;
  if (risksResult.error) throw risksResult.error;
  if (recognitionResult.error) throw recognitionResult.error;
  if (departmentsResult.error) throw departmentsResult.error;
  if (employeesResult.error) throw employeesResult.error;

  const surveys = (surveysResult.data || []).map(normalizeSurvey);
  const feedbackItems = (feedbackResult.data || []).map(normalizeFeedback);
  const retentionRisks = (risksResult.data || []).map(normalizeRisk);
  const recognitionFeed = (recognitionResult.data || []).map(normalizeRecognition);
  const uniqueDepartments = Array.from(
    new Map((departmentsResult.data || []).map((department) => [department.name, department])).values()
  );

  const engagementScore = surveys[0]?.averageScore || 0;

  return {
    overview: {
      engagementScore,
      satisfactionScore: engagementScore,
      wellnessScore: Math.max(0, engagementScore - 4),
      participationRate: engagementScore,
      surveyCount: surveys.length,
      feedbackCount: feedbackItems.length,
      retentionRiskCount: retentionRisks.length,
      recognitionCount: recognitionFeed.length,
    },
    departmentSentiment: uniqueDepartments.map((department) => ({
      id: department.id,
      department: department.name,
      score: engagementScore || 75,
      trend: "stable",
    })),
    surveys,
    recognitionFeed,
    retentionRisks,
    feedbackItems,
    employees: (employeesResult.data || []).map((employee) => ({
      id: employee.id,
      employeeCode: employee.employee_code,
      name: fullName(employee),
    })),
    insights: [
      {
        id: "engagement-review",
        title: "Engagement Review",
        detail:
          "AI engagement and retention signals require HR validation before employee action.",
      },
    ],
  };
}

export async function createPulseSurvey(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_pulse_surveys").insert({
    workspace_id: workspaceId,
    survey_code: payload.surveyCode?.trim(),
    title: payload.title?.trim(),
    sent_date: payload.sentDate || null,
    deadline: payload.deadline || null,
    total_recipients: Number(payload.totalRecipients || 0),
    responses_count: Number(payload.responsesCount || 0),
    average_score: Number(payload.averageScore || 0),
    status: payload.status || "active",
    description: payload.description?.trim() || null,
  });

  if (error) throw error;
  return true;
}

export async function updatePulseSurvey(id, payload) {
  const { error } = await supabase
    .from("hr_pulse_surveys")
    .update({
      survey_code: payload.surveyCode?.trim(),
      title: payload.title?.trim(),
      sent_date: payload.sentDate || null,
      deadline: payload.deadline || null,
      total_recipients: Number(payload.totalRecipients || 0),
      responses_count: Number(payload.responsesCount || 0),
      average_score: Number(payload.averageScore || 0),
      status: payload.status || "active",
      description: payload.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deletePulseSurvey(id) {
  const { error } = await supabase.from("hr_pulse_surveys").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function createFeedbackItem(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_feedback_items").insert({
    workspace_id: workspaceId,
    employee_id: payload.employeeId || null,
    feedback_type: payload.type || "anonymous",
    topic: payload.topic?.trim(),
    content: payload.content?.trim(),
    sentiment: payload.sentiment || "neutral",
    feedback_date: payload.date || new Date().toISOString().slice(0, 10),
  });

  if (error) throw error;
  return true;
}

export async function updateFeedbackItem(id, payload) {
  const { error } = await supabase
    .from("hr_feedback_items")
    .update({
      employee_id: payload.employeeId || null,
      feedback_type: payload.type || "anonymous",
      topic: payload.topic?.trim(),
      content: payload.content?.trim(),
      sentiment: payload.sentiment || "neutral",
      feedback_date: payload.date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteFeedbackItem(id) {
  const { error } = await supabase.from("hr_feedback_items").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function createRetentionRisk(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_retention_risks").insert({
    workspace_id: workspaceId,
    employee_id: payload.employeeId || null,
    risk_level: payload.riskLevel || "low",
    signals: payload.signals
      ? payload.signals.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    ai_note: payload.aiNote?.trim() || null,
    status: payload.status || "open",
  });

  if (error) throw error;
  return true;
}

export async function updateRetentionRisk(id, payload) {
  const { error } = await supabase
    .from("hr_retention_risks")
    .update({
      employee_id: payload.employeeId || null,
      risk_level: payload.riskLevel || "low",
      signals: payload.signals
        ? payload.signals.split(",").map((item) => item.trim()).filter(Boolean)
        : [],
      ai_note: payload.aiNote?.trim() || null,
      status: payload.status || "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteRetentionRisk(id) {
  const { error } = await supabase.from("hr_retention_risks").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function createRecognitionItem(payload) {
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase.from("hr_recognition_items").insert({
    workspace_id: workspaceId,
    from_employee_id: payload.fromEmployeeId || null,
    to_employee_id: payload.toEmployeeId || null,
    category: payload.category || "excellence",
    message: payload.message?.trim(),
    likes: Number(payload.likes || 0),
    recognition_date: payload.date || new Date().toISOString().slice(0, 10),
  });

  if (error) throw error;
  return true;
}

export async function updateRecognitionItem(id, payload) {
  const { error } = await supabase
    .from("hr_recognition_items")
    .update({
      from_employee_id: payload.fromEmployeeId || null,
      to_employee_id: payload.toEmployeeId || null,
      category: payload.category || "excellence",
      message: payload.message?.trim(),
      likes: Number(payload.likes || 0),
      recognition_date: payload.date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function deleteRecognitionItem(id) {
  const { error } = await supabase
    .from("hr_recognition_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
