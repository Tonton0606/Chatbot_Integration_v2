import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../config/supabaseClient";

import {
  ClientContactsHeader,
  ClientContactsKPICards,
  ClientContactsFilterToolbar,
  ClientContactsTable,
  ClientContactDetailDrawer,
  ClientContactsLoadingState,
  ClientContactsErrorState,
} from "../../../components/client/layout/Client_Contacts_Components.jsx";

import {
  getClientContactsData,
  createClientContact,
  updateClientContact,
  archiveClientContact,
} from "../../../services/clientContacts";

import { createClientDeal } from "../../../services/clientDeals";
import { createClientLead } from "../../../services/clientLeads";
import ClientDealModal from "../../../components/client/modals/ClientDealModal.jsx";
import ClientLeadModal from "../../../components/client/modals/ClientLeadModal.jsx";

const emptyContactForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "lead",
  source: "manual",
};

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

async function resolveWorkspaceId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = authData?.user?.id;
  if (!userId) throw new Error("User session not found.");

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.workspace_id) throw new Error("No workspace assigned to this user.");

  return data.workspace_id;
}

export default function ClientContacts() {
  const [workspaceId, setWorkspaceId] = useState(null);

  const [selectedContact, setSelectedContact] = useState(null);
  const [dealContact, setDealContact] = useState(null);
  const [leadContact, setLeadContact] = useState(null);

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

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      setLoading(true);
      setError("");

      const activeWorkspaceId = workspaceId || (await resolveWorkspaceId());
      setWorkspaceId(activeWorkspaceId);

      const data = await getClientContactsData(activeWorkspaceId);

      setContacts(data.contacts || []);
      setSources(data.sources || []);
      setTypes(data.types || []);
      setStatuses(data.statuses || []);
    } catch (err) {
      console.error("Client contacts load error:", err);
      setError(err.message || "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setForm(emptyContactForm);
    setSelectedContact(null);
    setModalMode("create");
  }

  function openEditModal(contact) {
    setSelectedContact(null);
    setForm({
      name: contact.name || "",
      company: contact.company || "",
      email: contact.email || "",
      phone: contact.phone || "",
      status: contact.status === "archived" ? "lead" : contact.status || "lead",
      source: contact.source || "manual",
    });
    setModalMode({ type: "edit", id: contact.id });
  }

  function openCreateDealModal(contact) {
    setSelectedContact(null);
    setLeadContact(null);
    setDealContact(contact);
  }

  function openCreateLeadModal(contact) {
    setSelectedContact(null);
    setDealContact(null);
    setLeadContact(contact);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      if (!workspaceId) throw new Error("Workspace ID is missing.");

      if (modalMode === "create") {
        await createClientContact(workspaceId, form);
      } else {
        await updateClientContact(modalMode.id, workspaceId, form);
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
    const confirmed = window.confirm(
      `Archive "${contact.name}"?\n\nArchived contacts disappear from active CRM, dashboards, and analytics but remain recoverable.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      if (!workspaceId) throw new Error("Workspace ID is missing.");

      await archiveClientContact(contact.id, workspaceId);

      setSelectedContact(null);
      await loadContacts();
    } catch (err) {
      alert(err.message || "Failed to archive contact.");
    } finally {
      setSaving(false);
    }
  }

  const filteredContacts = useMemo(() => {
    return contacts
      .filter((contact) => {
        if (contact.archived_at) return false;

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
      <ClientContactsHeader onAddContact={openCreateModal} />

      {loading && <ClientContactsLoadingState />}

      {!loading && error && (
        <ClientContactsErrorState message={error} onRetry={loadContacts} />
      )}

      {!loading && !error && (
        <>
          <ClientContactsKPICards contacts={contacts} />

          <div className="min-w-0 space-y-4">
            <ClientContactsFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              sources={sources}
              types={types}
              statuses={statuses}
            />

            <ClientContactsTable
              contacts={filteredContacts}
              onRowClick={setSelectedContact}
            />
          </div>
        </>
      )}

      {selectedContact && (
        <ClientContactDetailDrawer
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onEdit={openEditModal}
          onCreateLead={openCreateLeadModal}
          onCreateDeal={openCreateDealModal}
          onArchive={handleArchiveContact}
        />
      )}

      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setModalMode(null)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Sales & CRM
                </p>

                <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                  {modalMode === "create" ? "Create Contact" : "Edit Contact"}
                </h3>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Maintain workspace contact and company information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Juan Dela Cruz"
                />
              </Field>

              <Field label="Company">
                <input
                  value={form.company}
                  onChange={(event) =>
                    setForm({ ...form, company: event.target.value })
                  }
                  className={inputClass}
                  placeholder="TechCorp PH"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  className={inputClass}
                  placeholder="name@company.com"
                />
              </Field>

              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  className={inputClass}
                  placeholder="+63 912 345 6789"
                />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
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
                  onChange={(event) =>
                    setForm({ ...form, source: event.target.value })
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

            <ModalActions
              saving={saving}
              onCancel={() => setModalMode(null)}
              saveLabel="Save Contact"
            />
          </form>
        </div>
      )}

      {leadContact && (
        <ClientLeadModal
          lead={{
            contact_mode: "existing",
            contact_id: leadContact.id,
            title: `${leadContact.company || leadContact.name || "New"} Lead`,
            source: leadContact.source || "manual",
            status: "new",
            estimated_value: "",
            probability: 10,
            assignment_type: "self",
            notes: "",
          }}
          lookups={{
            contacts,
            employees: [],
          }}
          saving={saving}
          onClose={() => setLeadContact(null)}
          onSubmit={async (payload) => {
            try {
              setSaving(true);

              if (!workspaceId) throw new Error("Workspace ID is missing.");
              if (!leadContact?.id) throw new Error("Contact is required.");

              await createClientLead(workspaceId, {
                ...payload,
                contact_mode: "existing",
                contact_id: leadContact.id,
              });

              setLeadContact(null);
              await loadContacts();
            } catch (err) {
              alert(err.message || "Failed to create lead.");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}

      {dealContact && (
        <ClientDealModal
          deal={{
            title: `${dealContact.company || dealContact.name || "New"} Deal`,
            contact_id: dealContact.id,
            source: dealContact.source || "manual",
            assignment_type: "self",
          }}
          lookups={{
            contacts,
            employees: [],
          }}
          saving={saving}
          onClose={() => setDealContact(null)}
          onSubmit={async (payload) => {
            try {
              setSaving(true);

              if (!workspaceId) throw new Error("Workspace ID is missing.");
              if (!dealContact?.id) throw new Error("Contact is required.");

              await createClientDeal(workspaceId, {
                ...payload,
                contact_id: dealContact.id,
              });

              setDealContact(null);
              await loadContacts();
            } catch (err) {
              alert(err.message || "Failed to create deal.");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
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

function ModalActions({ saving, onCancel, saveLabel }) {
  return (
    <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}
