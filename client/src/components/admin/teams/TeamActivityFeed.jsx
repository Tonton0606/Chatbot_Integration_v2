import { useEffect, useMemo, useState } from "react";

import {
  getActivitySeverityMeta,
  getTeamActivities,
} from "@/services/operations/activity";

const EMPTY_FILTERS = {};

export default function TeamActivityFeed({
  compact = false,
  limit = 8,
  filters = EMPTY_FILTERS,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const stableFilters = useMemo(
    () => ({
      type: filters.type || undefined,
      target_type: filters.target_type || undefined,
      target_id: filters.target_id || undefined,
      severity: filters.severity || undefined,
    }),
    [
      filters.type,
      filters.target_type,
      filters.target_id,
      filters.severity,
    ]
  );

  useEffect(() => {
    let mounted = true;

    async function loadActivities() {
      try {
        setLoading(true);
        setError("");

        const data = await getTeamActivities({
          ...stableFilters,
          limit,
        });

        if (mounted) {
          setItems(data || []);
        }
      } catch (err) {
        console.error("Team activity load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load team activity.");
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadActivities();

    return () => {
      mounted = false;
    };
  }, [limit, stableFilters]);

  if (loading) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-title">Loading activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-icon">⚠️</div>
        <div className="t-empty-title">Failed to load activity</div>
        <div className="t-empty-sub">{error}</div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-icon">⏱</div>
        <div className="t-empty-title">No activity yet</div>
        <div className="t-empty-sub">Team events will appear here.</div>
      </div>
    );
  }

  return (
    <div className="t-activity-wrap">
      {!compact && <div className="t-activity-line" />}

      <div className="t-activity-feed">
        {items.map((item) => {
          const severity = getActivitySeverityMeta(item.severity);

          return (
            <div key={item.id} className="t-activity-item">
              <div
                className="t-activity-dot"
                style={{
                  background: `${severity.color}22`,
                  borderColor: `${severity.color}44`,
                  color: severity.color,
                }}
              >
                <span className="t-activity-icon">{item.icon}</span>
              </div>

              <div className="t-activity-content">
                <div className="t-activity-text">
                  <strong>{item.actor_label}</strong>{" "}
                  <span>{item.action_label}</span>{" "}
                  <strong>{item.target_label}</strong>
                </div>

                <div className="t-activity-time">{item.created_at_label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
