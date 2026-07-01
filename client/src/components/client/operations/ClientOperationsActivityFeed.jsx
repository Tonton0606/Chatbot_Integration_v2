import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "../../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../../../services/workspaceResolver";

function getActivityIcon(type = "") {
  const value = String(type || "").toLowerCase();

  if (value.includes("assignment")) return "📋";
  if (value.includes("member")) return "👤";
  if (value.includes("role")) return "🎖️";
  if (value.includes("type")) return "🏷️";
  if (value.includes("team")) return "👥";

  return "•";
}

function formatActivityDate(value) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ClientOperationsActivityFeed({ limit = 10 }) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadActivity() {
      try {
        setLoading(true);
        setError("");

        const workspaceId = await getCurrentWorkspaceId();

        const { data, error: activityError } = await supabase
          .from("client_operations_activity")
          .select(
            `
              id,
              activity_type,
              title,
              description,
              metadata,
              created_at
            `
          )
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (activityError) throw activityError;

        if (mounted) {
          setActivities(data || []);
        }
      } catch (err) {
        console.error("Client operations activity load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load activity.");
          setActivities([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      mounted = false;
    };
  }, [limit]);

  if (loading) {
    return (
      <div className="client-op-empty compact">
        <Loader2 className="h-5 w-5 animate-spin" />
        <div className="client-op-empty-title">Loading activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-op-empty compact">
        <div className="client-op-empty-icon">⚠️</div>
        <div className="client-op-empty-title">Failed to load activity</div>
        <div className="client-op-empty-sub">{error}</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="client-op-empty compact">
        <div className="client-op-empty-icon">⏱</div>
        <div className="client-op-empty-title">No activity yet</div>
        <div className="client-op-empty-sub">
          Team and assignment events will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="client-op-activity-list">
      {activities.map((activity) => (
        <div key={activity.id} className="client-op-activity-item">
          <div className="client-op-activity-icon">
            {activity.metadata?.icon || getActivityIcon(activity.activity_type)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="client-op-activity-title">{activity.title}</div>

            {activity.description && (
              <div className="client-op-activity-desc">
                {activity.description}
              </div>
            )}

            <div className="client-op-activity-meta">
              {formatActivityDate(activity.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
