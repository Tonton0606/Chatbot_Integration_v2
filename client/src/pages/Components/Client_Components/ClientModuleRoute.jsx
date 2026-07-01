import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { canAccessClientModule } from "../../../services/operations/client_modules";

export default function ClientModuleRoute({ moduleKey, children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        setLoading(true);
        setError("");

        const hasAccess = await canAccessClientModule(moduleKey);

        if (mounted) {
          setAllowed(hasAccess);
        }
      } catch (err) {
        console.error("Client module route error:", err);

        if (mounted) {
          setError(err.message || "Failed to validate module access.");
          setAllowed(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [moduleKey]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#ea580c]" />
          <span className="text-sm font-medium text-gray-600">
            Checking module access...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-8 w-8 text-red-600" />
          <h2 className="mt-3 text-lg font-bold text-red-900">
            Access check failed
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
