import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Building2, Heart, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Aanbod", path: "/aanbod", icon: Building2 },
  { label: "Opgeslagen", path: "/favorieten", icon: Heart },
  { label: "Mijn Profiel", path: "/profiel", icon: User },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  // Highlight a nav item when we're on its path or any sub-route. Used by
  // both the desktop and mobile nav so `/aanbod/:slug` lights up "Aanbod".
  const isActivePath = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary">Resid</span>
            <span className="hidden sm:inline text-[10px] font-body tracking-wider text-muted-foreground/60 ml-1">powered by Elzent Estates</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link inline-flex items-center px-1 pt-1 pb-[18px] border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "active text-primary border-primary"
                      : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center cursor-pointer" onClick={() => navigate("/profiel")}>
              <span className="text-xs font-bold text-primary-foreground font-display">{initials}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              title="Uitloggen"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = isActivePath(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-body font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
