import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, isAdmin, hasPreferences } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Nudge new clients into onboarding until they save their first preferences.
  // Admins bypass this, and /profiel itself must stay reachable so users can
  // complete the flow.
  if (
    !isAdmin &&
    hasPreferences === false &&
    !location.pathname.startsWith("/profiel")
  ) {
    return <Navigate to="/profiel?onboarding=1" replace />;
  }

  return <>{children}</>;
}
