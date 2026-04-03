import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Heart, Search } from "lucide-react";
import { PropertyListSkeleton } from "@/components/Skeletons";
import { useProperties } from "@/hooks/useProperties";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";

const formatPrice = (price: number | null) => {
  if (!price) return "–";
  if (price >= 1_000_000) return `€ ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `€ ${(price / 1_000).toFixed(0)}K`;
  return `€ ${price}`;
};

const AanbodPage = () => {
  const [filter, setFilter] = useState<"matches" | "all">("matches");
  const [search, setSearch] = useState("");
  const { data: properties, isLoading } = useProperties();
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
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">Exclusief Aanbod</h1>
          <p className="text-muted-foreground font-body mt-1">
            Kwalitatief vastgoed, persoonlijk gecontroleerd door onze specialisten.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("matches")}
                className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${
                  filter === "matches" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Uw matches
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${
                  filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Al het aanbod
              </button>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoeken op naam, stad of type..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <PropertyListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-body">Geen objecten gevonden.</p>
          </div>
        ) : (
          <div className="space-y-5 stagger">
            {filtered.map((p) => {
              const isFav = favorites?.has(p.id) ?? false;
              return (
                <div
                  key={p.slug}
                  className="group flex flex-col md:flex-row rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all animate-fade-in-up"
                >
                  <Link to={`/aanbod/${p.slug}`} className="md:w-72 h-48 md:h-auto overflow-hidden relative block">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {p.match_score > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-card/90 backdrop-blur text-foreground text-xs font-body font-semibold">
                          {p.match_score}% Match
                        </span>
                      )}
                      {p.property_type && (
                        <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-body font-semibold">
                          {p.property_type}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 p-5 md:p-6">
                    <div className="flex items-start justify-between">
                      <Link to={`/aanbod/${p.slug}`}>
                        <h3 className="font-display text-lg font-semibold text-foreground">{p.title}</h3>
                        <p className="text-sm text-muted-foreground font-body mt-1">{p.location}</p>
                      </Link>
                      <button
                        onClick={() => toggleFavorite.mutate({ propertyId: p.id, isFavorite: isFav })}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                      >
                        <Heart className={`h-5 w-5 ${isFav ? "fill-red-400 text-red-400" : "text-muted-foreground"}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-body">Investering</p>
                        <p className="font-display font-bold text-foreground">{formatPrice(p.price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-body">BAR</p>
                        <p className="font-display font-bold text-emerald-600">{p.bar_percentage ? `${p.bar_percentage}%` : "–"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-body">Type</p>
                        <p className="font-body font-semibold text-foreground">{p.property_type ?? "–"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground font-body">
                        {new Date(p.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <Link to={`/aanbod/${p.slug}`} className="text-sm text-primary font-body font-semibold hover:underline">
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AanbodPage;
