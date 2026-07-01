/**
 * ChangePasswordForm — enterprise-grade change-password UI.
 * Requires the user to enter their CURRENT password before setting a new one.
 * Calls the backend /api/auth/change-password endpoint which verifies the
 * current password server-side, enforces strength rules, and writes an audit log.
 */
import { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { calculatePasswordStrength } from "../../services/auth/authSecurity";
import { revokeAllSessions } from "../../services/auth/authActions";
import { supabase } from "../../config/supabaseClient";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const STRENGTH_COLORS = {
  Weak: "bg-red-500",
  Fair: "bg-amber-400",
  Good: "bg-blue-400",
  Strong: "bg-green-500",
};

const STRENGTH_TEXT = {
  Weak: "text-red-500",
  Fair: "text-amber-500",
  Good: "text-blue-500",
  Strong: "text-green-500",
};

function PasswordInput({ label, value, onChange, placeholder, show, onToggle, error, autoComplete }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-white dark:bg-white/5 focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-red-400 focus:ring-red-400/30"
              : "border-gray-300 dark:border-white/10 focus:ring-[var(--brand-gold,#f59e0b)]/30 focus:border-[var(--brand-gold,#f59e0b)]"
          } text-gray-900 dark:text-white placeholder-gray-400`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function StrengthMeter({ strength }) {
  if (!strength || !strength.label) return null;
  const color = STRENGTH_COLORS[strength.label] || "bg-gray-300";
  const textColor = STRENGTH_TEXT[strength.label] || "text-gray-500";
  const checks = [
    { key: "length", label: "12+ characters" },
    { key: "uppercase", label: "Uppercase letter" },
    { key: "lowercase", label: "Lowercase letter" },
    { key: "numbers", label: "Number" },
    { key: "special", label: "Special character (!@#…)" },
    { key: "noCommon", label: "No common patterns" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Password strength</span>
        <span className={`font-semibold ${textColor}`}>{strength.label}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {checks.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                strength.checks?.[key] ? "bg-green-500" : "bg-gray-300 dark:bg-white/20"
              }`}
            />
            <span className={strength.checks?.[key] ? "text-gray-600 dark:text-gray-400" : "text-gray-400"}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChangePasswordForm({ onSuccess, compact = false }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState({ score: 0, label: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  function handleNewPasswordChange(e) {
    const val = e.target.value;
    setNewPassword(val);
    setStrength(calculatePasswordStrength(val));
    setErrors((prev) => ({ ...prev, newPassword: "" }));
    setServerError("");
  }

  function validate() {
    const errs = {};
    if (!currentPassword) errs.currentPassword = "Current password is required.";
    if (!newPassword) errs.newPassword = "New password is required.";
    else if (!strength.valid) errs.newPassword = "Password doesn't meet strength requirements.";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your new password.";
    else if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errs.newPassword = "New password must be different from your current password.";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError("");

    try {
      // Get current session JWT to authenticate the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setServerError("Session expired. Please log in again.");
        return;
      }

      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Failed to update password. Please try again.");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStrength({ score: 0, label: "" });
      onSuccess?.();

      if (data.forceReauth) {
        setTimeout(async () => {
          await revokeAllSessions();
          window.location.href = '/auth';
        }, 2000);
      }
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-green-500" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Password Updated</h3>
        <p className="text-sm text-gray-500">
          Your password has been changed. A confirmation email has been sent to you.
        </p>
        <button
          onClick={() => { setSuccess(false); setErrors({}); }}
          className="mt-2 text-sm text-[var(--brand-gold,#f59e0b)] hover:underline"
        >
          Change again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {!compact && (
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-[var(--brand-gold,#f59e0b)]" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
        </div>
      )}

      <PasswordInput
        label="Current Password"
        value={currentPassword}
        onChange={(e) => { setCurrentPassword(e.target.value); setErrors((p) => ({ ...p, currentPassword: "" })); setServerError(""); }}
        placeholder="Enter your current password"
        show={showCurrent}
        onToggle={() => setShowCurrent((v) => !v)}
        error={errors.currentPassword}
        autoComplete="current-password"
      />

      <PasswordInput
        label="New Password"
        value={newPassword}
        onChange={handleNewPasswordChange}
        placeholder="Enter new password (12+ chars)"
        show={showNew}
        onToggle={() => setShowNew((v) => !v)}
        error={errors.newPassword}
        autoComplete="new-password"
      />

      {newPassword && <StrengthMeter strength={strength} />}

      <PasswordInput
        label="Confirm New Password"
        value={confirmPassword}
        onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
        placeholder="Re-enter new password"
        show={showConfirm}
        onToggle={() => setShowConfirm((v) => !v)}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      {serverError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-[var(--brand-gold,#f59e0b)] hover:bg-amber-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Updating…
          </>
        ) : (
          "Update Password"
        )}
      </button>
    </form>
  );
}
