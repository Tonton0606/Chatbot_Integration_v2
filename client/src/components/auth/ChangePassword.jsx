/**
 * ChangePassword — Enterprise-grade Change Password module
 * Features: current password verification, strength validation, 
 * show/hide passwords, real-time validation, mobile responsive
 */

import { useState, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  Lock,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import { calculatePasswordStrength } from "../../services/auth/authSecurity";

function PasswordStrengthBar({ strength }) {
  if (!strength || strength.score === 0) return null;

  const barColor =
    strength.label === "Strong"
      ? "bg-green-500"
      : strength.label === "Good"
        ? "bg-blue-400"
        : strength.label === "Fair"
          ? "bg-amber-400"
          : "bg-red-500";

  const width = `${Math.min(strength.score, 100)}%`;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">Strength</span>
        <span
          className={
            strength.label === "Strong"
              ? "text-green-400"
              : strength.label === "Good"
                ? "text-blue-400"
                : strength.label === "Fair"
                  ? "text-amber-400"
                  : "text-red-400"
          }
        >
          {strength.label}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

export default function ChangePassword({ onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [strength, setStrength] = useState({ score: 0, label: "", valid: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleNewPasswordChange = useCallback((value) => {
    setNewPassword(value);
    setStrength(calculatePasswordStrength(value));
    setError("");
  }, []);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (!strength.valid) {
      setError(
        "New password must be at least 12 characters with uppercase, lowercase, number, and special character."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setLoading(true);

    try {
      // Get current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Session expired. Please sign in again.");
        return;
      }

      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000/api";

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setSuccess("Password changed successfully! Signing out...");

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStrength({ score: 0, label: "", valid: false });

      // Force re-login after short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/auth";
        }
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-[#c9a84c]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Change Password</h3>
            <p className="text-sm text-white/50">
              Update your password to keep your account secure.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-white/70 text-sm mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter current password"
              className="w-full pl-10 pr-10 py-3 bg-[#0f1528] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] transition-all"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-white/70 text-sm mb-1.5">
            New Password
          </label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => handleNewPasswordChange(e.target.value)}
              placeholder="Enter new password"
              className="w-full pl-10 pr-10 py-3 bg-[#0f1528] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] transition-all"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrengthBar strength={strength} />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-white/70 text-sm mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              placeholder="Re-enter new password"
              className={`w-full pl-10 pr-10 py-3 bg-[#0f1528] border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${
                passwordsMismatch
                  ? "border-red-500/50 focus:ring-red-500"
                  : passwordsMatch
                    ? "border-green-500/50 focus:ring-green-500"
                    : "border-white/10 focus:ring-[#c9a84c]"
              }`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordsMismatch && (
            <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
          )}
          {passwordsMatch && (
            <p className="mt-1 text-xs text-green-400">Passwords match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          className="w-full py-3 bg-[#c9a84c] hover:bg-[#b8953f] text-[#0a0e1a] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating Password...
            </>
          ) : (
            <>
              <Key className="w-4 h-4" />
              Change Password
            </>
          )}
        </button>

        <p className="text-xs text-white/30 text-center mt-2">
          After changing your password, you will be signed out and need to sign
          in again with your new password.
        </p>
      </form>
    </div>
  );
}