import { useEffect, useState } from "react";

import { getAssignments } from "@/services/operations/assignments";
import { getTeamMembers, getTeams } from "@/services/operations/teams";
import { getWorkload } from "@/services/operations/workload";

const KPI_DEFS = [
  {
    key: "total_teams",
    label: "Total Teams",
    icon: "👥",
    accent: "#00bcd4",
    favorable: true,
    sub: "registered teams",
  },
  {
    key: "active_members",
    label: "Active Members",
    icon: "🧑‍💼",
    accent: "#4a90d9",
    favorable: true,
    sub: "unique assigned workforce",
  },
  {
    key: "active_assignments",
    label: "Active Assignments",
    icon: "📋",
    accent: "#c9a84c",
    favorable: true,
    sub: "live assignments",
  },
  {
    key: "open_tasks",
    label: "Open Tasks",
    icon: "⚙️",
    accent: "#9b59b6",
    favorable: true,
    sub: "task assignments",
  },
  {
    key: "avg_workload",
    label: "Avg Workload",
    icon: "📊",
    accent: "#f5a623",
    favorable: false,
    sub: "team utilization",
    suffix: "%",
  },
  {
    key: "performance",
    label: "Team Performance",
    icon: "⭐",
    accent: "#27ae60",
    favorable: true,
    sub: "operational score",
    suffix: "%",
  },
];

function clamp(value = 0) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function safeValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function isActiveMember(member = {}) {
  const status = String(member.status || "").toLowerCase();
  const employmentStatus = String(member.employment_status || "").toLowerCase();

  const membershipActive = !status || status === "active";
  const employeeActive =
    !employmentStatus ||
    ["active", "probationary", "part_time", "full_time"].includes(employmentStatus);

  return membershipActive && employeeActive;
}

function getUniqueMemberKey(member = {}) {
  if (member.employee_id) return `employee:${member.employee_id}`;
  if (member.profile_id) return `profile:${member.profile_id}`;
  if (member.email) return `email:${String(member.email).toLowerCase()}`;
  if (member.member_id) return `member:${member.member_id}`;

  return null;
}

function countUniqueActiveMembers(members = []) {
  const unique = new Set();

  members.forEach((member) => {
    if (!isActiveMember(member)) return;

    const key = getUniqueMemberKey(member);
    if (key) unique.add(key);
  });

  return unique.size;
}

export default function TeamKPICards({ stats }) {
  const [values, setValues] = useState({
    total_teams: 0,
    active_members: 0,
    active_assignments: 0,
    open_tasks: 0,
    avg_workload: 0,
    performance: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadKPIs() {
      try {
        setLoading(true);

        const [teamsResult, membersResult, assignmentsResult, workloadResult] =
          await Promise.allSettled([
            getTeams(),
            getTeamMembers(),
            getAssignments(),
            getWorkload(),
          ]);

        if (!mounted) return;

        if (teamsResult.status === "rejected") {
          console.error("KPI teams load error:", teamsResult.reason);
        }

        if (membersResult.status === "rejected") {
          console.error("KPI members load error:", membersResult.reason);
        }

        if (assignmentsResult.status === "rejected") {
          console.error("KPI assignments load error:", assignmentsResult.reason);
        }

        if (workloadResult.status === "rejected") {
          console.error("KPI workload load error:", workloadResult.reason);
        }

        const teams = safeValue(teamsResult, []);
        const members = safeValue(membersResult, []);
        const assignments = safeValue(assignmentsResult, []);
        const workloadRows = safeValue(workloadResult, []);

        const activeAssignments = (assignments || []).filter(
          (item) => item.status === "active"
        );

        const openTasks = activeAssignments.filter(
          (item) => item.record_type === "task"
        );

        const avgWorkload =
          workloadRows.length > 0
            ? Math.round(
                workloadRows.reduce(
                  (sum, row) => sum + Number(row.utilization || 0),
                  0
                ) / workloadRows.length
              )
            : 0;

        const computedPerformance =
          teams.length > 0
            ? Math.round(
                teams.reduce(
                  (sum, team) => sum + Number(team.metrics?.performance || 0),
                  0
                ) / teams.length
              )
            : 0;

        setValues({
          total_teams: teams.length || 0,
          active_members: countUniqueActiveMembers(members),
          active_assignments: activeAssignments.length,
          open_tasks: openTasks.length,
          avg_workload: avgWorkload,
          performance: computedPerformance,
          ...(stats || {}),
        });
      } catch (err) {
        console.error("KPI load error:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadKPIs();

    return () => {
      mounted = false;
    };
  }, [stats]);

  return (
    <div className="teams-kpi-grid">
      {KPI_DEFS.map((def) => {
        const rawValue = values?.[def.key] ?? 0;
        const displayValue = `${rawValue}${def.suffix || ""}`;

        const progressValue =
          def.key === "avg_workload" || def.key === "performance"
            ? clamp(rawValue)
            : clamp(rawValue * 10);

        return (
          <div
            key={def.key}
            className="teams-kpi-card"
            style={{ "--accent-color": def.accent }}
          >
            <div className="teams-kpi-icon">{loading ? "⏳" : def.icon}</div>

            <div className="teams-kpi-label">{def.label}</div>

            <div className="teams-kpi-value">
              {loading ? "..." : displayValue}
            </div>

            <div
              className={`teams-kpi-change ${
                def.favorable ? "pos" : "neg"
              }`}
            >
              <span>{def.favorable ? "▲" : "▼"}</span>
              {def.sub}
            </div>

            <div className="teams-kpi-bar">
              <div
                className="teams-kpi-bar-fill"
                style={{
                  width: `${progressValue}%`,
                  background: def.accent,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
