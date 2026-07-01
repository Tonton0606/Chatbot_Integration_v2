import { useState } from "react";
import {
  AlertCircle,
  Archive,
  Building2,
  Eye,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function contactStatusClass(status) {
  if (status === "customer") return "bg-[var(--success-soft)] text-[var(--success)] border-green-500/20";
  if (status === "prospect") return "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]";
  if (status === "lead") return "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border-[var(--brand-gold-border)]";
  if (status === "archived") return "bg-[var(--hover-bg)] text-[var(--text-secondary)] border-[var(--border-color)]";
  return "bg-[var(--hover-bg)] text-[var(--text-secondary)] border-[var(--border-color)]";
}

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const iconBoxClass =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

const primaryButtonClass =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#050816] shadow-sm transition hover:bg-[var(--brand-gold-hover)]";

const secondaryButtonClass =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]";

function Avatar({ name, size = "h-9 w-9" }) {
  const initials = String(name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-gold)] text-xs font-bold text-white`}
    >
      {initials}
    </div>
  );
}

function ContactStatusBadge({ status }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${contactStatusClass(status)}`}>
      {labelize(status)}
    </span>
  );
}

export function ClientContactsHeader({ onAddContact }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales &amp; CRM
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">Contacts</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Manage customers, companies, and lead contacts
        </p>
      </div>

      <button
        type="button"
        onClick={onAddContact}
        className={primaryButtonClass}
      >
        <Plus className="h-4 w-4" />
        Add Contact
      </button>
    </div>
  );
}

export function ClientContactsLoadingState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <p className="text-sm font-medium text-[var(--text-secondary)]">Loading contacts...</p>
    </div>
  );
}

export function ClientContactsErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">Failed to load contacts</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function contactsColorClasses(color) {
  const map = {
    gold: {
      icon: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
      bar: "bg-[var(--brand-gold)]",
    },
    cyan: {
      icon: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
      bar: "bg-[var(--brand-cyan)]",
    },
    green: {
      icon: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
      bar: "bg-[var(--success)]",
    },
    amber: {
      icon: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      bar: "bg-amber-500",
    },
  };
  return map[color] || map.gold;
}

export function ClientContactsKPICards({ contacts }) {
  const activeContacts = contacts.filter((contact) => !contact.archived_at);

  const total = activeContacts.length;
  const companies = activeContacts.filter((contact) => contact.type === "company").length;
  const customers = activeContacts.filter((contact) => contact.status === "customer").length;
  const leads = activeContacts.filter((contact) => contact.status === "lead").length;
  const prospects = activeContacts.filter((contact) => contact.status === "prospect").length;
  const recent = activeContacts.filter((contact) => {
    const created = new Date(contact.created_at || 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return created >= cutoff;
  }).length;

  const cards = [
    { label: "Total Contacts", value: total,     helper: "All contact records",     icon: Users,     color: "gold",  progress: Math.min(total * 5, 100) },
    { label: "Companies",      value: companies,  helper: "Company-type contacts",   icon: Building2, color: "cyan",  progress: total > 0 ? Math.round((companies / total) * 100) : 0 },
    { label: "Customers",      value: customers,  helper: "Active customers",        icon: UserRound, color: "green", progress: total > 0 ? Math.round((customers / total) * 100) : 0 },
    { label: "Leads",          value: leads,      helper: "Unqualified leads",       icon: Users,     color: "cyan",  progress: total > 0 ? Math.round((leads / total) * 100) : 0 },
    { label: "Prospects",      value: prospects,  helper: "Engaged prospects",       icon: Search,    color: "amber", progress: total > 0 ? Math.round((prospects / total) * 100) : 0 },
    { label: "Recently Added", value: recent,     helper: "Added in last 30 days",   icon: Plus,      color: "green", progress: Math.min(recent * 10, 100) },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = contactsColorClasses(card.color);

        return (
          <div key={card.label} className={`${panelClass} flex flex-col p-5`}>
            <div className="flex flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="min-h-[32px] text-xs font-bold uppercase leading-snug tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>
                <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)] 2xl:text-2xl">
                  {card.value}
                </h3>
                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                  {card.helper}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 h-1 w-full rounded-full bg-[var(--hover-bg)]">
              <div
                className={`h-1 rounded-full ${colors.bar}`}
                style={{ width: `${Math.min(card.progress, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientContactsFilterToolbar({
  filters,
  onFilterChange,
  sources,
  types,
  statuses,
}) {
  function update(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  const selectClass =
    "h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-secondary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 xl:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
        <input
          className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          placeholder="Search contacts, email, company..."
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
        />
      </div>

      <select className={selectClass} value={filters.type} onChange={(e) => update("type", e.target.value)}>
        <option value="all">All Types</option>
        {types.map((type) => (
          <option key={type} value={type}>{labelize(type)}</option>
        ))}
      </select>

      <select className={selectClass} value={filters.status} onChange={(e) => update("status", e.target.value)}>
        <option value="all">All Status</option>
        {statuses.map((status) => (
          <option key={status} value={status}>{labelize(status)}</option>
        ))}
      </select>

      <select className={selectClass} value={filters.source} onChange={(e) => update("source", e.target.value)}>
        <option value="all">All Sources</option>
        {sources.map((source) => (
          <option key={source} value={source}>{labelize(source)}</option>
        ))}
      </select>

      <select className={selectClass} value={filters.sort} onChange={(e) => update("sort", e.target.value)}>
        <option value="name_asc">Name A-Z</option>
        <option value="name_desc">Name Z-A</option>
        <option value="recent">Recently Added</option>
        <option value="activity">Last Activity</option>
      </select>
    </div>
  );
}

export function ClientContactsTable({ contacts, onRowClick }) {
  const activeContacts = contacts.filter((contact) => !contact.archived_at);

  if (activeContacts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
        <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No contacts found</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Add your first contact or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Related Deals</th>
              <th className="px-4 py-3">Last Activity</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-color)]">
            {activeContacts.map((contact) => (
              <tr
                key={contact.id}
                className="cursor-pointer hover:bg-[var(--hover-bg)]"
                onClick={() => onRowClick(contact)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-left">
                    <Avatar name={contact.name} />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{contact.name || "Unnamed Contact"}</p>
                      <p className="text-xs text-[var(--brand-cyan)]">{contact.email || "No email"}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">{contact.company || "—"}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{contact.phone || "—"}</td>

                <td className="px-4 py-3">
                  <span className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-cyan)]">
                    {labelize(contact.type)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <ContactStatusBadge status={contact.status} />
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">{labelize(contact.source)}</td>

                <td className="px-4 py-3">
                  <span className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-gold)]">
                    {contact.related_deals?.length || 0} deals
                  </span>
                </td>

                <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(contact.last_activity_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return <p className="text-center text-sm text-[var(--text-muted)]">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold capitalize text-[var(--brand-gold)]">{activity.type}</span>
            <span className="text-xs text-[var(--text-muted)]">{formatDate(activity.date)}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{activity.note}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{activity.user}</p>
        </div>
      ))}
    </div>
  );
}

export function ClientContactDetailDrawer({
  contact,
  onClose,
  onEdit,
  onCreateLead,
  onCreateDeal,
  onArchive,
}) {
  const [tab, setTab] = useState("profile");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <Avatar name={contact.name} size="h-12 w-12" />
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{contact.name || "Unnamed Contact"}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{contact.job_title || labelize(contact.type)}</p>
                <p className="mt-1 text-sm text-[var(--brand-cyan)]">{contact.company || "No company"}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ContactStatusBadge status={contact.status} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)]">
          {["profile", "deals", "activity", "notes"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={
                tab === item
                  ? "border-b-2 border-[var(--brand-gold)] px-5 py-3 text-sm font-semibold capitalize text-[var(--brand-gold)]"
                  : "px-5 py-3 text-sm font-medium capitalize text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }
            >
              {item}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-280px)] overflow-y-auto p-6">
          {tab === "profile" && (
            <div className="space-y-4 text-sm">
              <Info icon={Mail} label="Email" value={contact.email} />
              <Info icon={Phone} label="Phone" value={contact.phone} />
              <Info icon={Building2} label="Company" value={contact.company || "—"} />
              <Info icon={UserRound} label="Type" value={labelize(contact.type)} />
              <Info icon={Archive} label="Source" value={labelize(contact.source)} />
              <Info label="Created" value={formatDate(contact.created_at)} />
              <Info label="Last Activity" value={formatDate(contact.last_activity_at)} />
            </div>
          )}

          {tab === "deals" && (
            <div className="space-y-3">
              {contact.related_deals?.length ? (
                contact.related_deals.map((deal) => (
                  <div key={deal.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{deal.title}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
                          {formatCurrency(deal.value)}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-cyan)]">
                        {deal.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-[var(--text-muted)]">No related deals yet.</p>
              )}
            </div>
          )}

          {tab === "activity" && <ActivityTimeline activities={contact.activities} />}

          {tab === "notes" && (
            <textarea
              className="min-h-32 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
              placeholder="Write a note about this contact..."
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={() => onEdit?.(contact)}
            className={secondaryButtonClass}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onCreateLead?.(contact)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand-gold)] transition hover:opacity-80"
          >
            Create Lead
          </button>

          <button
            type="button"
            onClick={() => onCreateDeal?.(contact)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand-cyan)] transition hover:opacity-80"
          >
            <Target className="h-4 w-4" />
            Create Deal
          </button>

          {contact.status !== "archived" && !contact.archived_at && (
            <button
              type="button"
              onClick={() => onArchive?.(contact)}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:opacity-80"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2 font-medium text-[var(--text-primary)]">
        {Icon && <Icon className="h-4 w-4 text-[var(--text-muted)]" />}
        <span>{value || "—"}</span>
      </div>
    </div>
  );
}
