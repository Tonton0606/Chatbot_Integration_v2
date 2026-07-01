import { useState } from "react";
import { ArrowRight, Mail, Link2 } from "lucide-react";

export default function LoginOtpStep({
  loginOtpEmail,
  otpCode,
  setOtpCode,
  loading,
  resendTimer,
  onSubmit,
  onResend,
  onBack,
  onMagicLink,
}) {
  const [trustDevice, setTrustDevice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e, { trustDevice });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#c9a84c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-[#c9a84c]" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          Verify Login
        </h3>

        <p className="text-white/60 text-sm">
          We sent a login code to
          <br />
          <span className="text-[#c9a84c]">{loginOtpEmail}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 font-inter">
            Enter 6-digit code
          </label>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            className="w-full px-4 py-3 bg-[#070b14] border border-white/10 rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all font-inter"
            placeholder="000000"
            required
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-[#070b14] text-[#c9a84c] focus:ring-[#c9a84c]/50"
          />
          <span className="text-sm text-white/60">Trust this device for 30 days</span>
        </label>

        <button
          type="submit"
          disabled={loading || otpCode.length < 6}
          className="w-full py-3 bg-[#c9a84c] hover:bg-[#b8953f] text-[#0a0e1a] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify and Continue"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={onResend}
          disabled={resendTimer > 0 || loading}
          className="text-sm text-white/50 hover:text-[#c9a84c] transition-colors disabled:opacity-50"
        >
          {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend login code"}
        </button>
      </div>

      {onMagicLink && (
        <div className="text-center pt-2 border-t border-white/10">
          <button
            onClick={onMagicLink}
            disabled={loading}
            className="text-sm text-white/50 hover:text-[#c9a84c] transition-colors flex items-center justify-center gap-1.5 w-full disabled:opacity-50"
          >
            <Link2 className="w-3.5 h-3.5" />
            Send a magic link instead
          </button>
        </div>
      )}

      <div className="text-center pt-4 border-t border-white/10">
        <button
          onClick={onBack}
          className="text-sm text-white/50 hover:text-white transition-colors block w-full"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
