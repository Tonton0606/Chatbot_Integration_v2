import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

function fullName(employee = {}) {
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Unassigned";
}

function labelReadiness(value = "") {
  const map = {
    ready_now: "Ready now",
    ready_6_months: "Ready in 6 months",
    needs_development: "Needs development",
  };

  return map[value] || value || "Needs development";
}

function labelValue(value = "") {
  if (!value) return "Medium";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function normalizeTaskStatus(status = "") {
  return String(status || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function isTaskCompleted(task = {}) {
  const status = normalizeTaskStatus(task.status);
  return !!task.completed_at || ["done", "completed", "complete"].includes(status);
}

function calculateTaskScore(stats = {}) {
  const assigned = Number(stats.assigned || 0);
  if (!assigned) return 0;

  const completed = Number(stats.completed || 0);
  const overdue = Number(stats.overdue || 0);

  const completionRate = completed / assigned;
  const overdueRate = overdue / assigned;

  return clampScore((completionRate * 100) - (overdueRate * 20));
}

function calculateAttendanceScore(logs = []) {
  if (!logs.length) return 0;

  const scoreMap = {
    present: 100,
    late: 70,
    absent: 0,
    leave: 85,
  };

  const total = logs.reduce((sum, log) => {
    const status = String(log.status || "").toLowerCase();
    return sum + (scoreMap[status] ?? 50);
  }, 0);

  return clampScore(total / logs.length);
}

function normalizePerformanceScore(value) {
  const numeric = Number(value || 0);
  if (numeric <= 1) return clampScore(numeric * 100);
  return clampScore(numeric);
}

function calculateEngagementScore({ feedback = [], recognition = [] } = {}) {
  const sentimentMap = {
    positive: 100,
    neutral: 70,
    negative: 30,
  };

  const feedbackScore = feedback.length
    ? feedback.reduce((sum, item) => {
        const sentiment = String(item.sentiment || "").toLowerCase();
        return sum + (sentimentMap[sentiment] ?? 50);
      }, 0) / feedback.length
    : 0;

  const recognitionScore = recognition.length
    ? Math.min(
        100,
        recognition.reduce((sum, item) => sum + Number(item.likes || 0), 0) * 10
      )
    : 0;

  if (feedback.length && recognition.length) {
    return clampScore((feedbackScore * 0.7) + (recognitionScore * 0.3));
  }

  if (feedback.length) return clampScore(feedbackScore);
  if (recognition.length) return clampScore(recognitionScore);

  return 0;
}

function calculateWeightedFinal(scores, config) {
  const signals = [
    ["tasks", scores.taskScore],
    ["attendance", scores.attendanceScore],
    ["performance", scores.performanceScore],
    ["engagement", scores.engagementScore],
  ];

  const active = signals.filter(
    ([key]) => config[key]?.enabled && Number(config[key]?.weight || 0) > 0
  );

  const totalWeight = active.reduce(
    (sum, [key]) => sum + Number(config[key]?.weight || 0),
    0
  );

  if (!totalWeight) return 0;

  return clampScore(
    active.reduce((sum, [key, score]) => {
      return sum + Number(score || 0) * Number(config[key]?.weight || 0);
    }, 0) / totalWeight
  );
}

function labelFromFinalScore(score) {
  if (score >= 90) return { readiness: "Ready now", potential: "High", risk: "Low" };
  if (score >= 75) return { readiness: "Ready in 6 months", potential: "High", risk: "Medium" };
  return { readiness: "Needs development", potential: "Medium", risk: "High" };
}

function getTaskWindowStartDate() {
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
}

export async function getTalentManagementData() {
  const workspaceId = await getCurrentWorkspaceId();

  const [
    configResult,
    scoresResult,
    employeesResult,
    tasksResult,
    attendanceResult,
    performanceResult,
    feedbackResult,
    recognitionResult,
    skillsResult,
    plansResult,
    pathsResult,
  ] = await Promise.all([
    supabase
      .from("hr_talent_score_configs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .maybeSingle(),

    supabase
      .from("hr_talent_scores")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("final_score", { ascending: false }),

    supabase
      .from("hr_employees")
      .select(`
        id,
        profile_id,
        first_name,
        last_name,
        is_active,
        department:hr_departments (
          id,
          name
        ),
        position:hr_positions (
          id,
          title
        )
      `)
      .eq("workspace_id", workspaceId),

    supabase
      .from("admin_tasks")
      .select("id, assigned_to, status, due_date, completed_at, archived_at, created_at")
      .gte("created_at", getTaskWindowStartDate()),

    supabase
      .from("hr_attendance_logs")
      .select("id, employee_id, status, attendance_date")
      .eq("workspace_id", workspaceId),

    supabase
      .from("hr_performance_evaluations")
      .select("id, employee_id, score, status, review_date, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .order("review_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_feedback_items")
      .select("id, employee_id, sentiment, feedback_date")
      .eq("workspace_id", workspaceId),

    supabase
      .from("hr_recognition_items")
      .select("id, to_employee_id, likes, recognition_date")
      .eq("workspace_id", workspaceId),

    supabase
      .from("hr_skills")
      .select(`
        *,
        employee_skills:hr_employee_skills(id)
      `)
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true }),

    supabase
      .from("hr_succession_plans")
      .select(`
        *,
        candidates:hr_succession_candidates(
          readiness,
          talent_score,
          employee:hr_employees(first_name,last_name)
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_career_paths")
      .select(`
        *,
        steps:hr_career_path_steps(*)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  if (configResult.error) throw configResult.error;
  if (scoresResult.error) throw scoresResult.error;
  if (employeesResult.error) throw employeesResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (attendanceResult.error) throw attendanceResult.error;
  if (performanceResult.error) throw performanceResult.error;
  if (feedbackResult.error) throw feedbackResult.error;
  if (recognitionResult.error) throw recognitionResult.error;
  if (skillsResult.error) throw skillsResult.error;
  if (plansResult.error) throw plansResult.error;
  if (pathsResult.error) throw pathsResult.error;

  const config = configResult.data || {
    task_weight: 50,
    attendance_weight: 30,
    performance_weight: 10,
    engagement_weight: 10,
  };

  const scoringConfig = {
    tasks: {
      enabled: Number(config.task_weight || 0) > 0,
      weight: Number(config.task_weight || 0),
    },
    attendance: {
      enabled: Number(config.attendance_weight || 0) > 0,
      weight: Number(config.attendance_weight || 0),
    },
    performance: {
      enabled: Number(config.performance_weight || 0) > 0,
      weight: Number(config.performance_weight || 0),
    },
    engagement: {
      enabled: Number(config.engagement_weight || 0) > 0,
      weight: Number(config.engagement_weight || 0),
    },
  };

  const employeeById = new Map(
    (employeesResult.data || []).map((employee) => [employee.id, employee])
  );

  const taskStatsByProfileId = new Map();

  (tasksResult.data || [])
    .filter((task) => !task.archived_at)
    .forEach((task) => {
      if (!task.assigned_to) return;

      const current = taskStatsByProfileId.get(task.assigned_to) || {
        assigned: 0,
        completed: 0,
        overdue: 0,
      };

      const completed = isTaskCompleted(task);

      const overdue =
        task.due_date &&
        new Date(task.due_date) < new Date() &&
        !completed;

      current.assigned += 1;
      if (completed) current.completed += 1;
      if (overdue) current.overdue += 1;

      taskStatsByProfileId.set(task.assigned_to, current);
    });

  const attendanceLogsByEmployeeId = new Map();

  (attendanceResult.data || []).forEach((log) => {
    const current = attendanceLogsByEmployeeId.get(log.employee_id) || [];
    current.push(log);
    attendanceLogsByEmployeeId.set(log.employee_id, current);
  });

  const latestPerformanceByEmployeeId = new Map();

  (performanceResult.data || []).forEach((review) => {
    if (!latestPerformanceByEmployeeId.has(review.employee_id)) {
      latestPerformanceByEmployeeId.set(review.employee_id, review);
    }
  });

  const feedbackByEmployeeId = new Map();

  (feedbackResult.data || []).forEach((item) => {
    if (!item.employee_id) return;
    const current = feedbackByEmployeeId.get(item.employee_id) || [];
    current.push(item);
    feedbackByEmployeeId.set(item.employee_id, current);
  });

  const recognitionByEmployeeId = new Map();

  (recognitionResult.data || []).forEach((item) => {
    if (!item.to_employee_id) return;
    const current = recognitionByEmployeeId.get(item.to_employee_id) || [];
    current.push(item);
    recognitionByEmployeeId.set(item.to_employee_id, current);
  });

  const talentPool = (scoresResult.data || []).map((row) => {
    const employee = employeeById.get(row.employee_id);
    const taskStats = taskStatsByProfileId.get(employee?.profile_id) || {};

    const taskScore = calculateTaskScore(taskStats);
    const attendanceScore = calculateAttendanceScore(
      attendanceLogsByEmployeeId.get(row.employee_id) || []
    );
    const performanceScore = normalizePerformanceScore(
      latestPerformanceByEmployeeId.get(row.employee_id)?.score
    );
    const engagementScore = calculateEngagementScore({
      feedback: feedbackByEmployeeId.get(row.employee_id) || [],
      recognition: recognitionByEmployeeId.get(row.employee_id) || [],
    });

    const baseScores = {
      taskScore,
      attendanceScore,
      performanceScore,
      engagementScore,
    };

    const finalScore = calculateWeightedFinal(baseScores, scoringConfig);
    const labels = labelFromFinalScore(finalScore);

    return {
      id: row.id,
      employeeId: row.employee_id,
      employee: fullName(employee),
      role: employee?.position?.title || "Unassigned",
      department: employee?.department?.name || "Unassigned",
      talentScore: finalScore,
      taskScore: baseScores.taskScore,
      attendanceScore: baseScores.attendanceScore,
      performanceScore: baseScores.performanceScore,
      engagementScore: baseScores.engagementScore,
      assignedTasks: Number(taskStats.assigned || 0),
      completedTasks: Number(taskStats.completed || 0),
      overdueTasks: Number(taskStats.overdue || 0),
      readiness: labels.readiness,
      potential: labels.potential,
      risk: labels.risk,
    };
  });

  const skillMatrix = (skillsResult.data || []).map((skill) => ({
    skill: skill.name,
    employees: skill.employee_skills?.length || 0,
    gap: labelValue(
      skill.priority === "high"
        ? "high"
        : skill.priority === "medium"
          ? "medium"
          : "low"
    ),
    priority: labelValue(skill.priority),
  }));

  const successionPlans = (plansResult.data || []).map((plan) => ({
    id: plan.id,
    role: plan.role_title,
    coverage: Number(plan.coverage_score || 0),
    risk: labelValue(plan.risk_level),
    candidates: (plan.candidates || []).map((item) => fullName(item.employee)),
  }));

  const careerPaths = (pathsResult.data || []).map((path) => {
    const steps = (path.steps || [])
      .sort((a, b) => Number(a.step_order || 0) - Number(b.step_order || 0))
      .map((step) => step.title);

    const pathName = String(path.name || "").toLowerCase();
    const stepTitles = steps.map((step) => String(step || "").toLowerCase());

    const matchingEmployees = (employeesResult.data || [])
      .filter((employee) => employee.is_active !== false)
      .filter((employee) => !employee.archived_at)
      .filter((employee) => {
        const positionTitle = String(employee.position?.title || "").toLowerCase();

        if (!positionTitle) return false;
        if (stepTitles.includes(positionTitle)) return true;

        if (
          pathName.includes("developer") &&
          (
            positionTitle.includes("developer") ||
            positionTitle.includes("software engineer") ||
            positionTitle.includes("engineer")
          )
        ) {
          return true;
        }

        return false;
      });

    return {
      id: path.id,
      path: path.name,
      employees: matchingEmployees.length,
      steps,
    };
  });

  return {
    scoringConfig,
    summary: {
      highPotential: talentPool.filter((item) => item.potential === "High").length,
      promotionReady: talentPool.filter((item) => item.readiness === "Ready now").length,
      successionCandidates: successionPlans.reduce(
        (sum, plan) => sum + plan.candidates.length,
        0
      ),
      averageTalentScore: talentPool.length
        ? Math.round(
            talentPool.reduce((sum, item) => sum + item.talentScore, 0) /
              talentPool.length
          )
        : 0,
      skillsGapCount: skillMatrix.filter((item) => item.gap === "High").length,
    },
    talentPool,
    successionPlans,
    skillMatrix,
    careerPaths,
  };
}

export async function updateTalentScoreConfig({ scoringConfig, rules }) {
  const workspaceId = await getCurrentWorkspaceId();

  const payload = {
    workspace_id: workspaceId,
    task_weight: scoringConfig.tasks?.enabled ? Number(scoringConfig.tasks.weight || 0) : 0,
    attendance_weight: scoringConfig.attendance?.enabled ? Number(scoringConfig.attendance.weight || 0) : 0,
    performance_weight: scoringConfig.performance?.enabled ? Number(scoringConfig.performance.weight || 0) : 0,
    engagement_weight: scoringConfig.engagement?.enabled ? Number(scoringConfig.engagement.weight || 0) : 0,
    readiness_ready_now_threshold: Number(rules.readyNow || 90),
    readiness_ready_soon_threshold: Number(rules.readySoon || 75),
    potential_high_threshold: Number(rules.potentialHigh || 90),
    potential_medium_threshold: Number(rules.potentialMedium || 75),
    risk_low_threshold: Number(rules.riskLow || 85),
    risk_medium_threshold: Number(rules.riskMedium || 70),
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("hr_talent_score_configs")
    .upsert(payload, {
      onConflict: "workspace_id",
    });

  if (error) throw error;

  return true;
}

function readinessCode(value = "") {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("ready now")) return "ready_now";
  if (normalized.includes("6 months")) return "ready_6_months";
  return "needs_development";
}

function lowerCode(value = "") {
  return String(value || "medium").toLowerCase();
}

export async function persistTalentScores(talentPool = []) {
  const workspaceId = await getCurrentWorkspaceId();

  const rows = talentPool
    .filter((item) => item.employeeId)
    .map((item) => ({
      workspace_id: workspaceId,
      employee_id: item.employeeId,
      task_score: Number(item.taskScore || 0),
      attendance_score: Number(item.attendanceScore || 0),
      performance_score: Number(item.performanceScore || 0),
      engagement_score: Number(item.engagementScore || 0),
      final_score: Number(item.talentScore || 0),
      readiness: readinessCode(item.readiness),
      potential: lowerCode(item.potential),
      risk_level: lowerCode(item.risk),
      calculated_at: new Date().toISOString(),
    }));

  if (!rows.length) return true;

  const { error } = await supabase
    .from("hr_talent_scores")
    .upsert(rows, {
      onConflict: "workspace_id,employee_id",
    });

  if (error) throw error;

  return true;
}
