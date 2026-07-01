import { useEffect } from "react";
import { updatePassword } from "../../services/auth/authActions";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

export default function useAuthResetFlows({
  forgotEmail,
  setForgotLoading,
  setError,
  setForgotSent,
  recoveryStrength,
  recoveryPassword,
  recoveryConfirm,
  setRecoveryLoading,
  setRecoverySuccess,
  customResetToken,
  customResetPassword,
  customResetConfirm,
  setCustomResetLoading,
  setCustomResetSuccess,
  setIsRecoveryMode,
  setIsCustomResetMode,
  setCustomResetToken,
  setIsChangePasswordMode,
}) {
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("token");
    const resetType = params.get("type");

    if (hash.includes("type=recovery") || hash.includes("type=email_change")) {
      setIsRecoveryMode(true);
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    } else if (resetToken && resetType === "reset") {
      setIsCustomResetMode(true);
      setCustomResetToken(resetToken);
      window.history.replaceState(null, "", window.location.pathname);
    } else if (resetType === "change-password") {
      setIsChangePasswordMode(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [
    setCustomResetToken,
    setIsChangePasswordMode,
    setIsCustomResetMode,
    setIsRecoveryMode,
  ]);

  async function handleForgotPassword(e) {
    e.preventDefault();

    if (!forgotEmail) return;

    setForgotLoading(true);
    setError("");

    try {
      await fetch(`${API_BASE_URL}/auth/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      setForgotSent(true);
    } catch (err) {
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleRecoverySubmit(e) {
    e.preventDefault();
    setError("");

    if (!recoveryStrength.valid) {
      setError("Password does not meet strength requirements.");
      return;
    }

    if (recoveryPassword !== recoveryConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setRecoveryLoading(true);

    try {
      await updatePassword(recoveryPassword);
      setRecoverySuccess(true);
    } catch (err) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleCustomResetSubmit(e) {
    e.preventDefault();
    setError("");

    if (!customResetPassword || customResetPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (customResetPassword !== customResetConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setCustomResetLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: customResetToken,
          password: customResetPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setCustomResetSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setCustomResetLoading(false);
    }
  }

  return {
    handleForgotPassword,
    handleRecoverySubmit,
    handleCustomResetSubmit,
  };
}
