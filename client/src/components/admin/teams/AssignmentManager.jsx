import { useEffect, useMemo, useState } from "react";

import {
  ASSIGNEE_TYPES,
  ASSIGNMENT_RECORD_TYPES,
  ASSIGNMENT_ROLES,
  RECORD_TYPE_ICONS,
  getPriorityColor,
  getRecordTypeLabel,
} from "@/constants/operations/teamConstants";

import {
  assignRecord,
  getAssignmentTargets,
  updateAssignment,
} from "@/services/operations/assignments";

import {
  getTeamMembers,
  getTeams,
} from "@/services/operations/teams";

const ASSIGNMENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
  { value: "review", label: "In Review" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function getAssigneeLabel(assignee) {
  return assignee?.name || assignee?.lead_name || assignee?.email || "Unnamed";
}

function getAssigneeInitials(assignee) {
  if (assignee?.initials) return assignee.initials;
  if (assignee?.name) return assignee.name.charAt(0);
  if (assignee?.lead_name) return assignee.lead_name.charAt(0);
  return "?";
}

function getAssigneeId(assigneeType, assignee) {
  if (!assignee) return "";

  if (assigneeType === "team") return assignee.id;
  if (assigneeType === "employee") return assignee.employee_id || assignee.member_id;
  if (assigneeType === "profile") return assignee.profile_id;

  return "";
}

function isSupportedRecordType(recordType) {
  return ["task", "project", "lead", "deal"].includes(recordType);
}

function isSupportedAssigneeType(assigneeType) {
  return ["team", "employee", "profile"].includes(assigneeType);
}

function getTargetMeta(target) {
  const meta = [];

  if (target?.status) meta.push(target.status);
  if (target?.project) meta.push(target.project);
  if (target?.assignee) meta.push(`Assigned: ${target.assignee}`);
  meta.push(`Due ${target?.due_date || "—"}`);

  return meta.join(" · ");
}

function createPrefillTargetFromAssignment(assignment) {
  if (!assignment?.record_id) return null;

  return {
    id: assignment.record_id,
    label: assignment.record_label,
    status: assignment.status,
    priority: assignment.priority,
    due_date: assignment.due_date,
    record_type: assignment.record_type,
  };
}

function createPrefillAssigneeFromAssignment(assignment) {
  if (!assignment?.assignee_id) return null;

  return {
    id: assignment.assignee_id,
    assignee_type: assignment.assignee_type,
    employee_id: assignment.employee_id,
    member_id: assignment.employee_id,
    profile_id: assignment.profile_id,
    name: assignment.assignee_label,
    lead_name: assignment.assignee_label,
    email: "",
  };
}

function mergeSelectedFromList(currentSelection, items, assigneeType) {
  if (!currentSelection) return null;

  const currentId =
    getAssigneeId(assigneeType, currentSelection) || currentSelection.id;

  return (
    items.find((item) => getAssigneeId(assigneeType, item) === currentId) ||
    items.find((item) => item.id === currentId) ||
    currentSelection
  );
}

export default function AssignmentManager({
  assignment,
  onAssign,
  onClose,
  prefillTarget,
  prefillAssignee,
}) {
  const isEdit = Boolean(assignment?.id);

  const initialTarget =
    prefillTarget || createPrefillTargetFromAssignment(assignment);

  const initialAssignee =
    prefillAssignee || createPrefillAssigneeFromAssignment(assignment);

  const [step, setStep] = useState(initialTarget ? 2 : 1);
  const [recordType, setRecordType] = useState(
    initialTarget?.record_type || assignment?.record_type || "task"
  );
  const [selectedTarget, setSelectedTarget] = useState(initialTarget || null);

  const [assigneeType, setAssigneeType] = useState(
    initialAssignee?.assignee_type || assignment?.assignee_type || "team"
  );
  const [selectedAssignee, setSelectedAssignee] = useState(initialAssignee || null);

  const [role, setRole] = useState(assignment?.role || "primary_owner");
  const [status, setStatus] = useState(assignment?.status || "active");
  const [priority, setPriority] = useState(assignment?.priority || "medium");
  const [note, setNote] = useState(assignment?.note || "");

  const [targets, setTargets] = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetsError, setTargetsError] = useState("");

  const [assignees, setAssignees] = useState([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTargets() {
      if (!isEdit) {
        setSelectedTarget(null);
      }

      if (!isSupportedRecordType(recordType)) {
        setTargets([]);
        setTargetsError(`${getRecordTypeLabel(recordType)} assignments are not connected yet.`);
        setTargetsLoading(false);
        return;
      }

      try {
        setTargetsLoading(true);
        setTargetsError("");

        const data = await getAssignmentTargets(recordType);

        if (mounted) {
          const nextTargets = data || [];
          setTargets(nextTargets);

          if (isEdit && selectedTarget?.id) {
            const matchedTarget =
              nextTargets.find((target) => target.id === selectedTarget.id) ||
              selectedTarget;

            setSelectedTarget(matchedTarget);
          }
        }
      } catch (err) {
        console.error("Assignment targets load error:", err);

        if (mounted) {
          setTargetsError(err.message || "Failed to load assignment targets.");
          setTargets([]);
        }
      } finally {
        if (mounted) {
          setTargetsLoading(false);
        }
      }
    }

    loadTargets();

    return () => {
      mounted = false;
    };
    // selectedTarget intentionally omitted to avoid reload loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordType, isEdit]);

  useEffect(() => {
    let mounted = true;

    async function loadAssignees() {
      if (!isSupportedAssigneeType(assigneeType)) {
        setAssignees([]);
        setAssigneesError("This assignee type is not connected yet.");
        setAssigneesLoading(false);
        return;
      }

      try {
        setAssigneesLoading(true);
        setAssigneesError("");

        const data = assigneeType === "team" ? await getTeams() : await getTeamMembers();

        if (mounted) {
          const nextAssignees = data || [];
          setAssignees(nextAssignees);

          if (selectedAssignee) {
            setSelectedAssignee(
              mergeSelectedFromList(selectedAssignee, nextAssignees, assigneeType)
            );
          }
        }
      } catch (err) {
        console.error("Assignee load error:", err);

        if (mounted) {
          setAssigneesError(err.message || "Failed to load assignees.");
          setAssignees([]);
        }
      } finally {
        if (mounted) {
          setAssigneesLoading(false);
        }
      }
    }

    loadAssignees();

    return () => {
      mounted = false;
    };
    // selectedAssignee intentionally omitted to avoid reload loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeType]);

  const selectedAssigneeId = useMemo(
    () => getAssigneeId(assigneeType, selectedAssignee),
    [assigneeType, selectedAssignee]
  );

  const canGoToAssignee =
    !targetsLoading &&
    !targetsError &&
    Boolean(selectedTarget?.id);

  const canGoToRole =
    !assigneesLoading &&
    !assigneesError &&
    Boolean(selectedAssigneeId);

  const canSubmit =
    Boolean(selectedTarget?.id) &&
    Boolean(selectedAssigneeId) &&
    isSupportedRecordType(recordType) &&
    isSupportedAssigneeType(assigneeType) &&
    !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setSaving(true);
      setSaveError("");

      const payload = {
        record_type: recordType,
        record_id: selectedTarget.id,
        record_label: selectedTarget.label,

        assignee_type: assigneeType,
        assignee_id: selectedAssigneeId,
        assignee_label: getAssigneeLabel(selectedAssignee),

        role,
        status,
        is_primary: role === "primary_owner",
        priority: priority || selectedTarget.priority || "medium",
        due_date: selectedTarget.due_date || null,
        note,
      };

      const savedAssignment = isEdit
        ? await updateAssignment(assignment.id, payload)
        : await assignRecord(payload);

      onAssign?.(savedAssignment);
      onClose?.();
    } catch (err) {
      console.error("Assignment save error:", err);
      setSaveError(
        err.message ||
          (isEdit ? "Failed to update assignment." : "Failed to create assignment.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assignment-manager">
      <div className="assignment-steps">
        {[
          ["1", "Target"],
          ["2", "Assignee"],
          ["3", isEdit ? "Assignment Details" : "Role"],
        ].map(([number, label], index) => {
          const currentStep = index + 1;
          const active = step === currentStep;
          const done = step > currentStep;

          return (
            <div key={number} className="assignment-step-wrap">
              <button
                type="button"
                className={`assignment-step ${active ? "active" : ""} ${
                  done ? "done" : ""
                }`}
                onClick={() => done && setStep(currentStep)}
                disabled={!done}
              >
                <span>{done ? "✓" : number}</span>
                <strong>{label}</strong>
              </button>

              {index < 2 && (
                <div className={`assignment-step-line ${done ? "done" : ""}`} />
              )}
            </div>
          );
        })}
      </div>

      {saveError && (
        <div className="t-empty t-empty-compact">
          <div className="t-empty-icon">⚠️</div>
          <div className="t-empty-title">
            {isEdit ? "Unable to update assignment" : "Unable to create assignment"}
          </div>
          <div className="t-empty-sub">{saveError}</div>
        </div>
      )}

      {step === 1 && (
        <div className="assignment-step-body">
          <div className="t-section-label">What are you assigning?</div>

          <div className="assignment-option-grid">
            {ASSIGNMENT_RECORD_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`assignment-option ${
                  recordType === type.value ? "active" : ""
                } ${type.future || !isSupportedRecordType(type.value) ? "future" : ""}`}
                onClick={() => {
                  setRecordType(type.value);
                  setSelectedTarget(null);
                  setStep(1);
                }}
              >
                <span>{type.icon}</span>
                <strong>{type.label}</strong>
                {(type.future || !isSupportedRecordType(type.value)) && <small>Later</small>}
              </button>
            ))}
          </div>

          <div className="t-section-label">Select record</div>

          <div className="assignment-record-list">
            {targetsLoading && (
              <div className="t-empty t-empty-compact">
                <div className="t-empty-title">Loading records...</div>
              </div>
            )}

            {!targetsLoading && targetsError && (
              <div className="t-empty t-empty-compact">
                <div className="t-empty-icon">📌</div>
                <div className="t-empty-title">No connected records</div>
                <div className="t-empty-sub">{targetsError}</div>
              </div>
            )}

            {!targetsLoading && !targetsError && targets.length === 0 && (
              <div className="t-empty t-empty-compact">
                <div className="t-empty-icon">📌</div>
                <div className="t-empty-title">
                  No {getRecordTypeLabel(recordType)} records available
                </div>
              </div>
            )}

            {!targetsLoading &&
              !targetsError &&
              targets.map((target) => {
                const selected = selectedTarget?.id === target.id;
                const priorityColor = getPriorityColor(target.priority);

                return (
                  <button
                    key={target.id}
                    type="button"
                    className={`assignment-record ${selected ? "active" : ""}`}
                    onClick={() => {
                      setSelectedTarget(target);
                      setPriority(target.priority || priority || "medium");
                    }}
                  >
                    <span className="assignment-record-icon">
                      {RECORD_TYPE_ICONS[recordType] || "📌"}
                    </span>

                    <span className="assignment-record-main">
                      <strong>{target.label}</strong>
                      <small>{getTargetMeta(target)}</small>
                    </span>

                    {target.priority && (
                      <span
                        className="assignment-priority"
                        style={{
                          color: priorityColor,
                          borderColor: `${priorityColor}55`,
                          background: `${priorityColor}18`,
                        }}
                      >
                        {target.priority}
                      </span>
                    )}

                    {selected && <span className="assignment-check">✓</span>}
                  </button>
                );
              })}
          </div>

          <div className="assignment-actions">
            <button
              type="button"
              className={`t-btn ${
                canGoToAssignee ? "t-btn-primary" : "t-btn-ghost"
              }`}
              disabled={!canGoToAssignee}
              onClick={() => canGoToAssignee && setStep(2)}
            >
              Next: Choose Assignee →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="assignment-step-body">
          <div className="t-section-label">Assign to</div>

          <div className="assignment-assignee-tabs">
            {ASSIGNEE_TYPES.map((type) => {
              const unsupported = !isSupportedAssigneeType(type.value);

              return (
                <button
                  key={type.value}
                  type="button"
                  className={`assignment-assignee-tab ${
                    assigneeType === type.value ? "active" : ""
                  } ${unsupported ? "future" : ""}`}
                  onClick={() => {
                    setAssigneeType(type.value);
                    setSelectedAssignee(null);
                  }}
                >
                  {type.label}
                </button>
              );
            })}
          </div>

          <div className="t-section-label">
            Select {ASSIGNEE_TYPES.find((type) => type.value === assigneeType)?.label}
          </div>

          <div className="assignment-assignee-list">
            {assigneesLoading && (
              <div className="t-empty t-empty-compact">
                <div className="t-empty-title">Loading assignees...</div>
              </div>
            )}

            {!assigneesLoading && assigneesError && (
              <div className="t-empty t-empty-compact">
                <div className="t-empty-icon">👤</div>
                <div className="t-empty-title">No connected assignees</div>
                <div className="t-empty-sub">{assigneesError}</div>
              </div>
            )}

            {!assigneesLoading && !assigneesError && assignees.length === 0 && (
              <div className="t-empty t-empty-compact">
                <div className="t-empty-icon">👤</div>
                <div className="t-empty-title">No assignees available</div>
              </div>
            )}

            {!assigneesLoading &&
              !assigneesError &&
              assignees.map((assignee) => {
                const assigneeId = getAssigneeId(assigneeType, assignee);
                const selected = selectedAssigneeId === assigneeId;
                const label = getAssigneeLabel(assignee);
                const workload = assignee.metrics?.workload ?? assignee.workload ?? null;

                return (
                  <button
                    key={`${assigneeType}-${assignee.id}`}
                    type="button"
                    className={`assignment-assignee ${selected ? "active" : ""}`}
                    disabled={!assigneeId}
                    onClick={() => setSelectedAssignee(assignee)}
                  >
                    <span className="t-avatar t-avatar-sm">
                      {getAssigneeInitials(assignee)}
                    </span>

                    <span className="assignment-assignee-main">
                      <strong>{label}</strong>
                      <small>
                        {assignee.type_label ||
                          assignee.department ||
                          assignee.email ||
                          "Assignee"}
                      </small>
                    </span>

                    {workload !== null && (
                      <span
                        className={
                          workload >= 85 ? "assignment-load high" : "assignment-load"
                        }
                      >
                        {workload}%
                      </span>
                    )}

                    {selected && <span className="assignment-check">✓</span>}
                  </button>
                );
              })}
          </div>

          <div className="assignment-actions split">
            <button
              type="button"
              className="t-btn t-btn-ghost"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>

            <button
              type="button"
              className={`t-btn ${canGoToRole ? "t-btn-primary" : "t-btn-ghost"}`}
              disabled={!canGoToRole}
              onClick={() => canGoToRole && setStep(3)}
            >
              Next: Assignment Details →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="assignment-step-body">
          <div className="assignment-summary">
            <div className="assignment-summary-label">
              {isEdit ? "Updated Assignment Summary" : "Assignment Summary"}
            </div>

            <div className="assignment-summary-flow">
              <span>{RECORD_TYPE_ICONS[recordType] || "📌"}</span>
              <strong>{selectedTarget?.label}</strong>
              <span>→</span>
              <strong>{getAssigneeLabel(selectedAssignee)}</strong>
            </div>
          </div>

          <div className="t-section-label">Assignment Role</div>

          <div className="assignment-role-list">
            {ASSIGNMENT_ROLES.map((item) => (
              <label
                key={item.value}
                className={`assignment-role ${role === item.value ? "active" : ""}`}
              >
                <input
                  type="radio"
                  value={item.value}
                  checked={role === item.value}
                  onChange={() => setRole(item.value)}
                />

                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </label>
            ))}
          </div>

          <div className="t-form-row">
            <div>
              <label className="t-label">Assignment Status</label>
              <select
                className="t-form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {ASSIGNMENT_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="t-label">Operational Priority</label>
              <select
                className="t-form-select"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="t-form-group">
            <label className="t-label">Note (optional)</label>
            <textarea
              className="t-textarea"
              placeholder="Add a note about this assignment..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
            />
          </div>

          <div className="assignment-actions split">
            <button
              type="button"
              className="t-btn t-btn-ghost"
              onClick={() => setStep(2)}
              disabled={saving}
            >
              ← Back
            </button>

            <button
              type="button"
              className={`t-btn ${canSubmit ? "t-btn-primary" : "t-btn-ghost"}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {saving
                ? "Saving..."
                : isEdit
                  ? "✓ Save Assignment"
                  : "✓ Confirm Assignment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
