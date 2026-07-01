import { useEffect, useMemo, useState } from "react";

import {
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  PlugZap,
  RefreshCcw,
  Unplug,
} from "lucide-react";

import {
  connectGoogleWorkspace,
  disconnectWorkspaceIntegration,
  getIntegrationStatus,
  getWorkspaceIntegrations,
} from "../../../../../services/workspaceIntegrations";

import { Field, inputClass } from "../../shared";

export default function BookingIntegrationCard() {
  const [integrations, setIntegrations] = useState([]);
  const [googleEmail, setGoogleEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  const googleIntegration = useMemo(() => {
    return getIntegrationStatus(integrations, "google");
  }, [integrations]);

  const googleConnectedEmail =
    googleIntegration?.connected_email ||
    googleIntegration?.intended_email ||
    "";

  async function loadIntegrations() {
    try {
      setLoading(true);
      setError("");

      const rows = await getWorkspaceIntegrations();
      const google = rows?.find((item) => item.provider === "google");

      setIntegrations(rows || []);
      setGoogleEmail(
        google?.connected_email || google?.intended_email || ""
      );
    } catch (err) {
      console.error("Booking integration load error:", err);
      setError(err.message || "Failed to load booking integrations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectGoogle() {
    try {
      setWorking("google");
      setError("");

      await connectGoogleWorkspace({
        intendedEmail: googleEmail,
      });
    } catch (err) {
      console.error("Google integration connect error:", err);
      setError(err.message || "Failed to connect Google Calendar.");
      setWorking("");
    }
  }

  async function handleDisconnectGoogle() {
    try {
      setWorking("google");
      setError("");

      await disconnectWorkspaceIntegration("google");
      await loadIntegrations();
    } catch (err) {
      console.error("Google integration disconnect error:", err);
      setError(err.message || "Failed to disconnect Google Calendar.");
    } finally {
      setWorking("");
    }
  }

  useEffect(() => {
    loadIntegrations();
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-5">
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border-color)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
            <CalendarCheck className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-black text-[var(--text-primary)]">
                Google Calendar / Meet
              </h4>

              {googleIntegration ? (
                <span className="inline-flex items-center rounded-full border border-green-500/20 bg-[var(--success-soft)] px-2.5 py-1 text-xs font-bold text-[var(--success)]">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                  <PlugZap className="mr-1 h-3 w-3" />
                  Not Connected
                </span>
              )}
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Connect the Google account that should create Calendar events
              and Google Meet links for approved landing page bookings.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadIntegrations}
          disabled={loading}
          className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-gold)] disabled:opacity-60"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-3 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <Field label="Google Account Email">
          <input
            type="email"
            value={googleEmail}
            onChange={(event) => setGoogleEmail(event.target.value)}
            className={inputClass}
            placeholder="your-google-calendar@gmail.com"
            disabled={Boolean(googleIntegration)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {googleIntegration ? (
            <>
              <button
                type="button"
                disabled
                className="inline-flex h-11 items-center rounded-xl border border-green-500/20 bg-[var(--success-soft)] px-4 text-sm font-bold text-[var(--success)]"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {googleConnectedEmail || "Connected"}
              </button>

              <button
                type="button"
                onClick={handleDisconnectGoogle}
                disabled={working === "google"}
                className="inline-flex h-11 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)] disabled:opacity-60"
              >
                <Unplug className="mr-2 h-4 w-4" />
                {working === "google" ? "Disconnecting..." : "Disconnect"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={working === "google"}
              className="inline-flex h-11 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-60"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {working === "google" ? "Opening Google..." : "Connect Google"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
