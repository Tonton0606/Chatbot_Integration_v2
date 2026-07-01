import { lazy, Suspense } from "react";

const ChangePassword = lazy(() =>
  import("../../components/auth/ChangePassword.jsx")
);

export default function ChangePasswordPanel({
  onBack,
  onSuccess,
}) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1525] rounded-2xl border border-white/10 shadow-2xl p-8">
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            ← Back to Sign In
          </button>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ChangePassword onSuccess={onSuccess} />
        </Suspense>
      </div>
    </div>
  );
}
