import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Aanbod", path: "/aanbod" },
  { label: "Mijn Profiel", path: "/profiel" },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary">Elzent</span>
            <span className="text-xs font-body tracking-widest text-muted-foreground uppercase">Select</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-md text-sm font-body transition-colors ${
                  location.pathname === item.path
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-xs font-bold text-secondary-foreground">JD</span>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
};

export default AppLayout;
