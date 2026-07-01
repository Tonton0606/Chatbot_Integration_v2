import { useMemo, useState } from "react";
import { Copy, Mail, Plus, Send, X, XCircle } from "lucide-react";

function formatDateTime(date) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function statusClass(status) {
  if (status === "pending") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  }

  if (status === "accepted") {
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  if (status === "expired") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function getInviteLinkRows(latestInvitation) {
  if (!latestInvitation) return [];

  if (Array.isArray(latestInvitation.invitations)) {
    return latestInvitation.invitations
      .map((item) => ({
        email: item.invitation?.email || item.email || "",
        role: item.invitation?.role || item.role || "member",
        inviteUrl: item.inviteUrl || "",
      }))
      .filter((item) => item.inviteUrl);
  }

  if (latestInvitation.inviteUrl) {
    return [
      {
        email:
          latestInvitation.invitation?.email ||
          latestInvitation.email ||
          "",
        role:
          latestInvitation.invitation?.role ||
          latestInvitation.role ||
          "member",
        inviteUrl: latestInvitation.inviteUrl,
      },
    ];
  }

  return [];
}

function formatInviteRowsForCopy(rows = []) {
  return rows
    .map((row) => {
      const emailLine = row.email ? `Email: ${row.email}` : "Email: —";
      const roleLine = row.role ? `Role: ${row.role}` : "Role: member";

      return `${emailLine}\n${roleLine}\nInvite Link: ${row.inviteUrl}`;
    })
    .join("\n\n");
}

function parseEmailsFromValue(value = "") {
  return String(value)
    .split(/[\n,;]+/)
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export default function WorkspaceInvitationsPanel({
  form,
  invitations = [],
  latestInvitation,
  saving,
  onFormChange,
  onSubmit,
  onCancelInvitation,
  onCopyInvitation,
}) {
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  const recipients = useMemo(() => parseEmailsFromValue(form.email), [form.email]);
  const latestInviteLinks = getInviteLinkRows(latestInvitation);

  function syncRecipients(nextRecipients) {
    onFormChange("email", nextRecipients.join("\n"));
  }

  function addRecipient(rawEmail = emailInput) {
    const normalized = normalizeEmail(rawEmail);

    if (!normalized) {
      setEmailError("");
      return false;
    }

    if (!isValidEmail(normalized)) {
      setEmailError("Enter a valid email address.");
      return false;
    }

    if (recipients.includes(normalized)) {
      setEmailError("This email is already added.");
      return false;
    }

    syncRecipients([...recipients, normalized]);
    setEmailInput("");
    setEmailError("");
    return true;
  }

  function removeRecipient(email) {
    syncRecipients(recipients.filter((item) => item !== email));
    setEmailError("");
  }

  function handleEmailInputChange(event) {
    const value = event.target.value;

    if (/[\n,;]/.test(value)) {
      const parsedEmails = parseEmailsFromValue(value);
      const nextRecipients = [...recipients];

      for (const email of parsedEmails) {
        if (isValidEmail(email) && !nextRecipients.includes(email)) {
          nextRecipients.push(email);
        }
      }

      syncRecipients(nextRecipients);
      setEmailInput("");
      setEmailError("");
      return;
    }

    setEmailInput(value);
    setEmailError("");
  }

  function handleEmailKeyDown(event) {
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault();
      addRecipient();
    }
  }

  function handleEmailBlur() {
    if (emailInput.trim()) {
      addRecipient();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (emailInput.trim()) {
      const added = addRecipient();

      if (added) {
        setEmailError("Email added. Click Create Invitations again.");
      }

      return;
    }

    if (!recipients.length) {
      setEmailError("Add at least one recipient.");
      return;
    }

    onSubmit(event);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
            <Mail className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-[var(--text-primary)]">
              Invite Workspace Members
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Invite links are email-specific, single-use, and expire in 30 minutes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Email Address
            </label>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={emailInput}
                onChange={handleEmailInputChange}
                onKeyDown={handleEmailKeyDown}
                onBlur={handleEmailBlur}
                placeholder="employee@company.com"
                className="h-11 min-w-0 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)]"
              />

              <button
                type="button"
                onClick={() => addRecipient()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--brand-gold-border)] hover:text-[var(--brand-gold)]"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {emailError ? (
              <p className="mt-2 text-xs font-medium text-[var(--danger)]">
                {emailError}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Press Enter or Add after each email. You can also paste comma-separated emails.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Recipients
              </label>

              {!!recipients.length && (
                <button
                  type="button"
                  onClick={() => syncRecipients([])}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="mt-2 min-h-[74px] rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
              {recipients.length ? (
                <div className="flex flex-wrap gap-2">
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-gold)]"
                    >
                      <span className="max-w-[260px] truncate">{email}</span>

                      <button
                        type="button"
                        onClick={() => removeRecipient(email)}
                        className="rounded-full p-0.5 hover:bg-black/10"
                        aria-label={`Remove ${email}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex h-12 items-center text-sm text-[var(--text-muted)]">
                  No recipients added yet.
                </div>
              )}
            </div>

            {!!recipients.length && (
              <p className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">
                {recipients.length} recipient{recipients.length > 1 ? "s" : ""} ready.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Role
            </label>

            <select
              value={form.role}
              onChange={(event) => onFormChange("role", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
            >
              <option value="member">Member</option>
              <option value="admin">Workspace Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !recipients.length}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {saving
              ? "Creating invitations..."
              : `Create ${recipients.length || ""} Invitation${
                  recipients.length === 1 ? "" : "s"
                }`}
          </button>
        </form>

        {!!latestInviteLinks.length && (
          <div className="mt-5 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-gold)]">
                  Latest Invite Link{latestInviteLinks.length > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Copy now. Raw invite links are only shown after creation.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onCopyInvitation(formatInviteRowsForCopy(latestInviteLinks))
                }
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-3 text-xs font-bold text-white hover:bg-[var(--brand-gold-hover)]"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy All
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {latestInviteLinks.map((row, index) => (
                <div
                  key={`${row.inviteUrl}-${index}`}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                        {row.email || "Unknown recipient"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Role: {row.role || "member"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onCopyInvitation(
                          formatInviteRowsForCopy([row])
                        )
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>

                  <input
                    readOnly
                    value={row.inviteUrl}
                    className="h-10 w-full min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 text-xs text-[var(--text-secondary)] outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] px-5 py-4">
          <h2 className="font-bold text-[var(--text-primary)]">
            Invitations
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Pending and recent workspace invitations.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {invitations.map((invite) => (
                <tr key={invite.id} className="hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {invite.email}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Invited {formatDateTime(invite.created_at)}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {invite.role}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                        invite.status
                      )}`}
                    >
                      {invite.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatDateTime(invite.expires_at)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {invite.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => onCancelInvitation(invite)}
                        className="rounded-xl border border-red-500/20 p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        title="Cancel invitation"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!invitations.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[var(--text-muted)]"
                  >
                    No invitations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
