import { useEffect, useMemo, useState } from "react";

import { getBottlenecks } from "@/services/operations/workload";

const SEVERITY_META = {
  critical: {
    icon: "🔴",
    className: "critical",
    label: "Critical",
  },
  high: {
    icon: "🟠",
    className: "warning",
    label: "High Load",
  },
  moderate: {
    icon: "🟡",
    className: "warning",
    label: "Busy",
  },
  warning: {
    icon: "🟡",
    className: "warning",
    label: "Warning",
  },
};

export default function BottleneckAlert({ filters = null, onResolve }) {
  const safeFilters = useMemo(() => filters || {}, [filters]);

  const [bottlenecks, setBottlenecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBottlenecks() {
      try {
        setLoading(true);
        setError("");

        const data = await getBottlenecks(safeFilters);

        if (mounted) {
          setBottlenecks(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Bottleneck load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load bottlenecks.");
          setBottlenecks([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadBottlenecks();

    return () => {
      mounted = false;
    };
  }, [safeFilters]);

  if (loading) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-title">Loading bottlenecks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-icon">⚠️</div>
        <div className="t-empty-title">Failed to load bottlenecks</div>
        <div className="t-empty-sub">{error}</div>
      </div>
    );
  }

  if (!bottlenecks.length) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-icon">✅</div>
        <div className="t-empty-title">No active bottlenecks</div>
        <div className="t-empty-sub">
          Current team workload is within safe capacity.
        </div>
      </div>
    );
  }

  return (
    <div className="teams-bottleneck-list">
      {bottlenecks.map((bottleneck) => {
        const severity =
          SEVERITY_META[bottleneck.severity] || SEVERITY_META.warning;

        const workloadPoints =
          bottleneck.workload_points ?? bottleneck.total_points ?? 0;
        const capacityPoints =
          bottleneck.capacity_points ?? bottleneck.capacity ?? 0;
        const availableCapacity = bottleneck.available_capacity ?? 0;

        return (
          <div
            key={bottleneck.id}
            className={`teams-bottleneck-alert ${severity.className}`}
          >
            <div className="teams-bottleneck-icon">{severity.icon}</div>

            <div className="teams-bottleneck-content">
              <div className="teams-bottleneck-header">
                <span className="teams-bottleneck-team">
                  {bottleneck.team_label}
                </span>

                <span className="teams-bottleneck-since">
                  {severity.label} · {bottleneck.utilization || 0}% utilization
                </span>
              </div>

              <div className="teams-bottleneck-issue">
                {bottleneck.issue}
              </div>

              <div className="teams-bottleneck-recommendation">
                ✦ {bottleneck.recommendation}
              </div>

              <div className="teams-bottleneck-recommendation">
                Load: <strong>{workloadPoints}</strong> / {capacityPoints} pts ·
                Available: <strong>{availableCapacity}</strong> pts · Risk:{" "}
                <strong>{bottleneck.risk_level || "healthy"}</strong>
              </div>
            </div>

            <button
              type="button"
              className="t-btn t-btn-ghost t-btn-sm"
              onClick={() => onResolve?.(bottleneck)}
              disabled={!onResolve}
            >
              Resolve
            </button>
          </div>
        );
      })}
    </div>
  );
}
