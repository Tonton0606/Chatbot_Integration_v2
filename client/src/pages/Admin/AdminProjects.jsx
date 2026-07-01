// client/src/pages/Admin/AdminProjects.jsx

import { useEffect, useMemo, useState } from "react";

import {
  ProjectsHeader,
  ProjectsKPICards,
  ProjectsViewTabs,
  ProjectsFilterToolbar,
  ProjectsKanbanBoard,
  ProjectsListView,
  ProjectDetailDrawer,
  ProjectFormModal,
  ProjectTaskModal,
  ProjectsLoadingState,
  ProjectsErrorState,
} from "../../components/admin/layout/Admin_Projects_Components.jsx";

import {
  addProjectActivity,
  archiveProject,
  createProject,
  getProjectsData,
  updateProject,
} from "../../services/operations/projects";

import { createTask, getTaskFormOptions } from "../../services/operations/tasks";

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [stages, setStages] = useState([]);
  const [members, setMembers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);

  const [admins, setAdmins] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [taskOptions, setTaskOptions] = useState({
    projects: [],
    assignees: [],
  });

  const [activeView, setActiveView] = useState("kanban");
  const [selectedProject, setSelectedProject] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
    status: "all",
    manager: "all",
    priority: "all",
    serviceCategory: "all",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects(selectedProjectId = selectedProject?.id) {
    try {
      setLoading(true);
      setError("");

      const [projectData, taskData] = await Promise.all([
        getProjectsData(),
        getTaskFormOptions(),
      ]);

      setProjects(projectData.projects || []);
      setStages(projectData.stages || []);
      setMembers(projectData.members || []);
      setPriorities(projectData.priorities || []);
      setServiceCategories(projectData.serviceCategories || []);
      setAdmins(projectData.admins || []);
      setContacts(projectData.contacts || []);
      setTaskOptions(taskData || { projects: [], assignees: [] });

      if (selectedProjectId) {
        const refreshedProject = (projectData.projects || []).find(
          (project) => project.id === selectedProjectId
        );

        setSelectedProject(refreshedProject || null);
      }
    } catch (err) {
      console.error("Projects load error:", err);
      setError(err.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  function buildProjectPayload(payload) {
    return {
      project_name: payload.name,
      status: payload.stage,
      progress_percent: Number(payload.progress || 0),
      start_date: payload.startDate || null,
      target_launch_date: payload.dueDate || null,
      notes: payload.description || null,
      modules_included: payload.serviceCategory || null,
      sale_value: Number(payload.saleValue || 0),
      assigned_admin_id: payload.assignedAdminId || null,
      assigned_member: payload.assignedAdminName || null,

      customer_id: null,
      contact_id:
        payload.clientType === "contact" ? payload.contactId || null : null,
      external_client_name:
        payload.clientType === "external"
          ? payload.externalClientName || null
          : null,
      external_client_email:
        payload.clientType === "external"
          ? payload.externalClientEmail || null
          : null,
    };
  }

  async function handleCreateProject(payload) {
    try {
      setSaving(true);

      await createProject(buildProjectPayload(payload));

      setModalMode(null);
      await loadProjects(null);
    } catch (err) {
      alert(err.message || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProject(payload) {
    if (!selectedProject?.id) return;

    try {
      setSaving(true);

      await updateProject(selectedProject.id, buildProjectPayload(payload));

      setModalMode(null);
      await loadProjects(selectedProject.id);
    } catch (err) {
      alert(err.message || "Failed to update project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveProject() {
    if (!selectedProject?.id) return;

    const confirmed = window.confirm(`Archive "${selectedProject.name}"?`);
    if (!confirmed) return;

    try {
      setSaving(true);

      await archiveProject(selectedProject.id);

      setSelectedProject(null);
      await loadProjects(null);
    } catch (err) {
      alert(err.message || "Failed to archive project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTask(payload) {
    if (!selectedProject?.id) return;

    try {
      setSaving(true);

      await createTask({
        ...payload,
        projectId: selectedProject.id,
      });

      setModalMode(null);
      await loadProjects(selectedProject.id);
    } catch (err) {
      alert(err.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(projectId, message) {
    try {
      setSaving(true);

      await addProjectActivity(projectId, message);
      await loadProjects(projectId);
    } catch (err) {
      alert(err.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const search = filters.search.trim().toLowerCase();

      const matchesSearch =
        !search ||
        project.name.toLowerCase().includes(search) ||
        project.customer.toLowerCase().includes(search) ||
        project.contact.toLowerCase().includes(search) ||
        project.linkedDeal.toLowerCase().includes(search) ||
        project.serviceCategory.toLowerCase().includes(search) ||
        project.servicePackage.toLowerCase().includes(search);

      return (
        matchesSearch &&
        (filters.stage === "all" || project.stage === filters.stage) &&
        (filters.status === "all" || project.status === filters.status) &&
        (filters.manager === "all" || project.manager === filters.manager) &&
        (filters.priority === "all" || project.priority === filters.priority) &&
        (filters.serviceCategory === "all" ||
          project.serviceCategory === filters.serviceCategory)
      );
    });
  }, [projects, filters]);

  return (
    <div className="space-y-6">
      <ProjectsHeader
        onRefresh={() => loadProjects()}
        onCreate={() => setModalMode("create-project")}
      />

      {loading && <ProjectsLoadingState />}

      {!loading && error && (
        <ProjectsErrorState message={error} onRetry={() => loadProjects()} />
      )}

      {!loading && !error && (
        <>
          <ProjectsKPICards projects={projects} />

          <div className="space-y-4">
            <ProjectsViewTabs
              activeView={activeView}
              onViewChange={setActiveView}
            />

            <ProjectsFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              stages={stages}
              members={members}
              priorities={priorities}
              serviceCategories={serviceCategories}
            />

            {activeView === "kanban" && (
              <ProjectsKanbanBoard
                stages={stages}
                projects={filteredProjects}
                onCardClick={setSelectedProject}
              />
            )}

            {activeView === "list" && (
              <ProjectsListView
                projects={filteredProjects}
                onRowClick={setSelectedProject}
              />
            )}
          </div>
        </>
      )}

      {selectedProject && (
        <ProjectDetailDrawer
          project={selectedProject}
          stages={stages}
          saving={saving}
          onClose={() => setSelectedProject(null)}
          onEdit={() => setModalMode("edit-project")}
          onAddTask={() => setModalMode("add-task")}
          onArchive={handleArchiveProject}
          onAddNote={handleAddNote}
        />
      )}

      {(modalMode === "create-project" || modalMode === "edit-project") && (
        <ProjectFormModal
          mode={modalMode === "edit-project" ? "edit" : "create"}
          project={modalMode === "edit-project" ? selectedProject : null}
          admins={admins}
          contacts={contacts}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSubmit={
            modalMode === "edit-project"
              ? handleUpdateProject
              : handleCreateProject
          }
        />
      )}

      {modalMode === "add-task" && selectedProject && (
        <ProjectTaskModal
          project={selectedProject}
          options={taskOptions}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSubmit={handleAddTask}
        />
      )}
    </div>
  );
}
