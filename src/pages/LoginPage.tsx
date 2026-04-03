import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Lock, UserPlus, Loader2, ShieldCheck, Building2 } from "lucide-react";
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
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ height: "100vh", overflow: "hidden" }}>
      {/* Left — Form */}
      <div className="w-full md:w-[480px] lg:w-[560px] flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-card shadow-xl z-10 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="text-primary">
            <svg fill="none" height="36" viewBox="0 0 24 24" width="36">
              <path d="M4 4L12 8L20 4M4 4V16L12 20M4 4L12 2L20 4M20 4V16L12 20M12 8V20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-display font-bold tracking-widest text-foreground uppercase">Resid</span>
            <span className="text-[0.6rem] font-medium tracking-[0.15em] text-muted-foreground">Powered by Elzent Estates</span>
          </div>
        </div>

        {/* Form */}
        <div className="mt-12 mb-12 flex-grow flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground mb-2">Welkom Terug</h1>
            <p className="text-muted-foreground text-sm md:text-base">Log in op uw exclusieve vastgoedplatform.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">E-mailadres</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  required
                  className="w-full py-3 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Wachtwoord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full py-3 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-input text-primary focus:ring-primary" defaultChecked />
                Onthoud mij
              </label>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:opacity-80"
                onClick={() => toast({ title: "Herstelmail verstuurd", description: "Controleer uw inbox." })}
              >
                Wachtwoord vergeten?
              </button>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full transform hover:scale-[1.02] transition-all duration-200"
              disabled={isLoading}
            >
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

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-1">Nog geen toegang?</p>
            <p className="text-xs text-muted-foreground/70 mb-3">
              Resid is uitsluitend toegankelijk op uitnodiging. Uw aanvraag wordt persoonlijk beoordeeld door ons team.
            </p>
            <button
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:opacity-80 text-sm"
              onClick={() => toast({ title: "Aanvraag ontvangen", description: "Wij nemen binnen 48 uur contact op." })}
            >
              <UserPlus className="h-4 w-4" />
              Toegang Aanvragen
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 flex justify-between items-center">
          <span>&copy; 2026 Resid</span>
          <div className="flex gap-4">
            <span className="hover:text-muted-foreground cursor-pointer">Privacy</span>
            <span className="hover:text-muted-foreground cursor-pointer">Voorwaarden</span>
          </div>
        </div>
      </div>

      {/* Right — Hero Image */}
      <div className="hidden md:block relative w-full flex-grow">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Luxury building" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-sm">Exclusief</span>
            <span className="text-sm font-medium text-gray-200">Kwalitatief vastgoed in topsteden</span>
          </div>
          <blockquote className="text-2xl font-display font-light italic leading-relaxed mb-4">
            "Elk object op ons platform is persoonlijk gecontroleerd en geanalyseerd door onze specialisten."
          </blockquote>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Gecontroleerd aanbod</span>
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Topsteden Nederland</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
