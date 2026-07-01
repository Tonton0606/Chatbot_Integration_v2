import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Link2,
  Mail,
  PlugZap,
  RefreshCcw,
  Unplug,
} from "lucide-react";

import {
  connectGoogleWorkspace,
  disconnectWorkspaceIntegration,
  getIntegrationStatus,
  getWorkspaceIntegrations,
} from "../../../services/workspaceIntegrations";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

export default function ClientBookingIntegrations() {
  const [integrations, setIntegrations] = useState([]);
  const [googleEmail, setGoogleEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingProvider, setWorkingProvider] = useState("");
  const [error, setError] = useState("");

  const googleIntegration = useMemo(() => {
    return getIntegrationStatus(integrations, "google");
  }, [integrations]);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      setLoading(true);
      setError("");

      const rows = await getWorkspaceIntegrations();

      setIntegrations(rows || []);
      setGoogleEmail(
        rows?.find((item) => item.provider === "google")?.connected_email ||
          rows?.find((item) => item.provider === "google")?.intended_email ||
          ""
      );
    } catch (err) {
      console.error("Workspace integrations load error:", err);
      setError(err.message || "Failed to load integrations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectGoogle() {
    try {
      setWorkingProvider("google");

      await connectGoogleWorkspace({
        intendedEmail: googleEmail,
      });
    } catch (err) {
      console.error("Google connect error:", err);
      alert(err.message || "Failed to connect Google.");
      setWorkingProvider("");
    }
  }

  async function handleDisconnect(provider) {
    const confirmed = window.confirm(
      "Disconnect Google from this workspace?"
    );

    if (!confirmed) return;

    try {
      setWorkingProvider(provider);
      await disconnectWorkspaceIntegration(provider);
      await loadIntegrations();
    } catch (err) {
      console.error("Workspace integration disconnect error:", err);
      alert(err.message || "Failed to disconnect integration.");
    } finally {
      setWorkingProvider("");
    }
  }

  return (
    <section className={`${panelClass} p-5`}>
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border-color)] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Workspace Integrations
          </p>

          <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
            Meeting Account Connection
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Connect Google Calendar and Google Meet for this workspace.
            Approved bookings will use this connected Google account.
          </p>
        </div>

        <button
          type="button"
          onClick={loadIntegrations}
          disabled={loading}
          className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-60"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,640px)]">
        <IntegrationCard
          title="Google Calendar / Meet"
          description="Use this workspace Google account to create Calendar events and Google Meet links."
          icon={CalendarCheck}
          email={googleEmail}
          setEmail={setGoogleEmail}
          integration={googleIntegration}
          loading={loading}
          working={workingProvider === "google"}
          onConnect={handleConnectGoogle}
          onDisconnect={() => handleDisconnect("google")}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Future meeting integrations
        </p>

        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Zoom, Microsoft Teams, and Outlook Calendar can be added later after
          the Google Meet booking flow is fully stable.
        </p>
      </div>
    </section>
  );
}

function IntegrationCard({
  title,
  description,
  icon: Icon,
  email,
  setEmail,
  integration,
  loading,
  working,
  onConnect,
  onDisconnect,
}) {
  const connected = Boolean(integration);

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--brand-gold)]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>

            {connected ? (
              <span className="inline-flex items-center rounded-full border border-green-500/20 bg-[var(--success-soft)] px-2.5 py-1 text-xs font-bold text-[var(--success)]">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                <PlugZap className="mr-1 h-3 w-3" />
                Not Connected
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>

      {connected ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--hover-bg)] text-[var(--brand-gold)]">
              <Mail className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Connected Account
              </p>

              <p className="mt-1 truncate font-semibold text-[var(--text-primary)]">
                {integration.connected_email || integration.intended_email}
              </p>

              {integration.connected_name && (
                <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
                  {integration.connected_name}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onDisconnect}
            disabled={working}
            className="mt-4 inline-flex h-10 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-3 text-sm font-semibold text-[var(--danger)] hover:opacity-90 disabled:opacity-60"
          >
            <Unplug className="mr-2 h-4 w-4" />
            {working ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Intended Google Email
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="owner@company.com"
            />
          </label>

          <button
            type="button"
            onClick={onConnect}
            disabled={working || loading || !email}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Link2 className="mr-2 h-4 w-4" />
            {working ? "Connecting..." : "Connect Google"}
          </button>
        </div>
      )}
    </div>
  );
}
