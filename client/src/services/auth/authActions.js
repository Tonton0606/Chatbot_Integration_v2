import { supabase } from "../../config/supabaseClient";
import { buildInviteSignupMetadata } from "./workspaceInviteAuth";

const rawBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  return session;
}

export async function getProfileRole(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data?.role || null;
}

export function getDashboardRouteForRole(role) {
  return role === "Admin" || role === "SuperAdmin"
    ? "/Admin/Dashboard"
    : "/ClientDashboard";
}

export async function signInWithEmailPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function startLoginOtp() {
  const session = await getCurrentSession();

  if (!session?.access_token) {
    throw new Error("Login session is required to send OTP.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-otp/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to send login OTP.");
  }

  // Local dev only: the server returns the OTP when email/SMS isn't configured.
  // Surface it loudly in the browser console so login is testable without mail.
  if (data.devOtp && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`%c[DEV] Login OTP: ${data.devOtp}`, "font-size:16px;font-weight:bold;color:#22d3ee");
  }

  return data;
}

export async function verifyLoginOtp({ challengeId, otp, trustDevice = false }) {
  const session = await getCurrentSession();

  if (!session?.access_token) {
    throw new Error("Login session is required to verify OTP.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ challengeId, otp, trustDevice }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const err = new Error(data.error || "Failed to verify login OTP.");
    err.remainingAttempts = data.remainingAttempts;
    throw err;
  }

  return data;
}

export async function requestMagicLink() {
  const session = await getCurrentSession();

  if (!session?.access_token) {
    throw new Error("Login session is required to request magic link.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-otp/magic-link/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to send magic link.");
  }

  return data;
}

export async function getTrustedDevices() {
  const session = await getCurrentSession();

  if (!session?.access_token) {
    throw new Error("Login session is required.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-otp/device/list`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to list trusted devices.");
  }

  return data.devices;
}

export async function revokeTrustedDevice(deviceId) {
  const session = await getCurrentSession();

  if (!session?.access_token) {
    throw new Error("Login session is required.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-otp/device/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ deviceId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to revoke device.");
  }

  return data;
}

export async function signUpWithProfile({
  email,
  password,
  firstName,
  middleName,
  lastName,
  companyName,
  inviteToken = "",
}) {
  const inviteMetadata = await buildInviteSignupMetadata(inviteToken);

  const fullName = `${firstName} ${
    middleName ? `${middleName} ` : ""
  }${lastName}`.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName || null,
        ...inviteMetadata,
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function resendSignupVerification(email) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) throw error;

  return true;
}

export async function verifyEmailOtp({ email, token }) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) throw error;

  return true;
}

/**
 * Send a password-reset email. Supabase emails a magic link; on click the user
 * lands on /reset-password with a `type=recovery` hash token so they can set
 * a new password on the dedicated reset page.
 */
export async function requestPasswordReset(email) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
  return true;
}

/**
 * Update the current authenticated user's password.
 * Must be called while a valid session exists (either regular or recovery session).
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function waitForSignupProfile(userId, { maxAttempts = 8, baseDelayMs = 500 } = {}) {
  if (!userId) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data?.id) return data;

    // Profile not yet created by DB trigger — back off and retry
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    } else if (error) {
      throw error;
    }
  }

  throw new Error("Profile was not created in time. Please sign in to continue.");
}

// ── Session revocation ────────────────────────────────────────────────────────

async function _authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

/**
 * Revoke the current session token on the backend blacklist, then sign out
 * locally via Supabase. Call this on every logout.
 */
const WORKSPACE_STORAGE_KEYS = [
  "exponify_active_client_workspace_id",
  "workspaceId",
  "workspace_id",
  "workspace_name",
];

// MFA-verified marker. Stored in localStorage (NOT sessionStorage) so it persists
// alongside the Supabase session across browser restarts — otherwise a returning
// user with a persisted session but a fresh tab would be bounced from every
// protected route while AuthContainer re-redirects them in: an infinite loop.
// It is cleared on sign-out and on any 401, so its lifetime tracks the session.
const MFA_VERIFIED_KEY = "hermes_mfa_verified";

export function markMfaVerified() {
  try { localStorage.setItem(MFA_VERIFIED_KEY, "1"); } catch { /* non-fatal */ }
}

export function isMfaVerified() {
  try { return localStorage.getItem(MFA_VERIFIED_KEY) === "1"; } catch { return false; }
}

export function clearMfaVerified() {
  try {
    localStorage.removeItem(MFA_VERIFIED_KEY);
    sessionStorage.removeItem(MFA_VERIFIED_KEY); // clear any legacy value too
  } catch { /* non-fatal */ }
}

export function clearWorkspaceStorage() {
  try {
    for (const key of WORKSPACE_STORAGE_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  } catch {
    // storage APIs may throw in private browsing — non-fatal
  }
  clearMfaVerified();
}

export async function signOutAndRevoke() {
  try {
    const headers = await _authHeaders();
    if (headers.Authorization) {
      await fetch(`${API_BASE_URL}/auth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      }).catch(() => {}); // fire-and-forget — local signout still happens
    }
  } finally {
    clearWorkspaceStorage();
    await supabase.auth.signOut();
  }
}

/**
 * Revoke ALL sessions for this user (e.g. after password change or
 * suspicious-activity detection). Token stays valid locally until page reload.
 */
export async function revokeAllSessions() {
  const headers = await _authHeaders();
  await fetch(`${API_BASE_URL}/auth/revoke-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
  });
  await supabase.auth.signOut();
}
