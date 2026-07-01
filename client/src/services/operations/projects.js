import { supabase } from "@/config/supabaseClient.js";

export const PROJECT_STAGES = [
  "Planning",
  "Kickoff",
  "In Progress",
  "Review",
  "Blocked",
  "Completed",
  "Cancelled",
];

export const PROJECT_STAGE_COLORS = {
  Planning: "#8b5cf6",
  Kickoff: "#4a90d9",
  "In Progress": "#f5a623",
  Review: "#9b59b6",
  Blocked: "#e74c3c",
  Completed: "#27ae60",
  Cancelled: "#95a5a6",
};

export const PROJECT_PRIORITIES = ["Low", "Medium", "High", "Critical"];

function formatStage(status) {
  const value = String(status || "planning").toLowerCase();

  const map = {
    planning: "Planning",
    kickoff: "Kickoff",
    in_progress: "In Progress",
    review: "Review",
    blocked: "Blocked",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return map[value] || "Planning";
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "completed" || value === "done") return "completed";
  if (value === "blocked") return "blocked";
  if (value === "cancelled") return "cancelled";

  return "active";
}

function detectPriority(tasks) {
  if ((tasks || []).some((task) => task.priority === "critical")) {
    return "Critical";
  }

  if ((tasks || []).some((task) => task.priority === "high")) {
    return "High";
  }

  if ((tasks || []).some((task) => task.priority === "medium")) {
    return "Medium";
  }

  return "Low";
}

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getProjectsData() {
  const [
    projectsResult,
    contactsResult,
    profilesResult,
    tasksResult,
    projectActivitiesResult,
    taskActivitiesResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("contacts")
      .select("id, full_name, email, company_name")
      .order("full_name", { ascending: true }),

    supabase.from("profiles").select("id, full_name, email, role, status"),

    supabase.from("admin_tasks").select("*").is("archived_at", null),

    supabase
      .from("project_activities")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("admin_task_activities")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const results = [
    projectsResult,
    contactsResult,
    profilesResult,
    tasksResult,
    projectActivitiesResult,
    taskActivitiesResult,
  ];

  const failed = results.find((result) => result.error);

  if (failed?.error) throw failed.error;

  const projects = projectsResult.data || [];
  const contacts = contactsResult.data || [];
  const profiles = profilesResult.data || [];
  const tasks = tasksResult.data || [];
  const projectActivities = projectActivitiesResult.data || [];
  const taskActivities = taskActivitiesResult.data || [];

  const contactMap = byId(contacts);
  const profileMap = byId(profiles);

  const admins = profiles.filter(
    (profile) =>
      ["Admin", "SuperAdmin", "admin", "super_admin"].includes(profile.role) &&
      profile.status === "active"
  );

  const normalizedProjects = projects
    .filter((project) => !project.archived_at)
    .map((project) => {
      const contact = project.contact_id
        ? contactMap.get(project.contact_id)
        : null;

      const assignedAdmin = project.assigned_admin_id
        ? profileMap.get(project.assigned_admin_id)
        : null;

      const managerName =
        assignedAdmin?.full_name ||
        assignedAdmin?.email ||
        project.assigned_member ||
        "Unassigned";

      const clientName =
        contact?.full_name || project.external_client_name || "No Client";

      const clientEmail = contact?.email || project.external_client_email || "";

      const projectTasks = tasks.filter((task) => task.project_id === project.id);

      const completedTasks = projectTasks.filter(
        (task) => task.status === "done"
      );

      const progress =
        projectTasks.length > 0
          ? Math.round((completedTasks.length / projectTasks.length) * 100)
          : Number(project.progress_percent || project.progress || 0);

      const normalizedProjectActivities = projectActivities
        .filter((activity) => activity.project_id === project.id)
        .map((activity) => {
          const user = activity.user_id ? profileMap.get(activity.user_id) : null;

          return {
            id: activity.id,
            type: activity.activity_type || "activity",
            user: user?.full_name || user?.email || "System",
            date: activity.created_at,
            note: activity.message || "",
          };
        });

      const normalizedTaskActivities = projectTasks.flatMap((task) =>
        taskActivities
          .filter((activity) => activity.task_id === task.id)
          .map((activity) => {
            const user = activity.user_id
              ? profileMap.get(activity.user_id)
              : null;

            return {
              id: activity.id,
              type: activity.activity_type || "task",
              user: user?.full_name || user?.email || "System",
              date: activity.created_at,
              note: `${task.title || "Task"}: ${
                activity.message || "Activity recorded"
              }`,
            };
          })
      );

      const activities = [
        ...normalizedProjectActivities,
        ...normalizedTaskActivities,
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      const taskMembers = projectTasks
        .map((task) => {
          const assignee = task.assigned_to
            ? profileMap.get(task.assigned_to)
            : null;

          return assignee?.full_name || assignee?.email;
        })
        .filter(Boolean);

      const team = [
        ...new Set(
          [managerName !== "Unassigned" ? managerName : null, ...taskMembers].filter(
            Boolean
          )
        ),
      ];

      return {
        id: project.id,
        name: project.project_name || "Untitled Project",
        customer: clientName,
        customerEmail: clientEmail,
        contact: contact?.full_name || clientName,
        linkedDeal: project.booking_id ? "Demo Booking" : "ERP Project",
        serviceCategory: project.modules_included || "ERP Services",
        servicePackage:
          Array.isArray(project.modules_availed) &&
          project.modules_availed.length > 0
            ? project.modules_availed.join(", ")
            : project.modules_included || "Implementation Package",
        stage: formatStage(project.status),
        priority: detectPriority(projectTasks),
        status: normalizeStatus(project.status),
        progress,
        startDate: project.start_date,
        dueDate: project.target_launch_date,
        manager: managerName,
        managerId: project.assigned_admin_id,
        team,
        tags: Array.isArray(project.modules_availed)
          ? project.modules_availed
          : [],
        description: project.notes || "",
        saleValue: project.sale_value || 0,
        deliverables: projectTasks.map((task) => ({
          id: task.id,
          title: task.title || "Untitled Task",
          dueDate: task.due_date,
          done: task.status === "done",
        })),
        milestones: projectTasks
          .filter(
            (task) => task.priority === "high" || task.priority === "critical"
          )
          .map((task) => ({
            id: task.id,
            name: task.title || "Untitled Milestone",
            dueDate: task.due_date,
            done: task.status === "done",
          })),
        activities,
        raw: project,
      };
    });

  return {
    projects: normalizedProjects,
    stages: PROJECT_STAGES,
    priorities: PROJECT_PRIORITIES,
    contacts,
    admins,
    members: [
      ...new Set(
        normalizedProjects.map((project) => project.manager).filter(Boolean)
      ),
    ],
    serviceCategories: [
      ...new Set(
        normalizedProjects
          .map((project) => project.serviceCategory)
          .filter(Boolean)
      ),
    ],
  };
}

export async function createProject(payload) {
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateProject(id, payload) {
  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function archiveProject(id) {
  const { error } = await supabase
    .from("projects")
    .update({
      archived_at: new Date().toISOString(),
      status: "cancelled",
    })
    .eq("id", id);

  if (error) throw error;

  return true;
}

export async function addProjectActivity(projectId, message) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required.");
  if (!message?.trim()) throw new Error("Note cannot be empty.");

  const { data, error } = await supabase
    .from("project_activities")
    .insert({
      project_id: projectId,
      user_id: user.id,
      activity_type: "note",
      message: message.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
