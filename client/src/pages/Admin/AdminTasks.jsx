import { useEffect, useMemo, useState } from "react";

import {
  TasksHeader,
  TasksKPICards,
  TasksViewTabs,
  TasksFilterToolbar,
  TasksKanbanBoard,
  TasksListView,
  TaskDetailDrawer,
  TaskFormModal,
  TasksLoadingState,
  TasksErrorState,
} from "../../components/admin/layout/Admin_Tasks_Components.jsx";

import {
  addTaskNote,
  createTask,
  getTaskFormOptions,
  getTasksData,
  markTaskDone,
  updateTask,
} from "../../services/operations/tasks";

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [formOptions, setFormOptions] = useState({ projects: [], assignees: [] });

  const [activeView, setActiveView] = useState("list");
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    assignee: "all",
    project: "all",
  });

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks(selectedTaskId = selectedTask?.id) {
    try {
      setLoading(true);
      setError("");

      const [taskData, options] = await Promise.all([
        getTasksData(),
        getTaskFormOptions(),
      ]);

      setTasks(taskData.tasks || []);
      setStatuses(taskData.statuses || []);
      setAssignees(taskData.assignees || []);
      setPriorities(taskData.priorities || []);
      setFormOptions(options);

      if (selectedTaskId) {
        const refreshedSelected = (taskData.tasks || []).find((task) => task.id === selectedTaskId);
        setSelectedTask(refreshedSelected || null);
      }
    } catch (err) {
      console.error("Tasks load error:", err);
      setError(err.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(payload) {
    try {
      setSaving(true);
      await createTask(payload);
      setModalMode(null);
      await loadTasks(null);
    } catch (err) {
      alert(err.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTask(payload) {
    if (!selectedTask?.id) return;

    try {
      setSaving(true);
      await updateTask(selectedTask.id, payload);
      setModalMode(null);
      await loadTasks(selectedTask.id);
    } catch (err) {
      alert(err.message || "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkDone(task) {
    if (!task?.id || task.status === "done") return;

    try {
      setSaving(true);
      await markTaskDone(task.id);
      await loadTasks(task.id);
    } catch (err) {
      alert(err.message || "Failed to mark task as done.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(taskId, message) {
    try {
      setSaving(true);
      await addTaskNote(taskId, message);
      await loadTasks(taskId);
    } catch (err) {
      alert(err.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  const projectNames = useMemo(() => {
    return [...new Set(tasks.map((task) => task.project).filter(Boolean))];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const search = filters.search.trim().toLowerCase();

      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        task.project.toLowerCase().includes(search) ||
        task.assignee.toLowerCase().includes(search) ||
        (task.notes || "").toLowerCase().includes(search);

      return (
        matchesSearch &&
        (filters.status === "all" || task.status === filters.status) &&
        (filters.priority === "all" || task.priority === filters.priority) &&
        (filters.assignee === "all" || task.assignee === filters.assignee) &&
        (filters.project === "all" || task.project === filters.project)
      );
    });
  }, [tasks, filters]);

  return (
    <div className="space-y-6">
      <TasksHeader onRefresh={() => loadTasks()} onCreate={() => setModalMode("create")} />

      {loading && <TasksLoadingState />}

      {!loading && error && <TasksErrorState message={error} onRetry={() => loadTasks()} />}

      {!loading && !error && (
        <>
          <TasksKPICards tasks={tasks} />

          <div className="space-y-4">
            <TasksViewTabs activeView={activeView} onViewChange={setActiveView} />

            <TasksFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              statuses={statuses}
              priorities={priorities}
              assignees={assignees}
              projects={projectNames}
            />

            {activeView === "kanban" && (
              <TasksKanbanBoard
                statuses={statuses}
                tasks={filteredTasks}
                onCardClick={setSelectedTask}
              />
            )}

            {activeView === "list" && (
              <TasksListView tasks={filteredTasks} onRowClick={setSelectedTask} />
            )}
          </div>
        </>
      )}

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          saving={saving}
          onClose={() => setSelectedTask(null)}
          onEdit={() => setModalMode("edit")}
          onMarkDone={() => handleMarkDone(selectedTask)}
          onAddNote={handleAddNote}
        />
      )}

      {modalMode && (
        <TaskFormModal
          mode={modalMode}
          task={modalMode === "edit" ? selectedTask : null}
          options={formOptions}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSubmit={modalMode === "edit" ? handleUpdateTask : handleCreateTask}
        />
      )}
    </div>
  );
}
