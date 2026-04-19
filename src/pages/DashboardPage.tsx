import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SectionCard from "@/components/SectionCard";
import MatchListItem from "@/components/MatchListItem";
import { Heart, TrendingUp, Sparkles, Wallet } from "lucide-react";
import { StatsSkeleton, MatchCardSkeleton } from "@/components/Skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useProperties } from "@/hooks/useProperties";
import { useFavorites } from "@/hooks/useFavorites";
import { useInterestRequests } from "@/hooks/useInterest";
import { propertyTypeLabel } from "@/lib/taxonomy";

const DashboardPage = () => {
  const { profile } = useAuth();
  const { data: properties, isLoading } = useProperties();
  const { data: favorites } = useFavorites();
  const { data: interests } = useInterestRequests();

  const firstName = profile?.full_name?.split(" ")[0] ?? "Investeerder";
  const favoriteCount = favorites?.size ?? 0;
  const interestCount = interests?.length ?? 0;

  const matches = (properties ?? [])
    .filter((p) => p.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 4);

  const withBar = (properties ?? []).filter((p) => p.bar_percentage);
  const avgBar = withBar.length > 0
    ? (withBar.reduce((sum, p) => sum + (p.bar_percentage ?? 0), 0) / withBar.length).toFixed(1)
    : "–";

  // Portfolio value: sum of prices of properties where user has shown interest
  const portfolioValue = interests?.reduce((sum, ir) => {
    const prop = properties?.find((p) => p.id === ir.property_id);
    return sum + (prop?.price ?? 0);
  }, 0) ?? 0;

  const formatPortfolio = (v: number) => {
    if (v === 0) return "–";
    if (v >= 1_000_000) return `€ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `€ ${Math.round(v / 1_000)}K`;
    return `€ ${v}`;
  };

  const stats = [
    { label: "Actieve Interesse", value: interestCount.toString(), sub: "Geregistreerde interesses", icon: Heart, color: "text-red-400", subColor: "text-muted-foreground" },
    { label: "Portfolio Waarde", value: formatPortfolio(portfolioValue), sub: "Totale interesse", icon: Wallet, color: "text-primary", subColor: "text-muted-foreground" },
    { label: "Gem. BAR", value: avgBar === "–" ? avgBar : `${avgBar}%`, sub: "Bruto aanvangsrendement", icon: TrendingUp, color: "text-primary", subColor: "text-muted-foreground" },
    { label: "Nieuwe Matches", value: matches.length.toString(), sub: "Bekijk aanbod →", icon: Sparkles, color: "text-primary", subColor: "text-primary" },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">
            Welkom terug, {firstName}
          </h1>
          <p className="text-muted-foreground font-body">Uw overzicht van vandaag.</p>
        </div>

        {/* Stats */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 stagger">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-card rounded-lg border border-border p-5 shadow-sm animate-fade-in-up"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-body">{s.label}</span>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                <p className={`text-xs mt-1 ${s.subColor}`}>
                  {s.label === "Nieuwe Matches" ? (
                    <Link to="/aanbod" className="hover:underline">{s.sub}</Link>
                  ) : s.sub}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Recent matches as list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <SectionCard title="Recente Matches">
            <div className="text-center py-6">
              <p className="text-muted-foreground font-body">
                Nog geen matches. Stel uw <Link to="/profiel" className="text-primary hover:underline">investeringsprofiel</Link> in.
              </p>
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Recente Matches" noPadding>
            <div className="divide-y divide-border">
              {matches.map((m) => (
                <MatchListItem
                  key={m.slug}
                  slug={m.slug}
                  title={m.title}
                  location={`${m.location} · ${m.units ? `${m.units} eenheden` : propertyTypeLabel(m.property_type)}`}
                  matchReason={`Match: ${m.match_score}% op basis van uw profiel`}
                  price={m.price}
                  barPercentage={m.bar_percentage}
                  imageUrl={m.image_url}
                />
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
