import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { MapPin, Home, PiggyBank, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePreferences, useSavePreferences } from "@/hooks/usePreferences";

const regions = [
  { name: "Eindhoven", sub: "Brainport regio" },
  { name: "'s-Hertogenbosch", sub: "Historisch centrum" },
  { name: "Tilburg", sub: "Logistieke hotspot" },
  { name: "Breda", sub: "West-Brabant" },
];

const types = ["Transformatie", "Nieuwbouw", "Bestaand beleggingspand", "Kamerverhuur"];

const BUDGET_MIN = 100_000;
const BUDGET_MAX = 5_000_000;
const BAR_MIN = 2;
const BAR_MAX = 10;

const ProfilePage = () => {
  const { data: prefs, isLoading } = usePreferences();
  const savePrefs = useSavePreferences();

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState(500_000);
  const [budgetMax, setBudgetMax] = useState(2_500_000);
  const [minBar, setMinBar] = useState(5.5);
  const [emailNotif, setEmailNotif] = useState(false);
  const [whatsappNotif, setWhatsappNotif] = useState(false);
  const [weeklyNotif, setWeeklyNotif] = useState(false);

  // Load saved preferences
  useEffect(() => {
    if (prefs) {
      setSelectedRegions(prefs.regions ?? []);
      setSelectedTypes(prefs.property_types ?? []);
      setBudgetMin(prefs.budget_min ?? 500_000);
      setBudgetMax(prefs.budget_max ?? 2_500_000);
      setMinBar(prefs.min_bar ?? 5.5);
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
    try {
      await savePrefs.mutateAsync({
        regions: selectedRegions,
        property_types: selectedTypes,
        budget_min: budgetMin,
        budget_max: budgetMax,
        min_bar: minBar,
        notify_email: emailNotif,
        notify_whatsapp: whatsappNotif,
        notify_weekly: weeklyNotif,
      });
      toast.success("Profiel opgeslagen", { description: "Uw voorkeuren zijn bijgewerkt." });
    } catch {
      toast.error("Fout", { description: "Kon profiel niet opslaan. Probeer opnieuw." });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const budgetSliderValue = Math.round(((budgetMax - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100);
  const barSliderValue = Math.round(((minBar - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100);

  const formatBudget = (v: number) => {
    if (v >= 1_000_000) return `€ ${(v / 1_000_000).toFixed(1)}m`;
    return `€ ${(v / 1_000).toFixed(0)}k`;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Investeringsprofiel</h1>
        <p className="text-muted-foreground font-body mt-1">Voorkeuren voor automatische matching.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Regions */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display font-semibold text-foreground mb-4">Regio's</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {regions.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => toggleRegion(r.name)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedRegions.includes(r.name)
                        ? "border-primary bg-gold-light"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <p className="font-body font-semibold text-foreground text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground font-body">{r.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Types */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display font-semibold text-foreground mb-4">Type Vastgoed</h2>
              <div className="space-y-2">
                {types.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(t)}
                      onChange={() => toggleType(t)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="font-body text-sm text-foreground">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Financial */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display font-semibold text-foreground mb-4">Financieel Kader</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-body text-muted-foreground">Investeringsbudget</label>
                    <span className="text-sm font-body font-semibold text-foreground">{formatBudget(budgetMin)} – {formatBudget(budgetMax)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={budgetSliderValue}
                    onChange={(e) => {
                      const pct = Number(e.target.value) / 100;
                      const max = Math.round(BUDGET_MIN + pct * (BUDGET_MAX - BUDGET_MIN));
                      setBudgetMax(max);
                      if (budgetMin > max) setBudgetMin(max);
                    }}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-body mt-1">
                    <span>{formatBudget(BUDGET_MIN)}</span>
                    <span>{formatBudget(BUDGET_MAX)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-body text-muted-foreground">Minimaal BAR</label>
                    <span className="text-sm font-body font-semibold text-foreground">{minBar.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={barSliderValue}
                    onChange={(e) => {
                      const pct = Number(e.target.value) / 100;
                      setMinBar(Math.round((BAR_MIN + pct * (BAR_MAX - BAR_MIN)) * 10) / 10);
                    }}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-body mt-1">
                    <span>{BAR_MIN}%</span>
                    <span>{BAR_MAX}%+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display font-semibold text-foreground mb-4">Notificaties</h2>
              <div className="space-y-4">
                {[
                  { label: "E-mail bij nieuwe match", state: emailNotif, set: setEmailNotif },
                  { label: "WhatsApp bij nieuwe match", state: whatsappNotif, set: setWhatsappNotif },
                  { label: "Weekoverzicht", state: weeklyNotif, set: setWeeklyNotif },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between">
                    <span className="font-body text-sm text-foreground">{n.label}</span>
                    <button
                      onClick={() => n.set(!n.state)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${n.state ? "bg-primary" : "bg-muted"}`}
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
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-1">Uw Profiel</h3>
              <p className="text-xs text-muted-foreground font-body mb-4">Actief en zichtbaar voor ons team.</p>

              <div className="space-y-3">
                {selectedRegions.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selectedRegions.join(", ")}
                  </div>
                )}
                {selectedTypes.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                    <Home className="h-4 w-4 text-primary" />
                    {selectedTypes.join(", ")}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                  <PiggyBank className="h-4 w-4 text-primary" />
                  Budget tot {formatBudget(budgetMax)}
                </div>
              </div>

              <Button
                variant="gold"
                className="w-full mt-6"
                onClick={handleSave}
                disabled={savePrefs.isPending}
              >
                {savePrefs.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Profiel Opslaan
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-body font-semibold text-foreground text-sm mb-3">Hulp nodig?</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-secondary-foreground">WB</span>
                </div>
                <div>
                  <p className="font-body font-semibold text-foreground text-sm">Wessel Bollen</p>
                  <button className="text-xs text-primary font-body hover:underline flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Stuur bericht
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
