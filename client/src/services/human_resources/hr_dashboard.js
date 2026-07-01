import { supabase } from "../../config/supabaseClient";

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function toChartData(map) {
  return Object.entries(map).map(([label, value]) => ({ label, value }));
}

export async function getHRDashboardData() {
  const [
    employeesResult,
    attendanceResult,
    leaveResult,
    payrollRunsResult,
    jobsResult,
    candidatesResult,
    evaluationsResult,
    goalsResult,
    surveysResult,
    feedbackResult,
    risksResult,
    recognitionResult,
  ] = await Promise.all([
    supabase.from("hr_employees").select(`
      id,
      employee_code,
      employment_status,
      is_active,
      department:hr_departments (
        id,
        name
      )
    `),

    supabase
      .from("hr_attendance_logs")
      .select("id, attendance_date, status, work_hours, overtime_hours"),

    supabase.from("hr_leave_requests").select("id, status, total_days"),

    supabase
      .from("hr_payroll_runs")
      .select("id, period_label, gross_pay, deductions, net_pay, status, period_start")
      .order("period_start", { ascending: false }),

    supabase.from("hr_job_openings").select("id, status"),

    supabase.from("hr_candidates").select("id, stage, fit_score"),

    supabase.from("hr_performance_evaluations").select("id, score, status"),

    supabase.from("hr_employee_goals").select("id, progress, status"),

    supabase
      .from("hr_pulse_surveys")
      .select("id, average_score, total_recipients, responses_count, status")
      .order("created_at", { ascending: false }),

    supabase.from("hr_feedback_items").select("id, sentiment"),

    supabase.from("hr_retention_risks").select("id, risk_level, status"),

    supabase.from("hr_recognition_items").select("id, likes"),
  ]);

  const results = [
    employeesResult,
    attendanceResult,
    leaveResult,
    payrollRunsResult,
    jobsResult,
    candidatesResult,
    evaluationsResult,
    goalsResult,
    surveysResult,
    feedbackResult,
    risksResult,
    recognitionResult,
  ];

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const employees = employeesResult.data || [];
  const attendance = attendanceResult.data || [];
  const leaves = leaveResult.data || [];
  const payrollRuns = payrollRunsResult.data || [];
  const jobs = jobsResult.data || [];
  const candidates = candidatesResult.data || [];
  const evaluations = evaluationsResult.data || [];
  const goals = goalsResult.data || [];
  const surveys = surveysResult.data || [];
  const feedback = feedbackResult.data || [];
  const risks = risksResult.data || [];
  const recognition = recognitionResult.data || [];

  const activeEmployees = employees.filter(
    (employee) =>
      employee.is_active === true ||
      employee.employment_status === "active"
  ).length;

  const presentAttendance = attendance.filter(
    (record) => record.status === "present"
  ).length;

  const lateAttendance = attendance.filter(
    (record) => record.status === "late"
  ).length;

  const attendanceRate = attendance.length
    ? Math.round((presentAttendance / attendance.length) * 100)
    : 0;

  const pendingLeave = leaves.filter((item) => item.status === "pending").length;
  const approvedLeave = leaves.filter((item) => item.status === "approved").length;

  const latestPayroll = payrollRuns[0];

  const openJobs = jobs.filter((job) => job.status === "active").length;
  const averageFitScore = Math.round(
    average(candidates.map((item) => item.fit_score))
  );
  const averagePerformance = Number(
    average(evaluations.map((item) => item.score)).toFixed(2)
  );
  const averageGoalProgress = Math.round(
    average(goals.map((item) => item.progress))
  );
  const latestEngagementScore = Number(surveys[0]?.average_score || 0);

  const highRiskCount = risks.filter((risk) => risk.risk_level === "high").length;
  const mediumRiskCount = risks.filter((risk) => risk.risk_level === "medium").length;

  return {
    summary: {
      totalEmployees: employees.length,
      activeEmployees,
      attendanceRate,
      lateAttendance,
      pendingLeave,
      approvedLeave,
      payrollGross: Number(latestPayroll?.gross_pay || 0),
      payrollNet: Number(latestPayroll?.net_pay || 0),
      openJobs,
      candidates: candidates.length,
      averageFitScore,
      averagePerformance,
      averageGoalProgress,
      latestEngagementScore,
      feedbackCount: feedback.length,
      recognitionCount: recognition.length,
      retentionRiskCount: risks.length,
      highRiskCount,
      mediumRiskCount,
    },

    departmentHeadcount: toChartData(
      countBy(employees, (employee) => employee.department?.name)
    ),

    candidateStages: toChartData(
      countBy(candidates, (candidate) =>
        String(candidate.stage || "applied").replaceAll("_", " ")
      )
    ),

    riskBreakdown: toChartData(
      countBy(risks, (risk) => risk.risk_level || "low")
    ),

    insights: [
      {
        id: "attendance",
        title: "Attendance Health",
        detail: `${attendanceRate}% attendance rate with ${lateAttendance} late attendance log(s).`,
      },
      {
        id: "leave",
        title: "Leave Monitoring",
        detail: `${pendingLeave} pending leave request(s), ${approvedLeave} approved leave request(s).`,
      },
      {
        id: "recruitment",
        title: "Recruitment Pipeline",
        detail: `${openJobs} open job(s), ${candidates.length} candidate(s), average fit score ${averageFitScore}%.`,
      },
      {
        id: "engagement",
        title: "Engagement Signal",
        detail: `Latest engagement score is ${latestEngagementScore}% with ${risks.length} retention risk signal(s).`,
      },
    ],
  };
}
