import { supabase } from "../../config/supabaseClient";
import { getCurrentWorkspaceId } from "../workspaceResolver";

export const ACTIVITY_SEVERITY_META = {
  info: { color: "#4a90d9" },
  success: { color: "#27ae60" },
  warning: { color: "#f5a623" },
  danger: { color: "#e74c3c" },
};

const ACTIVITY_TYPE_META = {
  team_created: {
    icon: "👥",
    severity: "success",
  },
  member_joined: {
    icon: "👤",
    severity: "info",
  },
  member_removed: {
    icon: "➖",
    severity: "warning",
  },
  assignment_created: {
    icon: "📋",
    severity: "success",
  },
  assignment_changed: {
    icon: "🔄",
    severity: "info",
  },
  assignment_removed: {
    icon: "🗑️",
    severity: "warning",
  },
  workload_alert: {
    icon: "⚠️",
    severity: "warning",
  },
};

function formatRelativeTime(value) {
  if (!value) return "Recently";

  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return "Recently";

  const diffMs = Date.now() - created.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function normalizeActivity(row = {}) {
  const meta = ACTIVITY_TYPE_META[row.activity_type] || {
    icon: "•",
    severity: "info",
  };

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    type: row.activity_type,
    icon: row.metadata?.icon || meta.icon,
    severity: row.metadata?.severity || meta.severity,
    actor_label: row.metadata?.actor_label || "System",
    action_label: row.metadata?.action_label || row.title || "updated",
    target_label: row.metadata?.target_label || row.team?.name || "Teams",
    target_type: row.metadata?.target_type || "team",
    target_id: row.team_id || row.assignment_id || null,
    title: row.title,
    description: row.description,
    metadata: row.metadata || {},
    created_at_label: formatRelativeTime(row.created_at),
    created_at: row.created_at,
  };
}

export async function getTeamActivities(filters = {}) {
  const workspaceId = await getCurrentWorkspaceId();

  let query = supabase
    .from("operation_team_activity")
    .select(`
      id,
      workspace_id,
      team_id,
      assignment_id,
      actor_profile_id,
      activity_type,
      title,
      description,
      metadata,
      created_at,
      team:operation_teams (
        id,
        name
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (filters.type && filters.type !== "all") {
    query = query.eq("activity_type", filters.type);
  }

  if (filters.target_id) {
    query = query.or(`team_id.eq.${filters.target_id},assignment_id.eq.${filters.target_id}`);
  }

  const limit = Number(filters.limit || 0);
  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  let result = (data || []).map(normalizeActivity);

  if (filters.target_type && filters.target_type !== "all") {
    result = result.filter((activity) => activity.target_type === filters.target_type);
  }

  if (filters.severity && filters.severity !== "all") {
    result = result.filter((activity) => activity.severity === filters.severity);
  }

  return result;
}

export function getActivitySeverityMeta(severity = "info") {
  return ACTIVITY_SEVERITY_META[severity] || ACTIVITY_SEVERITY_META.info;
}
