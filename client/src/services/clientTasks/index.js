import { supabase } from "@/config/supabaseClient.js";

export const CLIENT_TASK_STATUSES = ["todo", "in_progress", "review", "done", "blocked"];

export const CLIENT_TASK_STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

export const CLIENT_TASK_PRIORITIES = ["low", "medium", "high", "critical"];

export const CLIENT_TASK_PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Authentication required.");

  return user;
}

export async function getMyClientWorkspace() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.workspace_id) throw new Error("No workspace found.");

  return data;
}

export async function getClientTasksData(workspaceId) {
  const workspace =
    workspaceId ? { workspace_id: workspaceId } : await getMyClientWorkspace();

  const activeWorkspaceId = workspace.workspace_id;

  const [tasksResult, projectsResult, profilesResult] = await Promise.all([
    supabase
      .from("client_project_tasks")
      .select("*")
      .eq("workspace_id", activeWorkspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("client_projects")
      .select("id, project_name, stage, status, priority, due_date, archived_at")
      .eq("workspace_id", activeWorkspaceId)
      .is("archived_at", null),

    supabase.from("profiles").select("id, full_name, email, role, status"),
  ]);

  const failed = [tasksResult, projectsResult, profilesResult].find(
    (result) => result.error
  );

  if (failed?.error) throw failed.error;

  const projectMap = byId(projectsResult.data || []);
  const profileMap = byId(profilesResult.data || []);

  const tasks = (tasksResult.data || []).map((task) => {
    const project = task.client_project_id
      ? projectMap.get(task.client_project_id)
      : null;

    const creator = task.created_by ? profileMap.get(task.created_by) : null;

    return {
      id: task.id,
      workspaceId: task.workspace_id,
      clientProjectId: task.client_project_id,
      title: task.title || "Untitled Task",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      dueDate: task.due_date,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      createdBy: creator?.full_name || creator?.email || "Workspace User",
      project: project
        ? {
            id: project.id,
            name: project.project_name || "Untitled Project",
            stage: project.stage,
            status: project.status,
            priority: project.priority,
            dueDate: project.due_date,
          }
        : null,
      raw: task,
    };
  });

  return {
    workspaceId: activeWorkspaceId,
    tasks,
    projects: projectsResult.data || [],
    statuses: CLIENT_TASK_STATUSES,
    priorities: CLIENT_TASK_PRIORITIES,
  };
}

export async function createClientTask(payload) {
  const workspace = await getMyClientWorkspace();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("client_project_tasks")
    .insert({
      workspace_id: workspace.workspace_id,
      client_project_id: payload.clientProjectId || null,
      title: payload.title,
      description: payload.description || null,
      status: payload.status || "todo",
      priority: payload.priority || "medium",
      due_date: payload.dueDate || null,
      created_by: user.id,
      completed_at: payload.status === "done" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateClientTask(id, payload) {
  const completedAt =
    payload.status === "done" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("client_project_tasks")
    .update({
      client_project_id: payload.clientProjectId || null,
      title: payload.title,
      description: payload.description || null,
      status: payload.status || "todo",
      priority: payload.priority || "medium",
      due_date: payload.dueDate || null,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function archiveClientTask(id) {
  const { error } = await supabase
    .from("client_project_tasks")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  return true;
}
