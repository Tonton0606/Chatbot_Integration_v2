import { Mail, Send, BarChart3, Eye, Edit2, Trash2, X } from "lucide-react";
import { StatCard, Button, Badge, Card, CardContent } from "../ui";

const fieldClass =
  "w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-gold)]";

const labelClass = "mb-1 block text-sm font-medium text-[var(--text-primary)]";

export function CampaignStats({ totalCampaigns, totalSent, openRate, clickRate }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total Campaigns" value={totalCampaigns} icon={Mail} color="bg-[var(--brand-cyan)]" />
      <StatCard title="Emails Sent" value={totalSent} icon={Send} color="bg-[var(--success)]" />
      <StatCard title="Open Rate" value={openRate} icon={BarChart3} color="bg-[var(--brand-gold)]" />
      <StatCard title="Click Rate" value={clickRate} icon={BarChart3} color="bg-[var(--brand-cyan)]" />
    </div>
  );
}

export function CampaignList({ campaigns, loading, sendingId, onPreview, onSend, onEdit, onDelete }) {
  if (loading) return <p className="py-8 text-center text-[var(--text-muted)]">Loading campaigns...</p>;

  if (!campaigns.length) {
    return <p className="py-8 text-center text-[var(--text-muted)]">No campaigns yet. Create one to get started.</p>;
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="flex flex-col gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 transition-colors hover:bg-[var(--hover-bg)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">{campaign.title}</h4>
            <p className="text-sm text-[var(--text-muted)]">{campaign.subject}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant={campaign.status === "sent" ? "success" : campaign.status === "partial" ? "warning" : "default"}
                className={campaign.status === "partial" ? "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]" : ""}
              >
                {campaign.status}
              </Badge>

              <Badge variant="outline" className="text-xs">
                {campaign.email_type === "html" ? "HTML" : "Text"}
              </Badge>

              <span className="text-xs text-[var(--text-muted)]">{campaign.total_leads || 0} leads</span>

              {campaign.sent_count !== undefined && (
                <span className="text-xs text-[var(--text-muted)]">{campaign.sent_count} sent</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" icon={Eye} onClick={() => onPreview(campaign)}>
              Preview
            </Button>

            {campaign.status !== "sent" && (
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={() => onSend(campaign)}
                disabled={sendingId === campaign.id}
                className="bg-[var(--brand-gold)] text-[#050816] hover:bg-[var(--brand-gold-hover)]"
              >
                {sendingId === campaign.id ? "Sending..." : "Send"}
              </Button>
            )}

            <Button variant="ghost" size="sm" icon={Edit2} onClick={() => onEdit(campaign)}>
              Edit
            </Button>

            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onDelete(campaign.id)} className="text-[var(--danger)]">
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CampaignDeleteModal({ open, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="mx-4 w-full max-w-md border-[var(--border-color)] bg-[var(--bg-card)]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Confirm Delete</h3>
            <button onClick={onClose} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to delete this email campaign? This action cannot be undone.
          </p>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} className="flex-1 bg-[var(--danger)] text-white hover:opacity-90">
              Delete Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CampaignPreviewModal({ campaign, onClose, safeHtmlPreview }) {
  if (!campaign) return null;

  const statusColors = {
    sent: "text-[var(--success)]",
    failed: "text-[var(--danger)]",
    pending: "text-[var(--text-muted)]",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <Card className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl border-[var(--border-color)] bg-[var(--bg-card)] sm:mx-4 sm:max-w-lg sm:rounded-2xl">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[var(--border-color)]" />
        </div>

        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-snug text-[var(--text-primary)] sm:text-lg">{campaign.title}</h3>
            <button onClick={onClose} className="mt-0.5 flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="mb-1 text-xs font-medium text-[var(--text-muted)] sm:text-sm">Subject</h4>
              <p className="text-sm text-[var(--text-primary)] sm:text-base">{campaign.subject}</p>
            </div>

            <div>
              <h4 className="mb-1 text-xs font-medium text-[var(--text-muted)] sm:text-sm">
                Body ({campaign.email_type === "html" ? "HTML" : "Plain Text"})
              </h4>

              {campaign.email_type === "html" ? (
                <div
                  className="max-h-40 overflow-auto rounded-lg bg-[var(--hover-bg)] p-3 text-sm text-[var(--text-primary)]"
                  dangerouslySetInnerHTML={{ __html: safeHtmlPreview(campaign.body) }}
                />
              ) : (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--hover-bg)] p-3 text-xs text-[var(--text-primary)] sm:text-sm">
                  {campaign.body}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)] sm:gap-4 sm:text-sm">
              {[
                { label: "Total", value: campaign.total_leads || 0 },
                { label: "Sent", value: campaign.sent_count || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-full bg-[var(--hover-bg)] px-2.5 py-1">
                  <strong>{label}:</strong> {value}
                </div>
              ))}

              {campaign.status === "partial" && (
                <div className="rounded-full bg-[var(--hover-bg)] px-2.5 py-1">
                  <strong>Pending:</strong>{" "}
                  {campaign.leads?.filter((lead) => lead.status === "pending" || !lead.status).length || 0}
                </div>
              )}
            </div>

            {campaign.leads?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-[var(--text-muted)] sm:text-sm">Lead Status</h4>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg bg-[var(--hover-bg)] p-2 sm:max-h-40">
                  {campaign.leads.map((lead, index) => {
                    const email = typeof lead === "string" ? lead : lead.email;
                    const status = typeof lead === "string" ? "pending" : lead.status || "pending";

                    return (
                      <div key={index} className="flex items-center justify-between gap-2 py-0.5 text-xs sm:text-sm">
                        <span className="truncate text-[var(--text-primary)]">{email}</span>
                        <span className={`flex-shrink-0 capitalize ${statusColors[status] || statusColors.pending}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <div className="flex justify-end border-t border-[var(--border-color)] px-4 py-3 sm:px-6 sm:py-4">
          <Button className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function CampaignFormModal({
  open,
  editingCampaign,
  formData,
  setFormData,
  rawLeads,
  setRawLeads,
  parsedLeads,
  leadBatches,
  emailTemplates,
  sanitizeHtml,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto border-[var(--border-color)] bg-[var(--bg-card)]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {editingCampaign ? "Edit Campaign" : "Create Campaign"}
            </h3>
            <button onClick={onClose} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {[
              { label: "Campaign Name *", key: "title" },
              { label: "Email Subject *", key: "subject" },
              { label: "Lead Batch", key: "lead_batch_id", type: "select" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>

                {type === "select" ? (
                  <select value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className={fieldClass}>
                    <option value="">Select a lead batch</option>
                    {leadBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.lead_ids?.length || 0} leads)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    required={key === "title" || key === "subject"}
                    className={fieldClass}
                  />
                )}
              </div>
            ))}

            <div>
              <label className={labelClass}>Email Type</label>
              <select value={formData.email_type} onChange={(e) => setFormData({ ...formData, email_type: e.target.value })} className={fieldClass}>
                <option value="text">Plain Text</option>
                <option value="html">HTML</option>
              </select>
            </div>

            {formData.email_type === "html" && (
              <div>
                <label className={labelClass}>HTML Templates</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(emailTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const safeBusinessName = sanitizeHtml(formData.business_name || "Your Business");
                        const safeSubject = sanitizeHtml(formData.subject || "Your Subject");
                        const safeBody = sanitizeHtml("Enter your message here...");

                        const html = template.html
                          .replace(/\{\{BUSINESS_NAME\}\}/g, safeBusinessName)
                          .replace(/\{\{SUBJECT\}\}/g, safeSubject)
                          .replace(/\{\{BODY\}\}/g, safeBody);

                        setFormData({ ...formData, body: html });
                      }}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--hover-bg)]"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Email Body *</label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={formData.email_type === "html" ? 10 : 5}
                required
                className={fieldClass}
              />
            </div>

            {formData.lead_batch_id ? (
              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">Audience selected from lead batch</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {leadBatches.find((batch) => batch.id === formData.lead_batch_id)?.lead_ids?.length || 0} leads will be included from this batch.
                </p>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Manual Lead Emails *</label>
                <textarea
                  value={rawLeads}
                  onChange={(e) => setRawLeads(e.target.value)}
                  placeholder="Paste emails (comma, newline, or semicolon separated)"
                  rows={4}
                  className={fieldClass}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">{parsedLeads.length} valid leads</p>
              </div>
            )}

            <div>
              <label className={labelClass}>Business Name</label>
              <input type="text" value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} className={fieldClass} />
            </div>

            <div>
              <label className={labelClass}>Batch Size</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.batch_size}
                onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                className={fieldClass}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-[#050816] transition-all hover:bg-[var(--brand-gold-hover)]"
              >
                {editingCampaign ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
