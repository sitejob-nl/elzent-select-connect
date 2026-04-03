import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Lock, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import heroImg from "@/assets/hero-building.jpg";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, session, profile, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in — wait for profile to be loaded so isAdmin is accurate
  useEffect(() => {
    if (session && !authLoading && profile) {
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [session, authLoading, profile, isAdmin, navigate]);

  if (session && !authLoading && profile) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Inloggen mislukt",
        description: "Controleer uw e-mailadres en wachtwoord.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Navigation happens via auth state change + redirect above
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={heroImg} alt="Luxury building" className="absolute inset-0 w-full h-full object-cover" width={1024} height={1536} />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <span className="inline-block px-3 py-1 rounded-full border border-primary/40 text-primary text-xs font-body tracking-wider mb-4 w-fit">
            Exclusief
          </span>
          <p className="font-body text-primary-foreground/80 text-base max-w-md leading-relaxed">
            Elk object op ons platform is persoonlijk gecontroleerd en geanalyseerd door onze specialisten.
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 bg-card">
        <div className="max-w-sm w-full mx-auto">
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold text-foreground">Welkom Terug</h1>
            <p className="mt-2 text-muted-foreground font-body">Log in op uw exclusieve vastgoedplatform</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-body text-muted-foreground mb-1.5">E-mailadres</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-body text-muted-foreground mb-1.5">Wachtwoord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm font-body">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-input text-primary focus:ring-primary" />
                Onthoud mij
              </label>
              <button type="button" className="text-primary hover:underline">Wachtwoord vergeten?</button>
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Inloggen"
              )}
            </Button>
          </form>

          <div className="mt-10 p-5 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm font-body text-muted-foreground mb-1">Nog geen toegang?</p>
            <p className="text-xs font-body text-muted-foreground mb-3">
              Resid is uitsluitend toegankelijk op uitnodiging.
            </p>
            <Button variant="gold-outline" size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Toegang Aanvragen
            </Button>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground font-body">
            © 2026 Resid · <span className="hover:text-primary cursor-pointer">Privacy</span> · <span className="hover:text-primary cursor-pointer">Voorwaarden</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
