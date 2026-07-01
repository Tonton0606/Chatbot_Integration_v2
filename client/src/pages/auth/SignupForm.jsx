import {
  ArrowRight,
  Building,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";

export default function SignupForm({
  formData,
  handleInputChange,
  handleSubmit,
  showPassword,
  setShowPassword,
  passwordStrength,
  isInviteSignup,
  invitePreview,
  securityWarnings,
  requiresCaptcha,
  captchaVerified,
  setCaptchaVerified,
  loading,
  inviteLoading,
  submitDisabled,
}) {
  return (
    <form onSubmit={handleSubmit} className="space-y-5 select-text">
      {isInviteSignup && invitePreview && (
        <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/10 p-4 text-sm text-[#e2c07a]">
          <p className="font-semibold text-[#f4d58d]">
            Workspace invitation verified
          </p>

          <p className="mt-1">
            You are joining{" "}
            <span className="font-semibold">
              {invitePreview.workspace_name}
            </span>{" "}
            as <span className="font-semibold">{invitePreview.email}</span>.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
            <User size={14} className="text-[#c9a84c]" />
            First Name *
          </label>

          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all font-inter"
            placeholder="John"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
            <User size={14} className="text-[#c9a84c]" />
            Surname *
          </label>

          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all font-inter"
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
          <Mail size={14} className="text-[#c9a84c]" />
          Email *
        </label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          readOnly={isInviteSignup}
          required
          className={
            isInviteSignup
              ? "w-full cursor-not-allowed px-4 py-3 bg-[#070b14]/70 border border-[#c9a84c]/30 rounded-xl text-[#e2c07a] placeholder:text-white/30 outline-none transition-all font-inter"
              : "w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all font-inter"
          }
          placeholder="john@example.com"
        />

        {isInviteSignup && (
          <p className="text-xs text-white/40 font-inter">
            This email is locked because the invitation is email-specific.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
          <Lock size={14} className="text-[#c9a84c]" />
          Password *
          {passwordStrength.score > 0 && (
            <span
              className={`ml-2 text-xs ${
                passwordStrength.label === "Strong"
                  ? "text-green-400"
                  : passwordStrength.label === "Good"
                    ? "text-[#c9a84c]"
                    : passwordStrength.label === "Fair"
                      ? "text-yellow-400"
                      : "text-red-400"
              }`}
            >
              ({passwordStrength.label})
            </span>
          )}
        </label>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all font-inter"
            placeholder="Create a secure password"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-[#c9a84c] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {passwordStrength.score > 0 && (
          <div className="mt-2">
            <div className="h-1 w-full bg-[#070b14] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passwordStrength.score >= 80
                    ? "bg-green-500 w-full"
                    : passwordStrength.score >= 60
                      ? "bg-[#c9a84c] w-3/4"
                      : passwordStrength.score >= 40
                        ? "bg-yellow-500 w-1/2"
                        : "bg-red-500 w-1/4"
                }`}
              />
            </div>

            <p className="text-xs text-white/40 mt-1 font-inter">
              Use 12+ chars with uppercase, lowercase, numbers & symbols
            </p>
          </div>
        )}
      </div>

      {!isInviteSignup && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 font-inter flex items-center gap-2">
            <Building size={14} className="text-[#c9a84c]" />
            Company Name
            <span className="text-xs text-white/40 font-normal ml-2">
              (Leave blank for personal account)
            </span>
          </label>

          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all font-inter"
            placeholder="Acme Inc. (optional)"
          />

          <p className="text-xs text-white/40 mt-1 font-inter">
            {formData.companyName ? (
              <span className="text-[#c9a84c]">
                ✓ Workspace account will be created
              </span>
            ) : (
              "User account will be created"
            )}
          </p>
        </div>
      )}

      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          tabIndex="-1"
          autoComplete="off"
        />

        <input
          type="text"
          name="phone_confirm"
          value={formData.phone_confirm}
          onChange={handleInputChange}
          tabIndex="-1"
          autoComplete="off"
        />
      </div>

      {securityWarnings.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl font-inter">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">
              Security Notice
            </span>
          </div>

          <p className="text-xs text-yellow-300/80">
            Unusual activity detected. Additional verification may be required.
          </p>
        </div>
      )}

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
        className="w-full py-4 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-inter bg-[#c9a84c] text-[#070b14] hover:bg-[#e2c07a]"
      >
        {loading || inviteLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-[#070b14]/30 border-t-transparent rounded-full animate-spin" />
            <span>
              {inviteLoading ? "Validating invitation..." : "Creating account..."}
            </span>
          </>
        ) : (
          <>
            <span>
              {isInviteSignup
                ? "Create Account and Join Workspace"
                : "Create Account"}
            </span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-white/40 font-inter">
        By creating an account, you agree to our Terms of Service and Privacy
        Policy.
      </p>
    </form>
  );
}
