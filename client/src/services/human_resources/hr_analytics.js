import { supabase } from "../../config/supabaseClient";

function monthLabel(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(new Date(value));
}

function countBy(items, keyGetter) {
  return items.reduce((acc, item) => {
    const key = keyGetter(item) || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function toChartData(map) {
  return Object.entries(map).map(([label, value]) => ({
    label,
    value,
  }));
}

function average(values) {
  const clean = values.map(Number).filter((value) => Number.isFinite(value));

  if (!clean.length) return 0;

  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function calculateHealthScore({
  activeRate,
  attendanceRate,
  engagementScore,
  performanceScore,
  retentionRiskCount,
}) {
  const performancePercent = performanceScore ? (performanceScore / 5) * 100 : 75;
  const riskPenalty = Math.min(20, retentionRiskCount * 5);

  const score =
    activeRate * 0.25 +
    attendanceRate * 0.25 +
    engagementScore * 0.25 +
    performancePercent * 0.25 -
    riskPenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getHRAnalyticsData() {
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
  ] = await Promise.all([
    supabase
      .from("hr_employees")
      .select(`
        id,
        employee_code,
        employment_status,
        hire_date,
        is_active,
        department:hr_departments (
          id,
          name
        )
      `),

    supabase
      .from("hr_attendance_logs")
      .select("id, attendance_date, status"),

    supabase
      .from("hr_leave_requests")
      .select(`
        id,
        status,
        total_days,
        leave_type:hr_leave_types (
          id,
          name
        )
      `),

    supabase
      .from("hr_payroll_runs")
      .select("id, period_label, period_start, gross_pay, deductions, net_pay, status")
      .order("period_start", { ascending: true }),

    supabase
      .from("hr_job_openings")
      .select("id, status"),

    supabase
      .from("hr_candidates")
      .select("id, stage, fit_score"),

    supabase
      .from("hr_performance_evaluations")
      .select("id, score, status"),

    supabase
      .from("hr_employee_goals")
      .select("id, progress, status"),

    supabase
      .from("hr_pulse_surveys")
      .select("id, average_score, total_recipients, responses_count, status")
      .order("created_at", { ascending: false }),

    supabase
      .from("hr_feedback_items")
      .select("id, sentiment"),

    supabase
      .from("hr_retention_risks")
      .select("id, risk_level, status"),
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
  ];

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const employees = (employeesResult.data || []).filter(
    (employee) =>
      employee.is_active === true &&
      (employee.employment_status || "active") === "active"
  );
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

  const totalEmployees = employees.length;
  const activeEmployees = employees.length;

  const activeRate = totalEmployees
    ? Math.round((activeEmployees / totalEmployees) * 100)
    : 0;

  const presentAttendance = attendance.filter(
    (item) => item.status === "present" || item.status === "Present"
  ).length;

  const attendanceRate = attendance.length
    ? Math.round((presentAttendance / attendance.length) * 100)
    : 0;

  const latestSurvey = surveys[0];
  const engagementScore = Number(latestSurvey?.average_score || 0);

  const averagePerformanceScore = average(
    evaluations.map((evaluation) => evaluation.score)
  );

  const openJobs = jobs.filter((job) => job.status === "active").length;
  const pendingLeave = leaves.filter((leave) => leave.status === "pending").length;
  const approvedLeave = leaves.filter((leave) => leave.status === "approved").length;
  const highRisks = risks.filter((risk) => risk.risk_level === "high").length;

  const latestPayroll = payrollRuns[payrollRuns.length - 1];

  const healthScore = calculateHealthScore({
    activeRate: activeRate || 75,
    attendanceRate: attendanceRate || 75,
    engagementScore: engagementScore || 75,
    performanceScore: averagePerformanceScore || 3.75,
    retentionRiskCount: risks.length,
  });

  const hiresByMonth = countBy(employees, (employee) =>
    monthLabel(employee.hire_date)
  );

  const departmentCounts = countBy(
    employees,
    (employee) => employee.department?.name || "Unassigned"
  );

  const attendanceByMonth = {};
  attendance.forEach((record) => {
    const month = monthLabel(record.attendance_date);
    if (!attendanceByMonth[month]) {
      attendanceByMonth[month] = { total: 0, present: 0 };
    }

    attendanceByMonth[month].total += 1;

    if (record.status === "present" || record.status === "Present") {
      attendanceByMonth[month].present += 1;
    }
  });

  const attendanceTrend = Object.entries(attendanceByMonth).map(
    ([label, value]) => ({
      label,
      value: value.total ? Math.round((value.present / value.total) * 100) : 0,
    })
  );

  const hiringFunnel = toChartData(
    countBy(candidates, (candidate) => candidate.stage || "applied")
  ).map((item) => ({
    label: item.label.replaceAll("_", " "),
    value: item.value,
  }));

  const payrollTrend = payrollRuns.map((run) => ({
    label: run.period_label || monthLabel(run.period_start),
    value: Number(run.net_pay || 0),
  }));

  const leaveUsage = toChartData(
    leaves.reduce((acc, leave) => {
      const label = leave.leave_type?.name || "Unassigned";
      acc[label] = (acc[label] || 0) + Number(leave.total_days || 0);
      return acc;
    }, {})
  );

  const feedbackSentiment = toChartData(
    countBy(feedback, (item) => item.sentiment || "neutral")
  );

  const goalProgress = goals.length
    ? Math.round(average(goals.map((goal) => goal.progress)))
    : 0;

  return {
    healthScore,

    summary: {
      totalEmployees,
      activeEmployees,
      workforceGrowth: totalEmployees,
      attendanceRate,
      engagementScore,
      payrollGross: Number(latestPayroll?.gross_pay || 0),
      payrollNet: Number(latestPayroll?.net_pay || 0),
      openJobs,
      candidates: candidates.length,
      pendingLeave,
      approvedLeave,
      averagePerformanceScore: Number(averagePerformanceScore.toFixed(2)),
      goalProgress,
      retentionRisks: risks.length,
      highRisks,
    },

    workforceGrowth: toChartData(hiresByMonth),
    departmentHeadcount: toChartData(departmentCounts),
    hiringFunnel,
    attendanceTrend,
    payrollTrend,
    leaveUsage,
    feedbackSentiment,

    insights: [
      {
        id: "health-score",
        type: healthScore >= 80 ? "info" : healthScore >= 65 ? "warning" : "risk",
        title: `Workforce Health Score: ${healthScore}/100`,
        detail:
          "Calculated from active employee rate, attendance, engagement, performance, and retention risk signals.",
      },
      {
        id: "retention-risk",
        type: risks.length ? "warning" : "info",
        title: "Retention Risk",
        detail: `${risks.length} active retention risk signal(s), including ${highRisks} high-risk item(s).`,
      },
      {
        id: "recruitment-pipeline",
        type: openJobs ? "info" : "warning",
        title: "Recruitment Pipeline",
        detail: `${openJobs} open job(s) and ${candidates.length} candidate(s) currently tracked.`,
      },
      {
        id: "leave-monitoring",
        type: pendingLeave ? "warning" : "info",
        title: "Leave Monitoring",
        detail: `${pendingLeave} pending leave request(s), ${approvedLeave} approved request(s).`,
      },
    ],
  };
}
