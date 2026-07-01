import { AlertCircle, CheckCircle, X } from "lucide-react";

export default function AuthPageShell({
  isLogin,
  isInviteSignup,
  invitePreview,
  error,
  success,
  navigate,
  children,
  footer,
}) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden select-none">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 60%)",
        }}
      />

      <div className={`w-full ${isLogin ? "max-w-md" : "max-w-2xl"}`}>
        <div className="bg-[#0d1525] backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden flex flex-col">
          {!isLogin && (
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white font-[family-name:var(--ep-font-display)]">
                  {isInviteSignup ? "Accept Workspace Invitation" : "Create Account"}
                </h2>

                <p className="text-sm text-white/50 font-inter mt-1">
                  {isInviteSignup && invitePreview?.workspace_name
                    ? `Create an account to join ${invitePreview.workspace_name}, or sign in if you already have one.`
                    : isInviteSignup
                      ? "Validating your workspace invitation..."
                      : "Fill in your details to get started"}
                </p>
              </div>

              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>
          )}

          {isLogin && (
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white font-[family-name:var(--ep-font-display)]">
                  {isInviteSignup ? "Sign In to Join Workspace" : "Sign In"}
                </h2>

                <p className="text-sm text-white/50 font-inter mt-1">
                  {isInviteSignup && invitePreview?.workspace_name
                    ? `Sign in to accept the invitation to ${invitePreview.workspace_name}.`
                    : "Welcome back to your account"}
                </p>
              </div>

              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>
          )}

          <div className="p-6">
            {error && (
              <div
                className={`mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 ${
                  isLogin ? "" : "font-inter"
                }`}
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div
                className={`mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 ${
                  isLogin ? "" : "font-inter"
                }`}
              >
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-400 text-sm">{success}</span>
              </div>
            )}

            {children}

            {footer}
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-white/40 font-inter mb-2">
            <a href="#" className="hover:text-white/60 transition-colors">
              Terms
            </a>
            <span className="text-white/20">•</span>
            <a href="#" className="hover:text-white/60 transition-colors">
              Privacy
            </a>
            <span className="text-white/20">•</span>
            <a href="#" className="hover:text-white/60 transition-colors">
              Help Center
            </a>
          </div>

          <p className="text-xs text-white/30 font-inter">
            &copy; 2026 Enterprise Portal Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
