import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  XCircle,
} from "lucide-react";

import { Field, inputClass } from "../../shared";
import {
  DOMAIN_TARGET,
  getDomainStatusClass,
  getResultTitle,
} from "./publishTabUtils";

function Pill({ children }) {
  return (
    <span className="rounded-lg bg-[var(--bg-card)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]">
      {children}
    </span>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div className="rounded-xl bg-[var(--bg-main)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {title}
      </p>

      <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {children}
      </div>
    </div>
  );
}

export function ConnectedDomainCard({
  domain,
  publicUrl,
  releasingDomain,
  onReleaseDomain,
}) {
  if (!domain) return null;

  return (
    <div className="mt-4 rounded-2xl border border-green-500/20 bg-[var(--success-soft)] p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--success)]" />

        <div className="min-w-0 flex-1">
          <p className="font-black text-[var(--text-primary)]">
            Domain Connected
          </p>

          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            This domain is connected to this landing page and can be used by
            public visitors.
          </p>

          <div className="mt-4 grid gap-3">
            <InfoBlock title="Connected Domain">
              <p className="font-mono text-xs text-[var(--text-primary)]">
                {domain}
              </p>
            </InfoBlock>

            <InfoBlock title="Public URL">
              <p className="font-mono text-xs text-[var(--text-primary)]">
                {publicUrl || `https://${domain}`}
              </p>
            </InfoBlock>

            <InfoBlock title="Technical DNS Target">
              <p className="font-mono text-xs text-[var(--text-primary)]">
                {DOMAIN_TARGET}
              </p>

              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Keep the CNAME record pointed to this target while the domain is
                connected.
              </p>
            </InfoBlock>
          </div>

          <div className="mt-4">
            <button
              type="button"
              disabled={releasingDomain}
              onClick={onReleaseDomain}
              className="inline-flex h-10 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {releasingDomain ? "Disconnecting..." : "Disconnect Domain"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DomainCheckResult({
  result,
  onContinueDomain,
  onReleaseDomain,
}) {
  if (!result) return null;

  const isVerified = result.status === "verified";
  const isWarning = result.status === "warning";

  const Icon = isVerified ? CheckCircle2 : isWarning ? AlertTriangle : XCircle;

  const websiteTargets =
    result?.website_dns?.targets ||
    result?.dns?.website_targets ||
    result?.dns?.current_targets ||
    [];

  const emailMx = result?.email_dns?.mx || result?.dns?.mx || [];
  const reverseLookup =
    result?.website_dns?.reverse || result?.dns?.reverse || [];

  const allowContinue =
    result.safe_to_continue === true &&
    result.status === "warning" &&
    typeof onContinueDomain === "function";

  const allowRelease =
    Boolean(result.record || result.domain) &&
    typeof onReleaseDomain === "function";

  return (
    <div
      className={`mt-4 rounded-2xl border p-4 ${
        isVerified
          ? "border-green-500/20 bg-[var(--success-soft)]"
          : isWarning
            ? "border-yellow-500/20 bg-yellow-500/10"
            : "border-red-500/20 bg-[var(--danger-soft)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 h-5 w-5 ${
            isVerified
              ? "text-[var(--success)]"
              : isWarning
                ? "text-yellow-400"
                : "text-[var(--danger)]"
          }`}
        />

        <div className="min-w-0 flex-1">
          <p className="font-black text-[var(--text-primary)]">
            {getResultTitle(result)}
          </p>

          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {result.message}
          </p>

          <div className="mt-4 grid gap-3">
            <InfoBlock title="Default Exponify URL">
              <p className="font-mono text-xs text-[var(--text-primary)]">
                {result.default_exponify_url ||
                  "The default /l/slug URL remains available."}
              </p>
            </InfoBlock>

            <InfoBlock title="Custom Domain Goal">
              <p className="font-mono text-xs text-[var(--text-primary)]">
                {result.custom_domain_goal || result.domain}
              </p>
            </InfoBlock>

            {result.provider && (
              <InfoBlock title="Detected Current Provider">
                <p className="font-semibold text-[var(--text-primary)]">
                  {result.provider}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  This is inferred from DNS/reverse DNS and may not always be
                  exact.
                </p>
              </InfoBlock>
            )}

            {websiteTargets.length > 0 && (
              <InfoBlock title="Current Website DNS">
                <div className="flex flex-wrap gap-2">
                  {websiteTargets.map((target) => (
                    <Pill key={target}>{target}</Pill>
                  ))}
                </div>
              </InfoBlock>
            )}

            {reverseLookup.length > 0 && (
              <InfoBlock title="Reverse DNS Details">
                <div className="grid gap-2">
                  {reverseLookup.map((item) => (
                    <div
                      key={item.ip}
                      className="rounded-lg bg-[var(--bg-card)] p-2"
                    >
                      <p className="font-mono text-xs text-[var(--text-primary)]">
                        {item.ip}
                      </p>

                      {item.hostnames?.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.hostnames.map((hostname) => (
                            <Pill key={`${item.ip}-${hostname}`}>
                              {hostname}
                            </Pill>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          No reverse hostname found.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </InfoBlock>
            )}

            {emailMx.length > 0 && (
              <InfoBlock title="Email DNS Detected — Do Not Modify">
                <div className="grid gap-2">
                  {emailMx.map((mx) => (
                    <div
                      key={`${mx.priority}-${mx.exchange}`}
                      className="rounded-lg bg-[var(--bg-card)] p-2 font-mono text-xs text-[var(--text-primary)]"
                    >
                      priority {mx.priority}: {mx.exchange}
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Keep MX, SPF, DKIM, and DMARC records unchanged unless your
                  email provider instructs otherwise.
                </p>
              </InfoBlock>
            )}

            <InfoBlock title="Technical DNS Target">
              <p className="font-mono text-xs text-[var(--text-primary)]">
                {result.technical_dns_target ||
                  result.expected_target ||
                  DOMAIN_TARGET}
              </p>

              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                This is not the public landing URL. It is the technical hosting
                target your domain should point to. Visitors will still see your
                custom domain in the browser.
              </p>
            </InfoBlock>

            {result.summary && (
              <InfoBlock title="Risk Summary">
                <div className="grid gap-2 text-sm">
                  {result.summary.website && (
                    <p>
                      <span className="font-bold text-[var(--text-primary)]">
                        Website:
                      </span>{" "}
                      {result.summary.website}
                    </p>
                  )}

                  {result.summary.email && (
                    <p>
                      <span className="font-bold text-[var(--text-primary)]">
                        Email:
                      </span>{" "}
                      {result.summary.email}
                    </p>
                  )}

                  {result.summary.action_required && (
                    <p>
                      <span className="font-bold text-[var(--text-primary)]">
                        Action:
                      </span>{" "}
                      {result.summary.action_required}
                    </p>
                  )}
                </div>
              </InfoBlock>
            )}
          </div>

          {isWarning && (
            <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
              <p className="text-xs leading-5 text-yellow-200">
                Continue only if you own this domain and understand that
                changing website DNS may disconnect the existing website.
                Continuing here does not change DNS automatically.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {allowContinue && (
                  <button
                    type="button"
                    onClick={onContinueDomain}
                    className="inline-flex h-10 items-center rounded-xl bg-yellow-400 px-4 text-sm font-black text-black"
                  >
                    I Understand, Continue
                  </button>
                )}

                {allowRelease && (
                  <button
                    type="button"
                    onClick={onReleaseDomain}
                    className="inline-flex h-10 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)]"
                  >
                    Release Domain
                  </button>
                )}
              </div>
            </div>
          )}

          {!isWarning && allowRelease && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onReleaseDomain}
                className="inline-flex h-10 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)]"
              >
                Release Domain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CustomDomainPanel({
  form,
  publicUrl,
  domainStatus,
  domainCheckResult,
  checkingDomain,
  releasingDomain,
  hasConnectedDomain,
  onChange,
  onCheckDomain,
  onContinueDomain,
  onReleaseDomain,
}) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-black text-[var(--text-primary)]">
          Custom Domain
        </h3>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getDomainStatusClass(
            domainStatus
          )}`}
        >
          {domainStatus || "Not Configured"}
        </span>
      </div>

      <p className="mb-4 text-sm leading-6 text-[var(--text-secondary)]">
        Connect your own domain so visitors can open this landing page using
        your business domain instead of the default Exponify link.
      </p>

      <Field label="Custom Domain">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={form.custom_domain || ""}
            onChange={(event) => onChange("custom_domain", event.target.value)}
            className={`${inputClass} flex-1`}
            placeholder="example: sampleclient.exponify.ph"
          />

          <button
            type="button"
            disabled={
              checkingDomain ||
              releasingDomain ||
              !form.custom_domain
            }
            onClick={onCheckDomain}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingDomain ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
            )}
            {checkingDomain ? "Checking..." : "Check Domain"}
          </button>
        </div>
      </Field>

      <div className="mt-3 rounded-2xl bg-[var(--bg-main)] p-4">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Your default Exponify link remains available:
          <span className="ml-2 rounded-lg bg-[var(--bg-card)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]">
            {publicUrl || "https://www.exponify.ph/l/your-slug"}
          </span>
        </p>

        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Technical DNS target for MVP:
          <span className="ml-2 rounded-lg bg-[var(--bg-card)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]">
            {DOMAIN_TARGET}
          </span>
        </p>

        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
          This target is only where DNS should point. Visitors will see your
          custom domain in the browser after verification.
        </p>
      </div>

      {hasConnectedDomain && (
        <ConnectedDomainCard
          domain={form.custom_domain}
          publicUrl={publicUrl}
          releasingDomain={releasingDomain}
          onReleaseDomain={onReleaseDomain}
        />
      )}

      <DomainCheckResult
        result={domainCheckResult}
        onContinueDomain={onContinueDomain}
        onReleaseDomain={onReleaseDomain}
      />

      {releasingDomain && (
        <p className="mt-3 text-xs font-bold text-[var(--brand-gold)]">
          Releasing domain...
        </p>
      )}
    </div>
  );
}
