import { supabase } from "@/config/supabaseClient.js";

export const TASK_STATUSES = ["todo", "in_progress", "review", "blocked", "done", "cancelled"];

export const TASK_STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_STATUS_COLORS = {
  todo: "#6b7a8d",
  in_progress: "#4a90d9",
  review: "#9b59b6",
  blocked: "#e74c3c",
  done: "#27ae60",
  cancelled: "#95a5a6",
};

export const TASK_PRIORITIES = ["low", "medium", "high", "critical"];

export const TASK_PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const TASK_PRIORITY_COLORS = {
  low: "#8a94a6",
  medium: "#f5a623",
  high: "#e74c3c",
  critical: "#9b59b6",
};

function getName(profile) {
  return profile?.full_name || profile?.email || "Unassigned";
}

function normalizeTask(row) {
  return {
    id: row.id,
    title: row.title || "Untitled Task",
    project: row.project?.project_name || "Unknown Project",
    projectId: row.project?.id || row.project_id,
    customerId: row.customer_id || row.project?.customer_id || null,
    status: row.status || "todo",
    priority: row.priority || "medium",
    assignee: getName(row.assigned_user),
    assigneeId: row.assigned_user?.id || row.assigned_to || null,
    dueDate: row.due_date,
    notes: row.description || "",
    created: row.created_at,
    completedAt: row.completed_at,
    subtasks: [],
    activities: (row.activities || []).map((activity) => ({
      id: activity.id,
      type: activity.activity_type,
      note: activity.message,
      date: activity.created_at,
      user: getName(activity.user) || "System",
    })),
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Authentication required.");
  return user.id;
}

async function getProjectCustomerId(projectId) {
  if (!projectId) throw new Error("Project is required.");

  const { data, error } = await supabase
    .from("projects")
    .select("id, customer_id")
    .eq("id", projectId)
    .single();

  if (error) throw new Error(error.message || "Project not found.");
  return data.customer_id;
}

export async function getTasksData() {
  const { data, error } = await supabase
    .from("admin_tasks")
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        customer_id,
        status
      ),
      assigned_user:assigned_to (
        id,
        full_name,
        email
      ),
      activities:admin_task_activities (
        id,
        activity_type,
        message,
        created_at,
        user:user_id (
          id,
          full_name,
          email
        )
      )
    `)
    .is("archived_at", null)
    .not("project_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Failed to fetch tasks.");

  const tasks = (data || []).map(normalizeTask);

  return {
    tasks,
    statuses: TASK_STATUSES,
    priorities: TASK_PRIORITIES,
    assignees: [...new Set(tasks.map((task) => task.assignee).filter(Boolean))],
  };
}

export async function getTaskFormOptions() {
  const [projectsResult, profilesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project_name, customer_id, status")
      .order("created_at", { ascending: false }),

    supabase
      .from("profiles")
      .select("id, full_name, email, role, status")
      .in("role", ["Admin", "SuperAdmin", "admin", "super_admin"])
      .eq("status", "active")
      .order("full_name", { ascending: true }),
  ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);

  return {
    projects: projectsResult.data || [],
    assignees: profilesResult.data || [],
  };
}

export async function createTask(payload) {
  const userId = await getCurrentUserId();
  const customerId = await getProjectCustomerId(payload.projectId);

  const { data, error } = await supabase
    .from("admin_tasks")
    .insert({
      project_id: payload.projectId,
      customer_id: customerId,
      title: payload.title,
      description: payload.description || null,
      status: payload.status || "todo",
      priority: payload.priority || "medium",
      assigned_to: payload.assignedTo || null,
      created_by: userId,
      due_date: payload.dueDate || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to create task.");

  await supabase.from("admin_task_activities").insert({
    task_id: data.id,
    user_id: userId,
    activity_type: "created",
    message: "Task created",
  });

  return data;
}

export async function updateTask(id, updates) {
  const userId = await getCurrentUserId();

  const updatePayload = {
    updated_at: new Date().toISOString(),
  };

  if (updates.projectId !== undefined) {
    updatePayload.project_id = updates.projectId;
    updatePayload.customer_id = await getProjectCustomerId(updates.projectId);
  }

  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.description !== undefined) updatePayload.description = updates.description || null;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.priority !== undefined) updatePayload.priority = updates.priority;
  if (updates.assignedTo !== undefined) updatePayload.assigned_to = updates.assignedTo || null;
  if (updates.dueDate !== undefined) updatePayload.due_date = updates.dueDate || null;

  if (updates.status === "done") updatePayload.completed_at = new Date().toISOString();
  if (updates.status && updates.status !== "done") updatePayload.completed_at = null;

  const { data, error } = await supabase
    .from("admin_tasks")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to update task.");

  await supabase.from("admin_task_activities").insert({
    task_id: id,
    user_id: userId,
    activity_type: "updated",
    message: "Task updated",
  });

  return data;
}

export async function markTaskDone(id) {
  return updateTask(id, { status: "done" });
}

export async function addTaskNote(taskId, message) {
  const userId = await getCurrentUserId();

  if (!message?.trim()) throw new Error("Note cannot be empty.");

  const { data, error } = await supabase
    .from("admin_task_activities")
    .insert({
      task_id: taskId,
      user_id: userId,
      activity_type: "note",
      message: message.trim(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to save note.");
  return data;
}

export async function archiveTask(id) {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("admin_tasks")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message || "Failed to archive task.");

  await supabase.from("admin_task_activities").insert({
    task_id: id,
    user_id: userId,
    activity_type: "archived",
    message: "Task archived",
  });

  return true;
}
