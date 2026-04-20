import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SectionCard from "@/components/SectionCard";
import { MapPin, Home, Bell, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { ProfileSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import { usePreferences, useSavePreferences } from "@/hooks/usePreferences";
import { useRegions } from "@/hooks/useAdminRegions";
import { PROPERTY_TYPES, propertyTypeLabel } from "@/lib/taxonomy";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";
  const { data: prefs, isLoading } = usePreferences();
  const savePrefs = useSavePreferences();
  const { data: regions, isLoading: regionsLoading } = useRegions();

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [emailNotif, setEmailNotif] = useState(true);
  const [whatsappNotif, setWhatsappNotif] = useState(false);
  const [weeklyNotif, setWeeklyNotif] = useState(false);

  useEffect(() => {
    if (prefs) {
      setSelectedRegions(prefs.regions ?? []);
      setSelectedTypes(prefs.property_types ?? []);
      setEmailNotif(prefs.notify_email);
      setWhatsappNotif(prefs.notify_whatsapp);
      setWeeklyNotif(prefs.notify_weekly);
    }
  }, [prefs]);

  const toggleRegion = (r: string) => {
    setSelectedRegions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    if (selectedRegions.length === 0 || selectedTypes.length === 0) {
      toast.error("Selecteer minimaal één regio en één type", {
        description: "We gebruiken deze voorkeuren om uw matches te berekenen.",
      });
      return;
    }
    try {
      await savePrefs.mutateAsync({
        regions: selectedRegions,
        property_types: selectedTypes,
        notify_email: emailNotif,
        notify_whatsapp: whatsappNotif,
        notify_weekly: weeklyNotif,
      });
      toast.success("Profiel opgeslagen", {
        description: "Uw voorkeuren zijn bijgewerkt.",
      });
      if (onboarding) {
        navigate("/dashboard", { replace: true });
      }
    } catch {
      toast.error("Fout", { description: "Kon profiel niet opslaan. Probeer opnieuw." });
    }
  };

  if (isLoading || regionsLoading) {
    return (
      <AppLayout hideNav={onboarding}>
        <div className="container mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </AppLayout>
    );
  }

  const completeness = Math.min(100, Math.round(
    (selectedRegions.length > 0 ? 50 : 0) +
    (selectedTypes.length > 0 ? 50 : 0)
  ));

  const notifSummary = [
    emailNotif && "E-mail",
    whatsappNotif && "WhatsApp",
    weeklyNotif && "Weekoverzicht",
  ].filter(Boolean).join(" + ") || "Geen";

  return (
    <AppLayout hideNav={onboarding}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          {onboarding && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Welkom bij Resid — stel uw profiel in
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
            {onboarding ? "Welkom — vertel ons waar u in geïnteresseerd bent" : "Investeringsprofiel"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {onboarding
              ? "Op basis van uw voorkeuren krijgt u automatisch matches uit ons exclusieve aanbod. U kunt dit later altijd aanpassen."
              : "Stel uw voorkeuren in voor automatische matching met ons exclusieve aanbod."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-8 stagger">
            {/* Regio's */}
            <SectionCard title="Regio's" label="Locatie focus">
              <p className="text-sm text-muted-foreground mb-4">In welke steden bent u geïnteresseerd?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(regions ?? []).map((r) => (
                  <label
                    key={r.name}
                    className={`relative flex items-start py-3 px-4 border rounded cursor-pointer hover:bg-muted/50 transition-all ${
                      selectedRegions.includes(r.name)
                        ? "border-primary bg-gold-light"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium text-foreground">{r.name}</div>
                      {r.sub && (
                        <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
                      )}
                    </div>
                    <div className="ml-3 flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedRegions.includes(r.name)}
                        onChange={() => toggleRegion(r.name)}
                        className="h-5 w-5 rounded border-input text-primary focus:ring-primary"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </SectionCard>

            {/* Type Vastgoed */}
            <SectionCard title="Type Vastgoed" label="Wat zoekt u?">
              <div className="space-y-4">
                {PROPERTY_TYPES.map((t) => (
                  <div key={t.value} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(t.value)}
                        onChange={() => toggleType(t.value)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <div className="font-medium text-foreground">{t.label}</div>
                      <p className="text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Notificaties */}
            <SectionCard title="Notificaties" label="Hoe bereiken wij u?">
              <div className="space-y-5">
                {[
                  { label: "E-mail bij nieuwe match", desc: "Ontvang een e-mail met details bij een nieuw object.", state: emailNotif, set: setEmailNotif },
                  { label: "WhatsApp bij nieuwe match", desc: "Kort bericht via WhatsApp met de belangrijkste details.", state: whatsappNotif, set: setWhatsappNotif },
                  { label: "Weekoverzicht", desc: "Wekelijkse samenvatting van nieuw en gewijzigd aanbod.", state: weeklyNotif, set: setWeeklyNotif },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{n.label}</div>
                      <p className="text-muted-foreground text-xs">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => n.set(!n.state)}
                      className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ml-4 ${n.state ? "bg-primary" : "bg-muted"}`}
                    >
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${
                          n.state ? "translate-x-5 left-0.5" : "translate-x-0 left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Dark navy profile card */}
              <div className="bg-secondary text-secondary-foreground rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-xl font-display font-bold text-primary mb-1">Uw Profiel</h3>
                  <p className="text-gray-300 text-sm mb-6">
                    {onboarding ? "Vul minimaal regio en type in." : "Actief en zichtbaar voor ons team."}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-300">Match Potentieel</span>
                    <span className="text-sm font-bold text-white">{completeness >= 75 ? "Hoog" : completeness >= 50 ? "Gemiddeld" : "Laag"}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
                    <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
                  </div>

                  <div className="space-y-3 border-t border-gray-700 pt-4">
                    {selectedRegions.length > 0 && (
                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-200">{selectedRegions.join(", ")}</span>
                      </div>
                    )}
                    {selectedTypes.length > 0 && (
                      <div className="flex items-start text-sm">
                        <Home className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-200">{selectedTypes.slice(0, 3).map(propertyTypeLabel).join(", ")}{selectedTypes.length > 3 ? ` +${selectedTypes.length - 3}` : ""}</span>
                      </div>
                    )}
                    <div className="flex items-start text-sm">
                      <Bell className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-200">{notifSummary}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={savePrefs.isPending}
                  className="w-full bg-primary px-6 py-4 hover:brightness-110 transition-all text-center cursor-pointer disabled:opacity-50"
                >
                  {savePrefs.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
                  <span className="text-white font-bold uppercase tracking-wider text-sm">
                    {onboarding ? "Profiel activeren" : "Profiel Opslaan"}
                  </span>
                </button>
              </div>

              {/* Contact card */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h4 className="font-display font-bold text-foreground mb-2">Hulp nodig?</h4>
                <p className="text-sm text-muted-foreground mb-4">Neem contact op met ons team voor vragen over uw profiel of het aanbod.</p>
                <a
                  href="mailto:info@elzent.nl"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" /> Stuur ons een bericht
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
