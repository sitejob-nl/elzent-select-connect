import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Inbox,
  ShieldCheck,
  Mail,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const sidebarItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Aanbod", path: "/admin/aanbod", icon: Building2 },
  { label: "Klanten", path: "/admin/klanten", icon: Users },
  { label: "Leads", path: "/admin/leads", icon: Inbox },
  { label: "E-mail", path: "/admin/email", icon: Mail },
  { label: "Toegang", path: "/admin/toegang", icon: ShieldCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-secondary text-secondary-foreground">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="text-primary">
              <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
                <path d="M4 4L12 8L20 4M4 4V16L12 20M4 4L12 2L20 4M20 4V16L12 20M12 8V20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-white tracking-wider uppercase">Resid</span>
              <span className="text-[0.55rem] font-medium tracking-[0.12em] text-gray-400">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {sidebarItems.map((item) => {
            // Match nested routes like /admin/email/:id so the parent
            // nav entry stays highlighted inside detail views. /admin
            // (Dashboard) is the exception — it would otherwise match
            // every admin path, so it requires an exact comparison.
            const isActive =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-white font-display">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-semibold text-white truncate">{profile?.full_name ?? "Admin"}</p>
              <p className="text-xs font-body text-gray-400 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white font-body transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Mobile header + content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 h-14 border-b border-border bg-secondary backdrop-blur-md flex items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-primary">Resid</span>
            <span className="text-[0.55rem] tracking-[0.12em] text-gray-400 uppercase">Admin</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4 text-gray-400" />
          </button>
        </header>

        <main className="flex-1 pb-16 lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-around h-14">
            {sidebarItems.map((item) => {
              // Same parent-match logic as the sidebar so /admin/email/:id
              // keeps the E-mail tab lit up on mobile too.
              const isActive =
                item.path === "/admin"
                  ? location.pathname === "/admin"
                  : location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-1 py-1.5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[9px] font-body font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
