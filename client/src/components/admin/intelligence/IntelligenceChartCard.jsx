import React, { useId } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const CHART_TOOLTIP_STYLE = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text-primary)",
};

const GRID_STROKE = "var(--border-color)";
const AXIS_TICK = {
  fill: "var(--text-muted)",
  fontSize: 11,
};

export function RevenueTrendChart({ data }) {
  const fmt = (value) =>
    value ? `₱${(value / 1000000).toFixed(1)}M` : null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />

        <XAxis
          dataKey="month"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          tickFormatter={(value) => `₱${(value / 1000000).toFixed(0)}M`}
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />

        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value, name) => [value ? fmt(value) : "—", name]}
        />

        <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />

        <Line
          type="monotone"
          dataKey="actual"
          stroke="var(--brand-cyan)"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Actual"
          connectNulls={false}
        />

        <Line
          type="monotone"
          dataKey="forecast"
          stroke="var(--brand-gold)"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 3 }}
          name="Forecast"
          connectNulls={false}
        />

        <Line
          type="monotone"
          dataKey="target"
          stroke="var(--success)"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false}
          name="Target"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DeptPerformanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 10, left: 60, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={GRID_STROKE}
          horizontal={false}
        />

        <XAxis
          type="number"
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          type="category"
          dataKey="dept"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={70}
        />

        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />

        <Bar
          dataKey="current"
          fill="var(--brand-cyan)"
          radius={[0, 4, 4, 0]}
          name="Current"
        />

        <Bar
          dataKey="previous"
          fill="var(--muted)"
          radius={[0, 4, 4, 0]}
          name="Previous"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaTrendChart({
  data,
  dataKey = "value",
  color = "var(--brand-cyan)",
  formatter,
}) {
  const reactId = useId();
  const gradientId = `intel-area-grad-${reactId.replace(/:/g, "")}`;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />

        <XAxis
          dataKey="month"
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatter}
          width={40}
        />

        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={formatter ? (value) => [formatter(value)] : undefined}
        />

        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function IntelligenceChartCard({
  title,
  subtitle,
  children,
  action,
}) {
  return (
    <div className="intel-chart-card intel-card-hover">
      <div className="intel-chart-header">
        <div>
          <div className="intel-chart-title">{title}</div>

          {subtitle && <div className="intel-chart-subtitle">{subtitle}</div>}
        </div>

        {action && <div>{action}</div>}
      </div>

      <div className="intel-chart-body">{children}</div>
    </div>
  );
}
