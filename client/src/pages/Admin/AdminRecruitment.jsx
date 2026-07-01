import { useEffect, useState } from "react";

import {
  CandidateFormModal,
  JobFormModal,
  RecruitmentAIInsights,
  RecruitmentCandidatesTable,
  RecruitmentErrorState,
  RecruitmentHeader,
  RecruitmentJobsTable,
  RecruitmentKPICards,
  RecruitmentLoadingState,
} from "../../components/admin/layout/Admin_Recruitment_Components.jsx";

import {
  createCandidate,
  createJobOpening,
  deleteCandidate,
  deleteJobOpening,
  getRecruitmentData,
  updateCandidate,
  updateJobOpening,
} from "../../services/human_resources/recruitment";

const EMPTY_JOB_FORM = {
  jobCode: "",
  title: "",
  departmentId: "",
  type: "full_time",
  priority: "medium",
  status: "active",
  openDate: new Date().toISOString().slice(0, 10),
  deadline: "",
  recruiterId: "",
  description: "",
  aiNotes: "",
};

const EMPTY_CANDIDATE_FORM = {
  candidateCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobOpeningId: "",
  source: "Direct",
  stage: "applied",
  fitScore: 0,
  skillsMatch: 0,
  interviewStatus: "pending",
  recruiterId: "",
  needsReview: false,
  aiSummary: "",
  aiRecommendation: "",
};

export default function AdminRecruitment() {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [insights, setInsights] = useState([]);

  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [jobForm, setJobForm] = useState(EMPTY_JOB_FORM);
  const [candidateForm, setCandidateForm] = useState(EMPTY_CANDIDATE_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecruitment();
  }, []);

  async function loadRecruitment() {
    try {
      setLoading(true);
      setError("");

      const data = await getRecruitmentData();

      setJobs(data.jobs || []);
      setCandidates(data.candidates || []);
      setDepartments(data.departments || []);
      setEmployees(data.employees || []);
      setInsights(data.insights || []);
    } catch (err) {
      console.error("Recruitment load error:", err);
      setError(err.message || "Failed to load recruitment.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateJob() {
    setEditingJob(null);
    setJobForm(EMPTY_JOB_FORM);
    setShowJobModal(true);
  }

  function openEditJob(job) {
    setEditingJob(job);
    setJobForm({
      jobCode: job.jobCode || "",
      title: job.title || "",
      departmentId: job.departmentId || "",
      type: job.type || "full_time",
      priority: job.priority || "medium",
      status: job.status || "active",
      openDate: job.openDate || "",
      deadline: job.deadline || "",
      recruiterId: job.recruiterId || "",
      description: job.description || "",
      aiNotes: job.aiNotes || "",
    });
    setShowJobModal(true);
  }

  function openCreateCandidate() {
    setEditingCandidate(null);
    setCandidateForm({
      ...EMPTY_CANDIDATE_FORM,
      jobOpeningId: jobs[0]?.id || "",
    });
    setShowCandidateModal(true);
  }

  function openEditCandidate(candidate) {
    setEditingCandidate(candidate);
    setCandidateForm({
      candidateCode: candidate.candidateCode || "",
      firstName: candidate.firstName || "",
      lastName: candidate.lastName || "",
      email: candidate.email || "",
      phone: candidate.phone || "",
      jobOpeningId: candidate.jobOpeningId || "",
      source: candidate.source || "Direct",
      stage: candidate.stage || "applied",
      fitScore: candidate.fitScore || 0,
      skillsMatch: candidate.skillsMatch || 0,
      interviewStatus: candidate.interviewStatus || "pending",
      recruiterId: candidate.recruiterId || "",
      needsReview: !!candidate.needsReview,
      aiSummary: candidate.aiSummary || "",
      aiRecommendation: candidate.aiRecommendation || "",
    });
    setShowCandidateModal(true);
  }

  async function handleSaveJob(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingJob?.id) {
        await updateJobOpening(editingJob.id, jobForm);
      } else {
        await createJobOpening(jobForm);
      }

      setShowJobModal(false);
      await loadRecruitment();
    } catch (err) {
      alert(err.message || "Failed to save job opening.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCandidate(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (editingCandidate?.id) {
        await updateCandidate(editingCandidate.id, candidateForm);
      } else {
        await createCandidate(candidateForm);
      }

      setShowCandidateModal(false);
      await loadRecruitment();
    } catch (err) {
      alert(err.message || "Failed to save candidate.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteJob(job) {
    if (!window.confirm(`Delete job opening ${job.jobCode}?`)) return;

    try {
      setSaving(true);
      await deleteJobOpening(job.id);
      await loadRecruitment();
    } catch (err) {
      alert(err.message || "Failed to delete job opening.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCandidate(candidate) {
    if (!window.confirm(`Delete candidate ${candidate.name}?`)) return;

    try {
      setSaving(true);
      await deleteCandidate(candidate.id);
      await loadRecruitment();
    } catch (err) {
      alert(err.message || "Failed to delete candidate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <RecruitmentHeader
        onRefresh={loadRecruitment}
        onCreateJob={openCreateJob}
        onCreateCandidate={openCreateCandidate}
      />

      {loading && <RecruitmentLoadingState />}

      {!loading && error && (
        <RecruitmentErrorState message={error} onRetry={loadRecruitment} />
      )}

      {!loading && !error && (
        <>
          <RecruitmentAIInsights insights={insights} />
          <RecruitmentKPICards jobs={jobs} candidates={candidates} />
          <RecruitmentJobsTable
            jobs={jobs}
            saving={saving}
            onEdit={openEditJob}
            onDelete={handleDeleteJob}
          />
          <RecruitmentCandidatesTable
            candidates={candidates}
            saving={saving}
            onEdit={openEditCandidate}
            onDelete={handleDeleteCandidate}
          />
        </>
      )}

      {showJobModal && (
        <JobFormModal
          mode={editingJob ? "edit" : "create"}
          form={jobForm}
          onChange={setJobForm}
          onSubmit={handleSaveJob}
          onClose={() => setShowJobModal(false)}
          saving={saving}
          departments={departments}
          employees={employees}
        />
      )}

      {showCandidateModal && (
        <CandidateFormModal
          mode={editingCandidate ? "edit" : "create"}
          form={candidateForm}
          onChange={setCandidateForm}
          onSubmit={handleSaveCandidate}
          onClose={() => setShowCandidateModal(false)}
          saving={saving}
          jobs={jobs}
          employees={employees}
        />
      )}
    </div>
  );
}
