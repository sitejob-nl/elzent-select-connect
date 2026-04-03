import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SectionCard from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Check, ArrowLeft, MessageSquare, Heart, Eye,
  Loader2, FileText, Sheet, Map, Lock, ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProperty } from "@/hooks/useProperties";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useSubmitInterest, useInterestRequests } from "@/hooks/useInterest";
import { useToast } from "@/hooks/use-toast";

const formatPrice = (price: number | null) => {
  if (!price) return "–";
  if (price >= 1_000_000) return `€ ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `€ ${Math.round(price / 1_000)}K`;
  return `€ ${price}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

const DetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: property, isLoading } = useProperty(slug);
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const submitInterest = useSubmitInterest();
  const { data: interests } = useInterestRequests();
  const { toast } = useToast();
  const [interestMessage, setInterestMessage] = useState("");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 space-y-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 md:h-96 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground font-body">Object niet gevonden.</p>
          <Link to="/aanbod" className="text-primary hover:underline font-body mt-4 inline-block">
            Terug naar aanbod
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isFav = favorites?.has(property.id) ?? false;
  const hasInterest = interests?.some((i) => i.property_id === property.id) ?? false;
  const isNew = Date.now() - new Date(property.created_at).getTime() < 14 * 24 * 60 * 60 * 1000;
  const rentalIncome = property.price && property.bar_percentage
    ? Math.round(property.price * property.bar_percentage / 100)
    : null;

  const handleInterest = async () => {
    try {
      await submitInterest.mutateAsync({
        propertyId: property.id,
        message: interestMessage || undefined,
      });
      toast({ title: "Interesse gemeld", description: "Wij nemen spoedig contact met u op." });
      setInterestMessage("");
    } catch {
      toast({ title: "Fout", description: "Kon interesse niet melden. Probeer opnieuw.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body mb-6">
          <Link to="/aanbod" className="hover:text-primary transition-colors">Aanbod</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{property.title}</span>
        </div>

        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden mb-8 h-64 sm:h-80 lg:h-96">
          {property.image_url && (
            <img src={property.image_url} alt={property.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isNew && (
                <span className="px-2 py-1 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-sm">Nieuw</span>
              )}
              {property.match_score > 0 && (
                <span className="px-2 py-1 bg-white/20 text-white text-xs font-medium rounded-sm backdrop-blur-sm">{property.match_score}% Match</span>
              )}
              {property.property_type && (
                <span className="px-2 py-1 bg-primary/80 text-white text-xs font-medium rounded-sm backdrop-blur-sm">{property.property_type}</span>
              )}
              {property.view_count > 0 && (
                <span className="px-2 py-1 bg-white/10 text-white text-xs font-medium rounded-sm backdrop-blur-sm flex items-center gap-1">
                  <Heart className="h-3 w-3" />{property.view_count} keer bekeken
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-1">{property.title}</h1>
            <p className="text-gray-200">{property.location}</p>
          </div>
          {/* Thumbnail strip */}
          {property.image_url && (
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-white/40">
                <img src={property.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="w-14 h-14 rounded-lg bg-black/50 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold">
                +8
              </div>
            </div>
          )}
        </div>

        {/* Match Banner */}
        {property.match_score > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-5 py-3 mb-8 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-sm font-medium text-foreground">Waarom deze match?</span>
              <span className="text-sm text-muted-foreground ml-1">
                Dit object scoort {property.match_score}% op basis van uw investeringsprofiel — regio, budget en type vastgoed komen overeen.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8 stagger">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Investering", value: formatPrice(property.price) },
                { label: "BAR", value: property.bar_percentage ? `${property.bar_percentage}%` : "–", green: true },
                { label: "Huurinkomsten", value: rentalIncome ? formatCurrency(rentalIncome) : "–", sub: "per jaar" },
                { label: "Eenheden", value: property.units?.toString() ?? "–", sub: property.property_type ?? undefined },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-lg border border-border p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
                  <div className={`text-xl font-display font-bold ${s.green ? "text-emerald-600" : "text-foreground"}`}>{s.value}</div>
                  {s.sub && <div className="text-[0.65rem] text-muted-foreground">{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Beschrijving */}
            {property.description && (
              <SectionCard title="Project Beschrijving">
                <div className="text-sm leading-relaxed space-y-4">
                  {property.description.split("\n\n").map((para, i) => (
                    <p key={i} className="text-muted-foreground">{para}</p>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Tijdlijn */}
            {property.timeline.length > 0 && (
              <SectionCard title="Tijdlijn & Proces" label="Stappen tot eigendom">
                <div>
                  {property.timeline.map((t) => (
                    <div key={t.id} className="tl-item">
                      <div className={`tl-dot ${
                        t.is_active
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-card border-border"
                      }`} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-foreground">{t.step_title}</span>
                          {t.is_active && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-medium">
                              Nu mogelijk
                            </span>
                          )}
                          {!t.is_active && t.step_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(t.step_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        {t.step_description && (
                          <p className="text-sm text-muted-foreground">{t.step_description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Kenmerken */}
            <SectionCard title="Kenmerken">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  { label: "Type", value: property.property_type },
                  { label: "Locatie", value: `${property.city}` },
                  { label: "Oppervlakte", value: property.surface_area ? `${property.surface_area.toLocaleString("nl-NL")} m²` : null },
                  { label: "Eenheden", value: property.units?.toString() },
                  ...property.tags.map((tag) => {
                    const parts = tag.split(":");
                    return parts.length === 2
                      ? { label: parts[0].trim(), value: parts[1].trim() }
                      : { label: tag, value: "✓" };
                  }),
                ]
                  .filter((k) => k.value)
                  .map((k) => (
                    <div key={k.label} className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{k.label}</span>
                      <span className="font-medium text-foreground">{k.value}</span>
                    </div>
                  ))}
              </div>
            </SectionCard>

            {/* Financieel Overzicht */}
            {property.price && (
              <SectionCard title="Financieel Overzicht">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-3 border-b-2 border-primary/30">
                    <span className="font-bold text-foreground">Totale investering</span>
                    <span className="font-display font-bold text-foreground text-base">{formatCurrency(property.price)}</span>
                  </div>
                  {rentalIncome && (
                    <>
                      <div className="flex justify-between py-2 border-b border-border mt-2">
                        <span className="text-muted-foreground">Bruto huurinkomsten (jaar)</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(rentalIncome)}</span>
                      </div>
                    </>
                  )}
                  {property.bar_percentage && (
                    <div className="flex justify-between py-3 bg-emerald-50 -mx-6 px-6 rounded">
                      <span className="font-bold text-foreground">BAR</span>
                      <span className="font-display font-bold text-emerald-600 text-lg">{property.bar_percentage}%</span>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Documenten */}
            <SectionCard title="Documenten" noPadding>
              <div className="divide-y divide-border">
                {[
                  { icon: FileText, color: "text-red-500", name: "Investment Memorandum", size: "PDF · 4.2 MB" },
                  { icon: Sheet, color: "text-blue-500", name: "Financiële Prognose", size: "XLSX · 1.8 MB" },
                  { icon: Map, color: "text-emerald-500", name: "Plattegronden", size: "PDF · 12.6 MB" },
                ].map((doc) => (
                  <div
                    key={doc.name}
                    className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (hasInterest) {
                        toast({ title: "Binnenkort beschikbaar", description: "U ontvangt de documenten per e-mail." });
                      } else {
                        toast({ title: "Toon eerst uw interesse", description: "Documenten worden beschikbaar na het tonen van interesse." });
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <doc.icon className={`h-5 w-5 ${doc.color}`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{doc.name}</div>
                        <div className="text-xs text-muted-foreground">{doc.size}</div>
                      </div>
                    </div>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Tags */}
            {property.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {property.tags.filter((t) => !t.includes(":")).map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-body">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Interest CTA - Dark navy card */}
              <div className="bg-secondary text-secondary-foreground rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-display font-bold text-primary mb-1">Interesse in dit project?</h3>
                  <p className="text-gray-300 text-sm mb-5">
                    Toon uw interesse en wij nemen persoonlijk contact met u op.
                  </p>
                  <div className="space-y-3 mb-5">
                    {["Volledige documentatie ontvangen", "Bezichtiging inplannen", "Persoonlijk contact met ons team"].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm">
                        <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </span>
                        <span className="text-gray-200">{item}</span>
                      </div>
                    ))}
                  </div>

                  {hasInterest ? (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
                      <p className="font-body text-sm font-semibold text-white">Interesse gemeld ✓</p>
                      <p className="font-body text-xs text-gray-300">Wij nemen contact met u op.</p>
                    </div>
                  ) : (
                    <textarea
                      value={interestMessage}
                      onChange={(e) => setInterestMessage(e.target.value)}
                      placeholder="Optioneel: voeg een bericht toe..."
                      rows={3}
                      className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-600 bg-white/5 text-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none placeholder:text-gray-500"
                    />
                  )}
                </div>
                {!hasInterest && (
                  <button
                    onClick={handleInterest}
                    disabled={submitInterest.isPending}
                    className="w-full bg-primary px-6 py-4 hover:brightness-110 transition-all text-center cursor-pointer disabled:opacity-50"
                  >
                    {submitInterest.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
                    <span className="text-white font-bold uppercase tracking-wider text-sm">Interesse Tonen →</span>
                  </button>
                )}
              </div>

              {/* Status widget */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <h4 className="font-display font-bold text-foreground mb-4">Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Interesse fase</div>
                      <div className="text-xs text-muted-foreground">Huidige fase</div>
                    </div>
                  </div>
                  {property.view_count > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary/40 flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">{property.view_count} keer bekeken</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavorite.mutate({ propertyId: property.id, isFavorite: isFav })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-body transition-colors ${
                    isFav ? "border-red-400 text-red-400 bg-red-50" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFav ? "fill-red-400" : ""}`} />
                  {isFav ? "Opgeslagen" : "Opslaan"}
                </button>
              </div>

              {/* Contact card */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h4 className="font-display font-bold text-foreground mb-2">Vragen?</h4>
                <p className="text-sm text-muted-foreground mb-4">Neem direct contact op met ons team.</p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary font-display text-sm mr-3">WB</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Wessel Bollen</p>
                    <button className="text-xs text-primary hover:underline flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Stuur bericht
                    </button>
                  </div>
                </div>
              </div>

              {/* Back button */}
              <Link
                to="/aanbod"
                className="w-full py-3 px-4 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Terug naar aanbod
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DetailPage;
