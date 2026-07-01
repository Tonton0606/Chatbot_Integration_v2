import { Plus, Search, Mail, Phone, Building2, X, Edit2, Trash2, Brain, Sparkles, Target, Zap, Users } from "lucide-react";
import { Card, CardContent, Button, Badge, CardHeader, CardTitle } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";
import "../../styles/sales-crm/contacts.css";
import { useState, useEffect, useMemo } from "react";

import {
  ContactsHeader,
  ContactsKPICards,
  ContactsFilterToolbar,
  ContactsTable,
  ContactDetailDrawer,
  ContactsLoadingState,
  ContactsErrorState,
} from "../../components/admin/layout/Admin_Contacts_Components.jsx";

import {
  getContactsData,
  createContact,
  updateContact,
  archiveContact,
} from "../../services/sales_crm/contacts";

import CreateDealModal from "../../components/admin/modals/CreateDealModal.jsx";


const emptyContactForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "lead",
  source: "manual",
};


const inputClass =
  "h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-blue-100";

export default function AdminContacts() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [dealContact, setDealContact] = useState(null);

  const [contacts, setContacts] = useState([]);
  const [sources, setSources] = useState([]);
  const [types, setTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyContactForm);

  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    status: "all",
    source: "all",
    sort: "name_asc",
  });

  // AI State
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [scoredContacts, setScoredContacts] = useState({});

  // AI Functions
  async function generateAIInsights() {
    setAiLoading(true);
    try {
      const insights = await aiModules.generateBusinessInsights({
        contacts: filteredContacts,
        module: 'contacts'
      }, 'current_month');
      setAiInsights(insights);
    } catch (err) {
      console.error("AI insights error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function scoreAllContacts() {
    setAiLoading(true);
    try {
      const scores = {};
      for (const contact of filteredContacts.slice(0, 5)) {
        const score = await aiModules.scoreLead(contact);
        scores[contact.id] = score;
      }
      setScoredContacts(scores);
    } catch (err) {
      console.error("Contact scoring error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function draftContactEmail(contact) {
    setAiLoading(true);
    try {
      const email = await aiModules.draftOutreachEmail(contact, 'introduction');
      alert(`AI Drafted Email:\n\nSubject: ${email.subject}\n\n${email.body}`);
    } catch (err) {
      console.error("Email drafting error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      setLoading(true);
      setError("");

      const data = await getContactsData();

      setContacts(data.contacts || []);
      setSources(data.sources || []);
      setTypes(data.types || []);
      setStatuses(data.statuses || []);
    } catch (err) {
      console.error("Contacts load error:", err);
      setError(err.message || "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setForm(emptyContactForm);
    setModalMode("create");
  }

  function openEditModal(contact) {
    setSelectedContact(null);
    setForm({
      name: contact.name || "",
      company: contact.company || "",
      email: contact.email || "",
      phone: contact.phone || "",
      status: contact.status || "lead",
      source: contact.source || "manual",
    });
    setModalMode({ type: "edit", id: contact.id });
  }

  function openCreateDealModal(contact) {
    setSelectedContact(null);
    setDealContact(contact);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (modalMode === "create") {
        await createContact(form);
      } else {
        await updateContact(modalMode.id, form);
      }

      setModalMode(null);
      setForm(emptyContactForm);
      await loadContacts();
    } catch (err) {
      alert(err.message || "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveContact(contact) {
    const confirmed = window.confirm(`Archive "${contact.name}"?`);
    if (!confirmed) return;

    try {
      await archiveContact(contact.id);
      setSelectedContact(null);
      await loadContacts();
    } catch (err) {
      alert(err.message || "Failed to archive contact.");
    }
  }

  const filteredContacts = useMemo(() => {
    return contacts
      .filter((contact) => {
        const search = filters.search.trim().toLowerCase();

        const matchesSearch =
          !search ||
          (contact.name || "").toLowerCase().includes(search) ||
          (contact.email || "").toLowerCase().includes(search) ||
          (contact.company || "").toLowerCase().includes(search);

        return (
          matchesSearch &&
          (filters.type === "all" || contact.type === filters.type) &&
          (filters.status === "all" || contact.status === filters.status) &&
          (filters.source === "all" || contact.source === filters.source)
        );
      })
      .sort((a, b) => {
        const nameA = a.name || "";
        const nameB = b.name || "";

        if (filters.sort === "name_desc") return nameB.localeCompare(nameA);
        if (filters.sort === "recent") {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        if (filters.sort === "activity") {
          return (
            new Date(b.last_activity_at || 0) -
            new Date(a.last_activity_at || 0)
          );
        }

        return nameA.localeCompare(nameB);
      });
  }, [contacts, filters]);

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <ContactsHeader onAddContact={openCreateModal} />

      {/* AI Contact Intelligence */}
      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] shadow-lg">
        {/* Animated top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--brand-cyan)] via-[var(--brand-gold)] to-[var(--brand-cyan)] bg-[length:200%_100%]" style={{ animation: "gradientShift 3s linear infinite" }}></div>

        {/* Header */}
        <div
          className="relative overflow-hidden px-5 py-4"
          style={{ background: "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))" }}
        >
          {/* Blob 1 — gold, top-right */}
          <div className="ai-blob-1 absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--brand-gold), transparent)" }}></div>
          {/* Blob 2 — cyan, bottom-center */}
          <div className="ai-blob-2 absolute -bottom-4 left-1/3 h-16 w-16 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent)" }}></div>
          {/* Blob 3 — gold, bottom-left */}
          <div className="ai-blob-3 absolute -bottom-5 left-0 h-20 w-20 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-gold), transparent)" }}></div>
          {/* Blob 4 — cyan, top-center-left */}
          <div className="ai-blob-4 absolute -top-4 left-1/4 h-14 w-14 rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent)" }}></div>
          {/* Blob 5 — gold-cyan blend, center-right */}
          <div className="ai-blob-5 absolute top-1/2 right-1/4 h-10 w-10 -translate-y-1/2 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-gold), var(--brand-cyan), transparent)" }}></div>
          {/* Blob 6 — cyan, top-right-center */}
          <div className="ai-blob-6 absolute -top-2 right-1/3 h-12 w-12 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent)" }}></div>
          {/* Blob 7 — gold, center-left */}
          <div className="ai-blob-7 absolute top-1/2 left-8 h-8 w-8 -translate-y-1/2 rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--brand-gold), transparent)" }}></div>
          {/* Blob 8 — cyan-gold, bottom-right */}
          <div className="ai-blob-8 absolute -bottom-3 right-8 h-14 w-14 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-cyan), var(--brand-gold), transparent)" }}></div>

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
                style={{ background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-gold))" }}
              >
                <Brain className="h-5 w-5 text-white animate-pulse" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }} />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  AI Contact Intelligence
                </h2>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--brand-cyan)" }}></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--brand-cyan)" }}></span>
                  </span>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Powered by advanced machine learning</p>
                </div>
              </div>
            </div>
            <div
              className="hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold sm:flex"
              style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}
            >
              <Sparkles className="h-3 w-3" />
              AI Ready
            </div>
          </div>
        </div>

        {/* Action Buttons — compact horizontal row */}
        <div className="border-b px-5 py-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              onClick={generateAIInsights}
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "var(--brand-cyan-border)", background: "var(--brand-cyan-soft)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(8,145,178,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--brand-cyan-soft)"}
            >
              {aiLoading
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: "var(--brand-cyan)" }}></div>
                : <Sparkles className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--brand-cyan)" }} />
              }
              <span className="font-semibold" style={{ color: "var(--brand-cyan)" }}>Generate Insights</span>
            </button>

            <button
              onClick={scoreAllContacts}
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--brand-gold-soft)"}
            >
              {aiLoading
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: "var(--brand-gold)" }}></div>
                : <Target className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--brand-gold)" }} />
              }
              <span className="font-semibold" style={{ color: "var(--brand-gold)" }}>Score Contacts</span>
            </button>

            <button
              onClick={() => draftContactEmail(filteredContacts[0])}
              disabled={!filteredContacts.length || aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "var(--border-color)", background: "var(--hover-bg)" }}
              onMouseEnter={e => { if (filteredContacts.length && !aiLoading) { e.currentTarget.style.borderColor = "var(--brand-gold-border)"; e.currentTarget.style.background = "var(--brand-gold-soft)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.background = "var(--hover-bg)"; }}
            >
              <Zap className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--text-secondary)" }} />
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Draft AI Email</span>
            </button>
          </div>
        </div>

        {/* AI Insights Results */}
        {aiInsights && (
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-color)", background: "linear-gradient(to bottom, var(--brand-cyan-soft), transparent)" }}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--brand-cyan-soft)", color: "var(--brand-cyan)" }}>
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Strategic Summary</h3>
              <div className="ml-auto flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium" style={{ borderColor: "var(--brand-cyan-border)", color: "var(--brand-cyan)", background: "var(--brand-cyan-soft)" }}>
                <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--brand-cyan)" }}></div>
                Live
              </div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{aiInsights.executiveSummary}</p>
              {aiInsights.keyFindings?.slice(0, 3).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiInsights.keyFindings.slice(0, 3).map((finding, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105"
                      style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}
                    >
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--brand-gold)" }}></div>
                      {finding}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lead Scoring Results */}
        {Object.keys(scoredContacts).length > 0 && (
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}>
                <Target className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Lead Scoring Results</h3>
              <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {Object.keys(scoredContacts).length} scored
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(scoredContacts).map(([contactId, score]) => {
                const contact = filteredContacts.find(c => c.id === contactId);
                const isHigh = score.score > 70;
                const isMed = score.score > 40;
                const dotColor = isHigh ? "var(--success)" : isMed ? "var(--brand-gold)" : "var(--text-muted)";
                
                // Add cyan to the medium/warm score gradient for that "wow" factor
                const scoreGradient = isHigh
                  ? "linear-gradient(135deg, #16a34a, #22c55e)"
                  : isMed
                    ? "linear-gradient(135deg, var(--brand-cyan), var(--brand-gold))"
                    : "linear-gradient(135deg, #475569, #94a3b8)";
                
                const tierBg = isHigh ? "var(--success-soft)" : isMed ? "var(--brand-gold-soft)" : "var(--hover-bg)";
                const tierColor = isHigh ? "var(--success)" : isMed ? "var(--brand-gold)" : "var(--text-muted)";

                // Unique ID for the SVG gradient
                const gradId = `scoreGrad-${contactId}`;

                return (
                  <div
                    key={contactId}
                    className="group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = dotColor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
                  >
                    <div className="h-0.5 w-full" style={{ background: scoreGradient }}></div>
                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{contact?.name}</p>
                          <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{contact?.company || "No Company"}</p>
                        </div>
                        {/* Compact score ring */}
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--hover-bg)" }}>
                          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="17" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                            <circle
                              cx="22" cy="22" r="17" fill="none"
                              stroke={`url(#${gradId})`} strokeWidth="3"
                              strokeDasharray={`${(score.score / 100) * 106.8} 106.8`}
                              strokeLinecap="round"
                              style={{ transition: "stroke-dasharray 1s ease-out" }}
                            />
                            <defs>
                              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={isHigh ? "#16a34a" : isMed ? "var(--brand-cyan)" : "#475569"} />
                                <stop offset="100%" stopColor={isHigh ? "#22c55e" : isMed ? "var(--brand-gold)" : "#94a3b8"} />
                              </linearGradient>
                            </defs>
                          </svg>
                          <span className="text-xs font-bold" style={{ color: dotColor }}>{score.score}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: tierBg, color: tierColor }}>{score.tier}</span>
                          <span className="text-xs font-semibold" style={{ color: dotColor }}>{score.score}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--border-color)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${score.score}%`, background: scoreGradient, boxShadow: `0 0 6px ${dotColor}50` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!aiInsights && Object.keys(scoredContacts).length === 0 && (
          <div className="flex items-center gap-4 px-5 py-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))", border: "1px solid var(--brand-gold-border)" }}
            >
              <Brain className="h-5 w-5 animate-pulse" style={{ color: "var(--brand-gold)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ready to Analyze</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use the actions above to generate insights, score leads, or draft outreach emails.</p>
            </div>
          </div>
        )}
      </div>

      {loading && <ContactsLoadingState />}

      {!loading && error && (
        <ContactsErrorState message={error} onRetry={loadContacts} />
      )}

      {!loading && !error && (
        <>
          <ContactsKPICards contacts={contacts} />

          <div className="space-y-4">
            <ContactsFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              sources={sources}
              types={types}
              statuses={statuses}
            />

            <ContactsTable
              contacts={filteredContacts}
              onRowClick={setSelectedContact}
              onEditContact={openEditModal}
              onCreateDeal={openCreateDealModal}
            />
          </div>
        </>
      )}

      {selectedContact && (
        <ContactDetailDrawer
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onEdit={openEditModal}
          onCreateDeal={openCreateDealModal}
          onArchive={handleArchiveContact}
        />
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
          >
            <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {modalMode === "create" ? "Create Contact" : "Edit Contact"}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Maintain customer and company information.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Juan Dela Cruz"
                />
              </Field>

              <Field label="Company">
                <input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  className={inputClass}
                  placeholder="TechCorp PH"
                />
              </Field>

              <Field label="Email">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  placeholder="name@company.com"
                />
              </Field>

              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  placeholder="+63 912 345 6789"
                />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className={inputClass}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Source">
                <select
                  value={form.source}
                  onChange={(e) =>
                    setForm({ ...form, source: e.target.value })
                  }
                  className={inputClass}
                >
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {dealContact && (
        <CreateDealModal
          contact={dealContact}
          onClose={() => setDealContact(null)}
          onSuccess={async () => {
            setDealContact(null);
            await loadContacts();
          }}
        />
      )}

      {/* AI Assistant Widget */}

    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}