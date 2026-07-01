import { AlertCircle, Lock, Mail } from "lucide-react";

export default function ForgotPasswordPanel({
  error,
  forgotEmail,
  setForgotEmail,
  forgotSent,
  forgotLoading,
  onSubmit,
  onBack,
  onDone,
}) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1525] rounded-2xl border border-white/10 shadow-2xl p-8">
        {forgotSent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#c9a84c]/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-[#c9a84c]" />
            </div>

            <h2 className="text-xl font-bold text-white">Check Your Email</h2>

            <p className="text-white/50 text-sm">
              We sent a password-reset link to{" "}
              <span className="text-[#c9a84c]">{forgotEmail}</span>. Check your
              inbox and click the link to set a new password.
            </p>

            <p className="text-white/30 text-xs">
              Didn't receive it? Check your spam folder.
            </p>

            <button
              onClick={onDone}
              className="mt-2 text-sm text-[#c9a84c] hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors"
              >
                ← Back to Sign In
              </button>

              <div className="w-12 h-12 rounded-full bg-[#c9a84c]/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-[#c9a84c]" />
              </div>

              <h2 className="text-xl font-bold text-white">Forgot Password?</h2>

              <p className="text-white/50 text-sm mt-1">
                Enter your email and we'll send a reset link.
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
                  Email Address
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />

                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1528] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading || !forgotEmail}
                className="w-full py-3 bg-[#c9a84c] hover:bg-[#b8953f] text-[#0a0e1a] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
