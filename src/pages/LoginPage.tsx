import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Lock, UserPlus, Loader2, ShieldCheck, Building2, ArrowLeft, User, Briefcase, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSubmitAccessRequest } from "@/hooks/useAccessRequest";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-building.jpg";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, session, profile, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessName, setAccessName] = useState("");
  const [accessEmail, setAccessEmail] = useState("");
  const [accessCompany, setAccessCompany] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const submitAccess = useSubmitAccessRequest();
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await supabase.functions.invoke("request-password-reset", {
        body: { email: resetEmail.trim().toLowerCase() },
      });
    } catch (err) {
      // Swallow errors — we always show a generic success to avoid
      // leaking whether the email exists.
      console.error("request-password-reset invoke failed", err);
    }
    toast({
      title: "Herstel-link aangevraagd",
      description:
        "Als dit e-mailadres bij ons bekend is, sturen wij u een herstel-link.",
    });
    setShowResetForm(false);
    setResetEmail("");
    setResetLoading(false);
  };

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitAccess.mutateAsync({
        name: accessName,
        email: accessEmail,
        company: accessCompany || undefined,
        message: accessMessage || undefined,
      });
      toast({ title: "Aanvraag ontvangen", description: "Wij nemen binnen 48 uur contact met u op." });
      setShowAccessForm(false);
      setAccessName("");
      setAccessEmail("");
      setAccessCompany("");
      setAccessMessage("");
    } catch (err: any) {
      toast({ title: "Fout", description: err?.message || "Kon aanvraag niet versturen.", variant: "destructive" });
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
                onClick={() => {
                  setShowResetForm(true);
                  setResetEmail(email);
                }}
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

          {showResetForm && (
            <div className="mt-6 p-4 rounded-md border border-border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-sm font-semibold text-foreground">Wachtwoord herstellen</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    setResetEmail("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Sluiten"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Vul uw e-mailadres in. Als het bij ons bekend is, sturen wij een herstel-link.
              </p>
              <form onSubmit={handleResetRequest} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="naam@voorbeeld.nl"
                    required
                    className="w-full py-2.5 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  variant="gold"
                  className="w-full"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig...</>
                  ) : (
                    "Verstuur herstelmail"
                  )}
                </Button>
              </form>
            </div>
          )}

          {!showAccessForm ? (
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-1">Nog geen toegang?</p>
              <p className="text-xs text-muted-foreground/70 mb-3">
                Resid is uitsluitend toegankelijk op uitnodiging. Uw aanvraag wordt persoonlijk beoordeeld door ons team.
              </p>
              <button
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:opacity-80 text-sm"
                onClick={() => setShowAccessForm(true)}
              >
                <UserPlus className="h-4 w-4" />
                Toegang Aanvragen
              </button>
            </div>
          ) : (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-foreground">Toegang Aanvragen</h2>
                <button onClick={() => setShowAccessForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Vul uw gegevens in. Wij beoordelen uw aanvraag persoonlijk en nemen binnen 48 uur contact op.
              </p>
              <form onSubmit={handleAccessRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Naam *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={accessName}
                      onChange={(e) => setAccessName(e.target.value)}
                      placeholder="Uw volledige naam"
                      required
                      className="w-full py-2.5 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">E-mailadres *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={accessEmail}
                      onChange={(e) => setAccessEmail(e.target.value)}
                      placeholder="naam@voorbeeld.nl"
                      required
                      className="w-full py-2.5 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Bedrijf</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={accessCompany}
                      onChange={(e) => setAccessCompany(e.target.value)}
                      placeholder="Optioneel"
                      className="w-full py-2.5 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Bericht</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <textarea
                      value={accessMessage}
                      onChange={(e) => setAccessMessage(e.target.value)}
                      placeholder="Waarom bent u geïnteresseerd?"
                      rows={3}
                      className="w-full py-2.5 pl-10 pr-4 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="gold"
                  className="w-full"
                  disabled={submitAccess.isPending}
                >
                  {submitAccess.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig...</>
                  ) : (
                    "Aanvraag Versturen"
                  )}
                </Button>
              </form>
            </div>
          )}
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
