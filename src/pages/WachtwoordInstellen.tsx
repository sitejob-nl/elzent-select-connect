import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, Eye, EyeOff, ShieldCheck, Building2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heroImg from "@/assets/hero-building.jpg";

type LinkType = "recovery" | "invite";

type Status = "verifying" | "ready" | "invalid" | "submitting";

const WachtwoordInstellen = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = params.get("token");
  const typeParam = params.get("type");
  const type: LinkType | null =
    typeParam === "recovery" || typeParam === "invite" ? typeParam : null;

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const missingParams = !token || !type;

  useEffect(() => {
    if (missingParams) {
      setStatus("invalid");
      setErrorMessage(
        "Ongeldige link — vraag een nieuwe uitnodiging of wachtwoord-herstel aan.",
      );
      return;
    }

    let cancelled = false;
    (async () => {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type,
      });
      if (cancelled) return;
      if (error) {
        setStatus("invalid");
        setErrorMessage("Deze link is verlopen of al gebruikt.");
        return;
      }
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [token, type, missingParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password.length < 8) {
      setValidationError("Wachtwoord moet minimaal 8 tekens bevatten.");
      return;
    }
    if (password !== passwordConfirm) {
      setValidationError("Wachtwoorden komen niet overeen.");
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("ready");
      toast({
        title: "Kon wachtwoord niet instellen",
        description: error.message || "Probeer het opnieuw.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Wachtwoord ingesteld",
      description: "Welkom bij Resid.",
    });
    navigate("/dashboard", { replace: true });
  };

  const title =
    type === "invite"
      ? "Welkom bij Resid, stel uw wachtwoord in"
      : "Stel een nieuw wachtwoord in";

  const subtitle =
    type === "invite"
      ? "Kies een sterk wachtwoord om uw account te activeren."
      : "Kies een nieuw wachtwoord voor uw account.";

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {/* Left — Form */}
      <div className="w-full md:w-[480px] lg:w-[560px] flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-card shadow-xl z-10 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="text-primary">
            <svg fill="none" height="36" viewBox="0 0 24 24" width="36">
              <path
                d="M4 4L12 8L20 4M4 4V16L12 20M4 4L12 2L20 4M20 4V16L12 20M12 8V20"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-display font-bold tracking-widest text-foreground uppercase">
              Resid
            </span>
            <span className="text-[0.6rem] font-medium tracking-[0.15em] text-muted-foreground">
              Powered by Elzent Estates
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="mt-12 mb-12 flex-grow flex flex-col justify-center">
          {status === "verifying" && (
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-sm">
                Bezig met verifiëren van uw link…
              </p>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center">
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-3">
                  Link werkt niet
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {errorMessage}
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:opacity-80 text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Terug naar inloggen
              </Link>
            </div>
          )}

          {(status === "ready" || status === "submitting") && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-2">
                  {title}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {subtitle}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Wachtwoord
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimaal 8 tekens"
                      autoComplete="new-password"
                      required
                      className="w-full py-3 pl-10 pr-10 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Bevestig wachtwoord
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Herhaal uw wachtwoord"
                      autoComplete="new-password"
                      required
                      className="w-full py-3 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                  {validationError && (
                    <p className="mt-2 text-xs text-destructive">
                      {validationError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full transform hover:scale-[1.02] transition-all duration-200"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig...
                    </>
                  ) : type === "invite" ? (
                    "Account activeren"
                  ) : (
                    "Wachtwoord opslaan"
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Terug naar inloggen
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 flex justify-between items-center">
          <span>&copy; 2026 Resid</span>
          <div className="flex gap-4">
            <span className="hover:text-muted-foreground cursor-pointer">
              Privacy
            </span>
            <span className="hover:text-muted-foreground cursor-pointer">
              Voorwaarden
            </span>
          </div>
        </div>
      </div>

      {/* Right — Hero Image */}
      <div className="hidden md:block relative w-full flex-grow">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Luxury building"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-sm">
              Exclusief
            </span>
            <span className="text-sm font-medium text-gray-200">
              Kwalitatief vastgoed in topsteden
            </span>
          </div>
          <blockquote className="text-2xl font-display font-light italic leading-relaxed mb-4">
            "Elk object op ons platform is persoonlijk gecontroleerd en
            geanalyseerd door onze specialisten."
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

export default WachtwoordInstellen;
