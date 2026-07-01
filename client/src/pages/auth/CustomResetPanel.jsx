import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

export default function CustomResetPanel({
  error,
  customResetPassword,
  setCustomResetPassword,
  customResetConfirm,
  setCustomResetConfirm,
  customResetStrength,
  setCustomResetStrength,
  showCustomResetPassword,
  setShowCustomResetPassword,
  showCustomResetConfirm,
  setShowCustomResetConfirm,
  customResetLoading,
  customResetSuccess,
  onSubmit,
  onSignIn,
  calculatePasswordStrength,
}) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1525] rounded-2xl border border-white/10 shadow-2xl p-8">
        {customResetSuccess ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-green-400" />
            </div>

            <h2 className="text-xl font-bold text-white">Password Reset!</h2>

            <p className="text-white/50 text-sm">
              Your password has been updated successfully.
            </p>

            <button
              onClick={onSignIn}
              className="mt-4 w-full py-3 bg-[#c9a84c] hover:bg-[#b8953f] text-[#0a0e1a] font-semibold rounded-xl transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-[#c9a84c]/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-[#c9a84c]" />
              </div>

              <h2 className="text-xl font-bold text-white">Set New Password</h2>

              <p className="text-white/50 text-sm mt-1">
                Your reset link is valid. Choose a strong password.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1.5">
                  New Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />

                  <input
                    type={showCustomResetPassword ? "text" : "password"}
                    value={customResetPassword}
                    onChange={(e) => {
                      setCustomResetPassword(e.target.value);
                      setCustomResetStrength(
                        calculatePasswordStrength(e.target.value)
                      );
                    }}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-3 bg-[#0f1528] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] transition-all"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCustomResetPassword((value) => !value)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showCustomResetPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {customResetPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Strength</span>

                      <span
                        className={
                          customResetStrength.label === "Strong"
                            ? "text-green-400"
                            : customResetStrength.label === "Good"
                              ? "text-blue-400"
                              : customResetStrength.label === "Fair"
                                ? "text-amber-400"
                                : "text-red-400"
                        }
                      >
                        {customResetStrength.label}
                      </span>
                    </div>

                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          customResetStrength.label === "Strong"
                            ? "bg-green-500"
                            : customResetStrength.label === "Good"
                              ? "bg-blue-400"
                              : customResetStrength.label === "Fair"
                                ? "bg-amber-400"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${customResetStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1.5">
                  Confirm Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />

                  <input
                    type={showCustomResetConfirm ? "text" : "password"}
                    value={customResetConfirm}
                    onChange={(e) => setCustomResetConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full pl-10 pr-10 py-3 bg-[#0f1528] border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${
                      customResetConfirm &&
                      customResetConfirm !== customResetPassword
                        ? "border-red-500/50 focus:ring-red-500"
                        : "border-white/10 focus:ring-[#c9a84c]"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCustomResetConfirm((value) => !value)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showCustomResetConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {customResetConfirm &&
                  customResetConfirm !== customResetPassword && (
                    <p className="mt-1 text-xs text-red-400">
                      Passwords do not match
                    </p>
                  )}
              </div>

              <button
                type="submit"
                disabled={
                  customResetLoading ||
                  customResetPassword.length < 8 ||
                  customResetPassword !== customResetConfirm
                }
                className="w-full py-3 bg-[#c9a84c] hover:bg-[#b8953f] text-[#0a0e1a] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {customResetLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Set New Password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
