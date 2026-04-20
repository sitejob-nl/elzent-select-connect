import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import PropertyCard from "@/components/PropertyCard";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import { Search } from "lucide-react";
import { PropertyListSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useProperties } from "@/hooks/useProperties";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";

const AanbodPage = () => {
  const [filter, setFilter] = useState<"matches" | "all">("matches");
  const [search, setSearch] = useState("");
  const {
    data: properties,
    isLoading,
    error: propertiesError,
    refetch: refetchProperties,
  } = useProperties();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const filtered = (properties ?? [])
    .filter((p) => {
      if (filter === "matches") return p.match_score > 0;
      return true;
    })
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.property_type ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.match_score - a.match_score);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Exclusief Aanbod</h1>
            <p className="text-muted-foreground font-body">
              Kwalitatief vastgoed, persoonlijk gecontroleerd door onze specialisten.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("matches")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                filter === "matches"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              }`}
            >
              Uw matches
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                filter === "all"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              }`}
            >
              Al het aanbod
            </button>
          </div>
        </div>

        <div className="relative max-w-xs mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoeken op naam, stad of type..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>

        {propertiesError ? (
          <ErrorState onRetry={() => refetchProperties()} />
        ) : isLoading ? (
          <PropertyListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-body">Geen objecten gevonden.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {filtered.map((p) => {
                const isFav = favorites?.has(p.id) ?? false;
                return (
                  <PropertyCard
                    key={p.slug}
                    slug={p.slug}
                    title={p.title}
                    location={p.location}
                    city={p.city}
                    imageUrl={p.image_url}
                    price={p.price}
                    propertyType={p.property_type}
                    matchScore={p.match_score}
                    createdAt={p.created_at}
                    isFavorite={isFav}
                    onToggleFavorite={() => toggleFavorite.mutate({ propertyId: p.id, isFavorite: isFav })}
                  />
                );
              })}
            </div>
            <DisclaimerFooter className="mt-10" />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default AanbodPage;
