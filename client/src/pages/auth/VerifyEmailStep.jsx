import { ArrowRight, Mail } from "lucide-react";

export default function VerifyEmailStep({
  verificationEmail,
  otpCode,
  setOtpCode,
  loading,
  resendTimer,
  onSubmit,
  onResend,
  onBack,
  isLogin,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#c9a84c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-[#c9a84c]" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          Verify Your Email
        </h3>

        <p className="text-white/60 text-sm">
          We've sent a verification code to
          <br />
          <span className="text-[#c9a84c]">{verificationEmail}</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 font-inter">
            Enter 6-digit code
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all font-inter"
            placeholder="000000"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || otpCode.length < 6}
          className="w-full py-3 bg-[#c9a84c] hover:bg-[#b8953f] text-[#0a0e1a] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify Email"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={onResend}
          disabled={resendTimer > 0 || loading}
          className="text-sm text-white/50 hover:text-[#c9a84c] transition-colors disabled:opacity-50"
        >
          {resendTimer > 0
            ? `Resend code in ${resendTimer}s`
            : "Resend verification code"}
        </button>
      </div>

      <div className="text-center pt-4 border-t border-white/10 space-y-3">
        <button
          onClick={onBack}
          className="text-sm text-white/50 hover:text-white transition-colors block w-full"
        >
          Back to {isLogin ? "Login" : "Sign Up"}
        </button>
      </div>
    </div>
  );
}
