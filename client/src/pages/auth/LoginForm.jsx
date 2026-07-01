import { ArrowRight, Eye, EyeOff, Lock, Mail, Shield, ShieldCheck } from "lucide-react";

export default function LoginForm({
  formData,
  handleInputChange,
  handleSubmit,
  showPassword,
  setShowPassword,
  isInviteSignup,
  invitePreview,
  requiresCaptcha,
  captchaVerified,
  setCaptchaVerified,
  loading,
  inviteLoading,
  submitDisabled,
  setIsChangePasswordMode,
  setIsForgotPassword,
  setError,
  setForgotEmail,
}) {
  return (
    <form onSubmit={handleSubmit} className="space-y-4 select-text">
      {isInviteSignup && invitePreview && (
        <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/10 p-4 text-sm text-[#e2c07a]">
          <p className="font-semibold text-[#f4d58d]">
            Workspace invitation verified
          </p>

          <p className="mt-1">
            Sign in as{" "}
            <span className="font-semibold">{invitePreview.email}</span> to
            join{" "}
            <span className="font-semibold">
              {invitePreview.workspace_name}
            </span>
            .
          </p>
        </div>
      )}

      <div>
        <label className="block text-[#f5f0e8] text-sm font-medium mb-2">
          Email Address
        </label>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[rgba(245,240,232,0.4)]" />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            readOnly={isInviteSignup}
            className={
              isInviteSignup
                ? "w-full cursor-not-allowed pl-10 pr-4 py-3 bg-[#0f1528]/70 border border-[#c9a84c]/30 rounded-lg text-[#e2c07a] placeholder-[rgba(245,240,232,0.3)] outline-none transition-all"
                : "w-full pl-10 pr-4 py-3 bg-[#0f1528] border border-[rgba(201,168,76,0.18)] rounded-lg text-[#f5f0e8] placeholder-[rgba(245,240,232,0.3)] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-[#c9a84c] transition-all"
            }
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[#f5f0e8] text-sm font-medium mb-2">
          Password
        </label>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[rgba(245,240,232,0.4)]" />

          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full pl-10 pr-12 py-3 bg-[#0f1528] border border-[rgba(201,168,76,0.18)] rounded-lg text-[#f5f0e8] placeholder-[rgba(245,240,232,0.3)] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-[#c9a84c] transition-all"
            placeholder="Enter your password"
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[rgba(245,240,232,0.4)] hover:text-[#c9a84c] transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-between mt-1">
        <button
          type="button"
          onClick={() => setIsChangePasswordMode(true)}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Change password
        </button>

        <button
          type="button"
          onClick={() => {
            setIsForgotPassword(true);
            setError("");
            setForgotEmail(formData.email || "");
          }}
          className="text-xs text-[#c9a84c]/70 hover:text-[#c9a84c] transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {requiresCaptcha && (
        <div className="p-4 bg-[#070b14] border border-[#c9a84c]/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#c9a84c]" />

            <span className="text-white text-sm font-medium font-inter">
              Security Verification
            </span>
          </div>

          <p className="text-xs text-white/50 mb-3 font-inter">
            Multiple failed attempts detected. Please verify you are human.
          </p>

          <button
            type="button"
            onClick={() => setCaptchaVerified(true)}
            className="w-full py-2 bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] rounded-lg hover:bg-[#c9a84c]/20 transition-colors text-sm font-inter"
          >
            {captchaVerified ? (
              <span className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Verified
              </span>
            ) : (
              "Click to Verify"
            )}
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="w-full py-4 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-inter bg-gradient-to-r from-[#c9a84c] to-[#e2c07a] text-[#070b14] hover:from-[#e2c07a] hover:to-[#c9a84c] shadow-lg shadow-[rgba(201,168,76,0.25)] hover:shadow-[rgba(201,168,76,0.4)]"
      >
        {loading || inviteLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-[#0a0e1a] border-t-transparent rounded-full animate-spin" />
            <span>
              {inviteLoading ? "Validating invitation..." : "Signing in..."}
            </span>
          </>
        ) : (
          <>
            <span>
              {isInviteSignup ? "Sign In and Join Workspace" : "Sign In"}
            </span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}
