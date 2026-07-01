import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getWorkloadColor } from "@/constants/operations/teamConstants";
import {
  getMemberWorkload,
  getWorkload,
  getWorkloadTrend,
} from "@/services/operations/workload";

const TOOLTIP_STYLE = {
  background: "var(--teams-surface-3)",
  border: "1px solid var(--teams-border)",
  borderRadius: 6,
  fontSize: 11,
  color: "var(--teams-text)",
};

function EmptyChart({ message = "No workload data yet." }) {
  return (
    <div className="t-empty t-empty-compact">
      <div className="t-empty-title">{message}</div>
    </div>
  );
}

function riskClass(riskLevel = "healthy") {
  if (riskLevel === "overloaded") return "t-chip-archived";
  if (riskLevel === "high") return "t-chip-inactive";
  if (riskLevel === "busy") return "t-chip-warning";
  return "t-chip-active";
}

function buildTrendChartRows(rows = []) {
  const byPeriod = new Map();

  rows.forEach((row) => {
    const existing = byPeriod.get(row.period) || { period: row.period };
    existing[row.team_id] = row.utilization;
    existing[`${row.team_id}_label`] = row.team_label;
    byPeriod.set(row.period, existing);
  });

  return Array.from(byPeriod.values());
}

export function WorkloadByTeamChart() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadWorkload() {
      try {
        setLoading(true);
        setError("");

        const data = await getWorkload();

        if (mounted) {
          setRows(data || []);
        }
      } catch (err) {
        console.error("Workload chart load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load workload.");
          setRows([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadWorkload();

    return () => {
      mounted = false;
    };
  }, []);

  const data = useMemo(
    () =>
      rows.map((row) => ({
        team_id: row.team_id,
        name: row.team_label?.split(" ")[0] || "Team",
        full_name: row.team_label,
        utilization: row.utilization,
        workload_points: row.workload_points ?? row.total_points ?? 0,
        capacity_points: row.capacity_points ?? row.capacity ?? 0,
        available_capacity: row.available_capacity ?? 0,
        risk_label: row.risk_label || "Healthy",
      })),
    [rows]
  );

  if (loading) return <EmptyChart message="Loading workload..." />;
  if (error) return <EmptyChart message={error} />;
  if (!data.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--teams-border)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--teams-text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--teams-text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name, props) => {
            if (name === "utilization") {
              const item = props?.payload || {};
              return [
                `${value}% · ${item.workload_points}/${item.capacity_points} pts · ${item.risk_label}`,
                "Utilization",
              ];
            }

            return [value, name];
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.full_name || "Team"}
        />
        <Bar dataKey="utilization" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry) => (
            <Cell key={entry.team_id} fill={getWorkloadColor(entry.utilization)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WorkloadTrendChart() {
  const [trendRows, setTrendRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTrend() {
      try {
        setLoading(true);
        setError("");

        const data = await getWorkloadTrend();

        if (mounted) {
          setTrendRows(data || []);
        }
      } catch (err) {
        console.error("Workload trend load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load workload trend.");
          setTrendRows([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTrend();

    return () => {
      mounted = false;
    };
  }, []);

  const chartRows = useMemo(() => buildTrendChartRows(trendRows), [trendRows]);

  const teams = useMemo(() => {
    const unique = new Map();

    trendRows.forEach((row) => {
      if (!unique.has(row.team_id)) {
        unique.set(row.team_id, row.team_label);
      }
    });

    return Array.from(unique.entries()).map(([teamId, label]) => ({
      teamId,
      label,
    }));
  }, [trendRows]);

  const palette = ["#4a90d9", "#9b59b6", "#c9a84c", "#e74c3c", "#27ae60"];

  if (loading) return <EmptyChart message="Loading trend..." />;
  if (error) return <EmptyChart message={error} />;
  if (!chartRows.length || !teams.length) {
    return <EmptyChart message="No trend data yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartRows} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--teams-border)" />
        <XAxis
          dataKey="period"
          tick={{ fill: "var(--teams-text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--teams-text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value}%`]} />
        <Legend wrapperStyle={{ fontSize: 10, color: "var(--teams-text-secondary)" }} />

        {teams.map((team, index) => (
          <Line
            key={team.teamId}
            type="monotone"
            dataKey={team.teamId}
            stroke={palette[index % palette.length]}
            strokeWidth={2}
            dot={false}
            name={team.label}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MemberWorkloadBars() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadMemberWorkload() {
      try {
        setLoading(true);
        setError("");

        const data = await getMemberWorkload();

        if (mounted) {
          setMembers(data || []);
        }
      } catch (err) {
        console.error("Member workload load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load member workload.");
          setMembers([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMemberWorkload();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <EmptyChart message="Loading member workload..." />;
  if (error) return <EmptyChart message={error} />;
  if (!members.length) return <EmptyChart message="No member workload yet." />;

  return (
    <div className="member-workload-list">
      {members.map((member) => {
        const color = getWorkloadColor(member.utilization);

        return (
          <div key={member.member_id} className="member-workload-row">
            <div className="t-avatar t-avatar-sm">{member.initials}</div>

            <div className="member-workload-name">
              <strong>{member.member_label?.split(" ")[0] || "Member"}</strong>
              <span>
                {member.workload_points ?? member.total_points ?? 0}/
                {member.capacity_points ?? member.capacity ?? 0} pts
              </span>
            </div>

            <div className="member-workload-track">
              <div
                className="member-workload-fill"
                style={{
                  width: `${member.utilization}%`,
                  background: color,
                }}
              />
            </div>

            <div className="member-workload-value" style={{ color }}>
              {member.utilization}%
            </div>

            <span className={`t-chip ${riskClass(member.risk_level)}`}>
              {member.risk_label || "Healthy"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TeamWorkloadSummary() {
  return (
    <div className="teams-chart-grid">
      <div className="teams-chart-card">
        <div className="teams-chart-header">
          <div>
            <div className="teams-chart-title">Workload by Team</div>
            <div className="teams-chart-subtitle">
              Utilization = workload points ÷ team capacity
            </div>
          </div>
        </div>

        <div className="teams-chart-body">
          <WorkloadByTeamChart />
        </div>
      </div>

      <div className="teams-chart-card">
        <div className="teams-chart-header">
          <div>
            <div className="teams-chart-title">Workload Trend</div>
            <div className="teams-chart-subtitle">
              Current DB-derived utilization snapshot
            </div>
          </div>
        </div>

        <div className="teams-chart-body">
          <WorkloadTrendChart />
        </div>
      </div>
    </div>
  );
}
