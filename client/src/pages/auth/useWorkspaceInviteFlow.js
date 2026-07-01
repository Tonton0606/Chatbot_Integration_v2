import { useEffect } from "react";

import {
  getCurrentSession,
  getDashboardRouteForRole,
  getProfileRole,
  markMfaVerified,
  isMfaVerified,
} from "../../services/auth/authActions";

import {
  acceptInviteForSignedInUser,
  loadInvitePreview,
} from "../../services/auth/workspaceInviteAuth";

import {
  buildJoinSharedWorkspaceConfirmationMessage,
  getOwnedActiveWorkspacesExcept,
} from "./authPageHelpers";

export default function useWorkspaceInviteFlow({
  navigate,
  inviteToken,
  isInviteSignup,
  isChangePasswordMode,
  invitePreview,
  setInvitePreview,
  setInviteLoading,
  setIsLogin,
  setFormData,
  setLoading,
  setError,
  setSuccess,
}) {
  async function resolveInvitePreview() {
    if (invitePreview?.workspace_id) {
      return invitePreview;
    }

    return loadInvitePreview(inviteToken);
  }

  async function confirmJoinSharedWorkspace(userId) {
    const preview = await resolveInvitePreview();

    const ownedWorkspaces = await getOwnedActiveWorkspacesExcept({
      userId,
      workspaceIdToKeep: preview.workspace_id,
    });

    if (!ownedWorkspaces.length) {
      return;
    }

    const confirmed = window.confirm(
      buildJoinSharedWorkspaceConfirmationMessage({
        inviteWorkspaceName: preview.workspace_name,
        ownedWorkspaces,
      })
    );

    if (!confirmed) {
      throw new Error("Invitation acceptance cancelled.");
    }
  }

  async function acceptInviteAndRedirect(userId) {
    await confirmJoinSharedWorkspace(userId);
    await acceptInviteForSignedInUser(inviteToken);

    setSuccess("Invitation accepted. Redirecting to the shared workspace...");

    // Accepting an invite is a completed authentication — mark MFA so the
    // protected routes admit the user instead of bouncing them back to /auth.
    markMfaVerified();

    setTimeout(() => {
      navigate("/ClientDashboard", { replace: true });
    }, 1000);
  }

  async function finishInviteOrRouteUser(userId) {
    // Single funnel for every completed auth flow (login-OTP, email verify,
    // trusted device, invite). Marking MFA here covers them all in one place.
    markMfaVerified();

    if (isInviteSignup) {
      await acceptInviteAndRedirect(userId);
      return;
    }

    const role = await getProfileRole(userId);
    navigate(getDashboardRouteForRole(role), { replace: true });
  }

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      if (!isInviteSignup) {
        setInviteLoading(false);
        return;
      }

      try {
        setInviteLoading(true);
        setError("");

        const preview = await loadInvitePreview(inviteToken);

        if (!active) return;

        setInvitePreview(preview);
        setIsLogin(false);
        setFormData((prev) => ({
          ...prev,
          email: preview.email || "",
          companyName: "",
        }));
      } catch (err) {
        console.error("Invite preview load error:", err);

        if (!active) return;

        setInvitePreview(null);
        setError(
          err.message ||
            "Invitation is invalid, expired, already used, or unavailable."
        );
      } finally {
        if (active) setInviteLoading(false);
      }
    }

    loadPreview();

    return () => {
      active = false;
    };
  }, [
    inviteToken,
    isInviteSignup,
    setError,
    setFormData,
    setInviteLoading,
    setInvitePreview,
    setIsLogin,
  ]);

  useEffect(() => {
    const checkAuth = async () => {
      if (isChangePasswordMode) return;

      try {
        const session = await getCurrentSession();

        if (!session) return;

        // Invite-signup with an existing session is itself a completed auth step.
        if (isInviteSignup) {
          setLoading(true);
          await acceptInviteAndRedirect(session.user.id);
          return;
        }

        // Only auto-redirect an already-authenticated user into the app if they
        // have completed MFA. A valid Supabase session alone is NOT sufficient:
        // signInWithPassword creates a session BEFORE the OTP step, so redirecting
        // on session-presence would (a) bypass MFA and (b) cause an infinite
        // /auth ⇄ dashboard loop with ProtectedRoute. If MFA isn't done, stay on
        // the auth page and let the user complete login.
        if (!isMfaVerified()) return;

        const role = await getProfileRole(session.user.id);
        navigate(getDashboardRouteForRole(role), { replace: true });
      } catch (err) {
        console.error("Initial auth check error:", err);
        setError(err.message || "Failed to check authentication.");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [
    navigate,
    inviteToken,
    isInviteSignup,
    isChangePasswordMode,
  ]);

  return {
    acceptInviteAndRedirect,
    finishInviteOrRouteUser,
  };
}
