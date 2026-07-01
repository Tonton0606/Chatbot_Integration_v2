import { Rocket } from "lucide-react";

import {
  Field,
  SaveButton,
  SectionHeader,
  textareaClass,
} from "../shared";

import { CustomDomainPanel } from "./publish/PublishDomainPanels";
import {
  PublicUrlPanel,
  PublishStatusPanel,
} from "./publish/PublishStatusPanels";

export default function LandingPublishTab({
  form,
  saving,
  publicUrl,
  domainStatus,
  domainCheckResult,
  checkingDomain = false,
  releasingDomain = false,
  onChange,
  onSave,
  onPublish,
  onUnpublish,
  onCopyUrl,
  onCheckDomain,
  onContinueDomain,
  onReleaseDomain,
}) {
  const isPublished = form.published === true || form.status === "published";

  const hasConnectedDomain =
    Boolean(form.custom_domain) &&
    domainStatus === "verified" &&
    !domainCheckResult;

  function submit(event) {
    event.preventDefault();
    onSave();
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <SectionHeader
        icon={Rocket}
        title="Publish & Visibility"
        description="Control whether visitors can access your landing page and manage domains."
      />

      <PublishStatusPanel
        isPublished={isPublished}
        saving={saving}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />

      <PublicUrlPanel publicUrl={publicUrl} onCopyUrl={onCopyUrl} />

      <CustomDomainPanel
        form={form}
        publicUrl={publicUrl}
        domainStatus={domainStatus}
        domainCheckResult={domainCheckResult}
        checkingDomain={checkingDomain}
        releasingDomain={releasingDomain}
        hasConnectedDomain={hasConnectedDomain}
        onChange={onChange}
        onCheckDomain={onCheckDomain}
        onContinueDomain={onContinueDomain}
        onReleaseDomain={onReleaseDomain}
      />

      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
        <h3 className="mb-4 font-black text-[var(--text-primary)]">
          SEO Settings
        </h3>

        <div className="grid gap-4">
          <Field label="SEO Title">
            <input
              value={form.seo_title || ""}
              onChange={(event) => onChange("seo_title", event.target.value)}
              className="erp-input"
              placeholder="Best Insurance Services in the Philippines"
            />
          </Field>

          <Field label="SEO Description">
            <textarea
              value={form.seo_description || ""}
              onChange={(event) =>
                onChange("seo_description", event.target.value)
              }
              className={textareaClass}
              placeholder="Short description shown in Google search results."
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
}
