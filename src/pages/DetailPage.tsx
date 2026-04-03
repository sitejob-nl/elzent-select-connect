import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, ArrowLeft, MessageSquare, Heart, Eye } from "lucide-react";
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
          <Skeleton className="h-64 md:h-96 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-32 rounded-xl" />
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
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body mb-6">
          <Link to="/aanbod" className="hover:text-primary transition-colors">Aanbod</Link>
          <span>/</span>
          <span className="text-foreground">{property.title}</span>
        </div>

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden relative h-64 md:h-96 mb-8">
          {property.image_url && (
            <img src={property.image_url} alt={property.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex gap-2 mb-3">
              {property.match_score > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-card/80 backdrop-blur text-foreground text-xs font-body">{property.match_score}% Match</span>
              )}
              {property.property_type && (
                <span className="px-2.5 py-1 rounded-full bg-card/80 backdrop-blur text-foreground text-xs font-body">{property.property_type}</span>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">{property.title}</h1>
            <p className="text-primary-foreground/70 font-body mt-1">{property.location}</p>
          </div>
        </div>

        {/* Match Banner */}
        {property.match_score > 0 && (
          <div className="rounded-xl bg-gold-light border border-primary/20 p-4 flex items-start gap-3 mb-8">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-body font-semibold text-foreground text-sm">Waarom deze match?</p>
              <p className="font-body text-muted-foreground text-sm">
                Dit object scoort {property.match_score}% op basis van uw investeringsprofiel.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Investering", value: formatPrice(property.price) },
                { label: "BAR", value: property.bar_percentage ? `${property.bar_percentage}%` : "–" },
                { label: "Oppervlakte", value: property.surface_area ? `${property.surface_area} m²` : "–" },
                { label: "Eenheden", value: property.units?.toString() ?? "–" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-card border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                  <p className="text-xl font-display font-bold text-foreground mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground mb-3">Project Beschrijving</h2>
                <p className="font-body text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
                  {property.description}
                </p>
              </div>
            )}

            {/* Timeline */}
            {property.timeline.length > 0 && (
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground mb-4">Tijdlijn & Proces</h2>
                <div className="space-y-0">
                  {property.timeline.map((t, i) => (
                    <div key={t.id} className="relative pl-8 pb-6 last:pb-0">
                      {i < property.timeline.length - 1 && (
                        <div className="absolute left-[0.45rem] top-6 bottom-0 w-0.5 bg-border" />
                      )}
                      <div className={`absolute left-0 top-1 h-4 w-4 rounded-full border-2 ${
                        t.is_active ? "border-primary bg-primary" : "border-border bg-card"
                      }`} />
                      <h3 className="font-body font-semibold text-foreground text-sm">{t.step_title}</h3>
                      {t.step_date && (
                        <p className="text-xs text-primary font-body">
                          {new Date(t.step_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                      {t.step_description && (
                        <p className="text-sm text-muted-foreground font-body mt-1">{t.step_description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {property.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {property.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-body">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-3">Interesse in dit project?</h3>
              <p className="text-sm text-muted-foreground font-body mb-4">
                Toon uw interesse en wij nemen persoonlijk contact met u op.
              </p>
              <ul className="space-y-2 mb-5">
                {["Volledige documentatie ontvangen", "Bezichtiging inplannen", "Persoonlijk contact met ons team"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-body text-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              {hasInterest ? (
                <div className="rounded-lg bg-gold-light border border-primary/20 p-3 text-center">
                  <p className="font-body text-sm font-semibold text-foreground">Interesse gemeld</p>
                  <p className="font-body text-xs text-muted-foreground">Wij nemen contact met u op.</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={interestMessage}
                    onChange={(e) => setInterestMessage(e.target.value)}
                    placeholder="Optioneel: voeg een bericht toe..."
                    rows={3}
                    className="w-full mb-3 px-3 py-2 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                  />
                  <Button
                    variant="gold"
                    size="lg"
                    className="w-full"
                    onClick={handleInterest}
                    disabled={submitInterest.isPending}
                  >
                    {submitInterest.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Interesse Tonen →
                  </Button>
                </>
              )}
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

            {/* View count (schaarste-indicator) */}
            {property.view_count > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                <Eye className="h-4 w-4" />
                Dit object is {property.view_count} keer bekeken
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-body font-semibold text-foreground text-sm mb-3">Vragen?</h3>
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

            <Link
              to="/aanbod"
              className="flex items-center gap-2 text-sm text-muted-foreground font-body hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Terug naar aanbod
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DetailPage;
