import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Heart, TrendingUp, Sparkles } from "lucide-react";
import { StatsSkeleton, MatchCardSkeleton } from "@/components/Skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useProperties } from "@/hooks/useProperties";
import { useFavorites } from "@/hooks/useFavorites";
import { useInterestRequests } from "@/hooks/useInterest";

const formatPrice = (price: number | null) => {
  if (!price) return "–";
  if (price >= 1_000_000) return `€ ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `€ ${Math.round(price / 1_000)}K`;
  return `€ ${price}`;
};

const DashboardPage = () => {
  const { profile } = useAuth();
  const { data: properties, isLoading } = useProperties();
  const { data: favorites } = useFavorites();
  const { data: interests } = useInterestRequests();

  const firstName = profile?.full_name?.split(" ")[0] ?? "Investeerder";
  const favoriteCount = favorites?.size ?? 0;
  const interestCount = interests?.length ?? 0;

  // Top matches sorted by score
  const matches = (properties ?? [])
    .filter((p) => p.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 4);

  // Average BAR of all published properties
  const avgBar = properties?.length
    ? (properties.reduce((sum, p) => sum + (p.bar_percentage ?? 0), 0) / properties.filter((p) => p.bar_percentage).length).toFixed(1)
    : "–";

  const stats = [
    { label: "Actieve Interesse", value: interestCount.toString(), sub: "Lopende aanvragen", icon: Heart, color: "text-red-400" },
    { label: "Favorieten", value: favoriteCount.toString(), sub: "Opgeslagen objecten", icon: Heart, color: "text-primary" },
    { label: "Gem. BAR", value: `${avgBar}%`, sub: "Bruto aanvangsrendement", icon: TrendingUp, color: "text-emerald-500" },
    { label: "Nieuwe Matches", value: matches.length.toString(), sub: "Bekijk aanbod →", icon: Sparkles, color: "text-primary" },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welkom terug, <span className="text-primary">{firstName}</span>
        </h1>
        <p className="text-muted-foreground font-body mt-1">Uw overzicht van vandaag.</p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 stagger">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow animate-fade-in-up"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-body">{s.label}</span>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent matches */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-semibold text-foreground">Recente Matches</h2>
            <Link to="/aanbod" className="text-sm text-primary font-body hover:underline">Bekijk alles →</Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 2 }).map((_, i) => <MatchCardSkeleton key={i} />)}
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground font-body">
                Nog geen matches. Stel uw <Link to="/profiel" className="text-primary hover:underline">investeringsprofiel</Link> in.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {matches.map((m) => (
                <Link
                  key={m.slug}
                  to={`/aanbod/${m.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="h-44 overflow-hidden relative">
                    {m.image_url && (
                      <img
                        src={m.image_url}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-card/90 backdrop-blur text-foreground text-xs font-body font-semibold">
                        {m.match_score}% Match
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display font-semibold text-foreground">{m.title}</h3>
                    <p className="text-sm text-muted-foreground font-body mt-1">{m.location}</p>
                    <div className="flex items-center gap-4 mt-4">
                      <span className="font-display font-bold text-foreground">{formatPrice(m.price)}</span>
                      {m.bar_percentage && (
                        <span className="text-sm text-emerald-600 font-body">BAR {m.bar_percentage}%</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
