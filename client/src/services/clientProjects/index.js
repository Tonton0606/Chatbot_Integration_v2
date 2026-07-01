import { supabase } from "@/config/supabaseClient.js";
import { getCurrentWorkspaceContext } from "../workspaceResolver";

export const CLIENT_PROJECT_STAGES = [
  "planning",
  "kickoff",
  "in_progress",
  "review",
  "blocked",
  "completed",
  "cancelled",
];

export const CLIENT_PROJECT_STAGE_LABELS = {
  planning: "Planning",
  kickoff: "Kickoff",
  in_progress: "In Progress",
  review: "Review",
  blocked: "Blocked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CLIENT_PROJECT_PRIORITIES = ["low", "medium", "high", "critical"];

export const CLIENT_PROJECT_PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const CLIENT_TASK_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "done",
  "blocked",
];

export const CLIENT_TASK_STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

function requireId(value, message) {
  if (!value) {
    throw new Error(message);
  }
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

async function getActiveClientWorkspace() {
  const context = await getCurrentWorkspaceContext();

  if (!context?.workspace_id) {
    throw new Error("No active workspace found.");
  }

  return {
    id: context.workspace_id,
    workspace_id: context.workspace_id,
    workspace: context.workspace,
    profile: context.profile,
  };
}

async function resolveWorkspaceForRead(requestedWorkspaceId) {
  const workspace = await getActiveClientWorkspace();

  if (requestedWorkspaceId && requestedWorkspaceId !== workspace.workspace_id) {
    throw new Error("Requested workspace does not match the active workspace.");
  }

  return workspace;
}

export async function getMyClientWorkspace() {
  return getActiveClientWorkspace();
}

async function getClientProjectForWorkspace(projectId, workspaceId) {
  requireId(projectId, "Project ID is required.");
  requireId(workspaceId, "Workspace ID is required.");

  const { data, error } = await supabase
    .from("client_projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function requireClientProjectForWorkspace(projectId, workspaceId) {
  const project = await getClientProjectForWorkspace(projectId, workspaceId);

  if (!project?.id) {
    throw new Error("Project was not found in this workspace.");
  }

  return project;
}

async function getClientTaskForWorkspace(taskId, workspaceId) {
  requireId(taskId, "Task ID is required.");
  requireId(workspaceId, "Workspace ID is required.");

  const { data, error } = await supabase
    .from("client_project_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function requireClientTaskForWorkspace(taskId, workspaceId) {
  const task = await getClientTaskForWorkspace(taskId, workspaceId);

  if (!task?.id) {
    throw new Error("Task was not found in this workspace.");
  }

  return task;
}

async function validateOptionalProjectAssignment(clientProjectId, workspaceId) {
  if (!clientProjectId) return null;

  return requireClientProjectForWorkspace(clientProjectId, workspaceId);
}

export async function getClientProjectsData(workspaceId) {
  const workspace = await resolveWorkspaceForRead(workspaceId);
  const activeWorkspaceId = workspace.workspace_id;

  const [projectsResult, tasksResult, activitiesResult, profilesResult] =
    await Promise.all([
      supabase
        .from("client_projects")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),

      supabase
        .from("client_project_tasks")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),

      supabase
        .from("client_project_activities")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false }),

      supabase.from("profiles").select("id, full_name, email, role, status"),
    ]);

  const failed = [
    projectsResult,
    tasksResult,
    activitiesResult,
    profilesResult,
  ].find((result) => result.error);

  if (failed?.error) throw failed.error;

  const profiles = profilesResult.data || [];
  const profileMap = byId(profiles);
  const tasks = tasksResult.data || [];
  const activities = activitiesResult.data || [];

  const projects = (projectsResult.data || []).map((project) => {
    const projectTasks = tasks.filter(
      (task) => task.client_project_id === project.id
    );

    const completedTasks = projectTasks.filter((task) => task.status === "done");

    const progress =
      projectTasks.length > 0
        ? Math.round((completedTasks.length / projectTasks.length) * 100)
        : Number(project.progress_percent || 0);

    const assignedAdmin = profileMap.get(project.assigned_admin_id);

    return {
      id: project.id,
      workspaceId: project.workspace_id,
      name: project.project_name || "Untitled Project",
      description: project.description || "",
      serviceCategory: project.service_category || "",
      servicePackage: project.service_package || "",
      status: project.status || "active",
      stage: project.stage || "planning",
      priority: project.priority || "medium",
      progress,
      startDate: project.start_date,
      dueDate: project.due_date,
      assignedAdmin:
        assignedAdmin?.full_name || assignedAdmin?.email || "Unassigned",
      tasks: projectTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        done: task.status === "done",
        raw: task,
      })),
      activities: activities
        .filter((activity) => activity.client_project_id === project.id)
        .map((activity) => {
          const user = profileMap.get(activity.user_id);

          return {
            id: activity.id,
            type: activity.activity_type,
            message: activity.message,
            createdAt: activity.created_at,
            user: user?.full_name || user?.email || "System",
          };
        }),
      raw: project,
    };
  });

  return {
    workspaceId: activeWorkspaceId,
    projects,
    stages: CLIENT_PROJECT_STAGES,
    priorities: CLIENT_PROJECT_PRIORITIES,
  };
}

export async function createClientProject(payload) {
  const workspace = await getActiveClientWorkspace();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("client_projects")
    .insert({
      workspace_id: workspace.workspace_id,
      project_name: payload.name,
      description: payload.description || null,
      service_category: payload.serviceCategory || null,
      service_package: payload.servicePackage || null,
      status: payload.status || "active",
      stage: payload.stage || "planning",
      priority: payload.priority || "medium",
      progress_percent: Number(payload.progress || 0),
      start_date: payload.startDate || null,
      due_date: payload.dueDate || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateClientProject(id, payload) {
  const workspace = await getActiveClientWorkspace();

  await requireClientProjectForWorkspace(id, workspace.workspace_id);

  const { data, error } = await supabase
    .from("client_projects")
    .update({
      project_name: payload.name,
      description: payload.description || null,
      service_category: payload.serviceCategory || null,
      service_package: payload.servicePackage || null,
      status: payload.status || "active",
      stage: payload.stage || "planning",
      priority: payload.priority || "medium",
      progress_percent: Number(payload.progress || 0),
      start_date: payload.startDate || null,
      due_date: payload.dueDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspace.workspace_id)
    .is("archived_at", null)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Project update failed or was not allowed.");

  return data;
}

export async function archiveClientProject(id) {
  const workspace = await getActiveClientWorkspace();

  await requireClientProjectForWorkspace(id, workspace.workspace_id);

  const { data, error } = await supabase
    .from("client_projects")
    .update({
      archived_at: new Date().toISOString(),
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspace.workspace_id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Project archive failed or was not allowed.");

  return true;
}

export async function createClientProjectTask(payload) {
  const workspace = await getActiveClientWorkspace();
  const user = await getCurrentUser();

  await validateOptionalProjectAssignment(
    payload.clientProjectId,
    workspace.workspace_id
  );

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
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateClientProjectTask(id, payload) {
  const workspace = await getActiveClientWorkspace();

  const existingTask = await requireClientTaskForWorkspace(
    id,
    workspace.workspace_id
  );

  const nextClientProjectId =
    payload.clientProjectId === undefined
      ? existingTask.client_project_id
      : payload.clientProjectId || null;

  await validateOptionalProjectAssignment(
    nextClientProjectId,
    workspace.workspace_id
  );

  const completedAt =
    payload.status === "done" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("client_project_tasks")
    .update({
      client_project_id: nextClientProjectId,
      title: payload.title,
      description: payload.description || null,
      status: payload.status || "todo",
      priority: payload.priority || "medium",
      due_date: payload.dueDate || null,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspace.workspace_id)
    .is("archived_at", null)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Task update failed or was not allowed.");

  return data;
}

export async function archiveClientProjectTask(id) {
  const workspace = await getActiveClientWorkspace();

  await requireClientTaskForWorkspace(id, workspace.workspace_id);

  const { data, error } = await supabase
    .from("client_project_tasks")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspace.workspace_id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Task archive failed or was not allowed.");

  return true;
}

export async function addClientProjectActivity({
  workspaceId,
  clientProjectId,
  message,
}) {
  const workspace = await resolveWorkspaceForRead(workspaceId);
  const user = await getCurrentUser();

  if (!message?.trim()) throw new Error("Note cannot be empty.");

  await requireClientProjectForWorkspace(
    clientProjectId,
    workspace.workspace_id
  );

  const { data, error } = await supabase
    .from("client_project_activities")
    .insert({
      workspace_id: workspace.workspace_id,
      client_project_id: clientProjectId,
      user_id: user.id,
      activity_type: "note",
      message: message.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
