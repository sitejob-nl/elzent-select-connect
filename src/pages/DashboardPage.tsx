import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SectionCard from "@/components/SectionCard";
import MatchListItem from "@/components/MatchListItem";
import { Heart, Building2, Sparkles, type LucideIcon } from "lucide-react";
import { StatsSkeleton, MatchCardSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/contexts/AuthContext";
import { useProperties } from "@/hooks/useProperties";
import { useFavorites } from "@/hooks/useFavorites";
import { useInterestRequests } from "@/hooks/useInterest";
import { propertyTypeLabel } from "@/lib/taxonomy";

const DashboardPage = () => {
  const { profile } = useAuth();
  const {
    data: properties,
    isLoading,
    error: propertiesError,
    refetch: refetchProperties,
  } = useProperties();
  const {
    data: favorites,
    error: favoritesError,
    refetch: refetchFavorites,
  } = useFavorites();
  const {
    data: interests,
    error: interestsError,
    refetch: refetchInterests,
  } = useInterestRequests();
  const hasError = propertiesError || favoritesError || interestsError;

  const firstName = profile?.full_name?.split(" ")[0] ?? "Investeerder";
  const favoriteCount = favorites?.size ?? 0;
  const interestCount = interests?.length ?? 0;
  const totalSupply = (properties ?? []).length;

  const matches = (properties ?? [])
    .filter((p) => p.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 4);

  type DashboardStat = {
    label: string;
    value: string;
    sub: string;
    icon: LucideIcon;
    color: string;
    subColor: string;
    linkTo?: string;
  };

  const stats: DashboardStat[] = [
    { label: "Actieve Interesse", value: interestCount.toString(), sub: "Geregistreerde interesses", icon: Heart, color: "text-red-400", subColor: "text-muted-foreground" },
    {
      label: "Opgeslagen",
      value: favoriteCount.toString(),
      sub: favoriteCount === 0 ? "Nog geen favorieten" : "Bekijk lijst →",
      icon: Heart,
      color: "text-primary",
      subColor: favoriteCount === 0 ? "text-muted-foreground" : "text-primary",
      linkTo: "/favorieten",
    },
    {
      label: "Totaal aanbod",
      value: totalSupply.toString(),
      sub: totalSupply === 0 ? "Geen aanbod" : "Bekijk aanbod →",
      icon: Building2,
      color: "text-primary",
      subColor: totalSupply === 0 ? "text-muted-foreground" : "text-primary",
      linkTo: "/aanbod",
    },
    { label: "Nieuwe Matches", value: matches.length.toString(), sub: "Bekijk aanbod →", icon: Sparkles, color: "text-primary", subColor: "text-primary", linkTo: "/aanbod" },
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

        {hasError && (
          <ErrorState
            onRetry={() => {
              refetchProperties();
              refetchFavorites();
              refetchInterests();
            }}
          />
        )}

        {/* Stats */}
        {!hasError && (isLoading ? (
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
                  {s.linkTo ? (
                    <Link to={s.linkTo} className="hover:underline">{s.sub}</Link>
                  ) : s.sub}
                </p>
              </div>
            ))}
          </div>
        ))}

        {/* Recent matches as list */}
        {!hasError && (isLoading ? (
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
                  imageUrl={m.image_url}
                />
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
