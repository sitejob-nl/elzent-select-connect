import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { PropertyListSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import { useProperties } from "@/hooks/useProperties";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";

const FavorietenPage = () => {
  const {
    data: properties,
    isLoading: propertiesLoading,
    error: propertiesError,
    refetch: refetchProperties,
  } = useProperties();
  const {
    data: favorites,
    isLoading: favoritesLoading,
    error: favoritesError,
    refetch: refetchFavorites,
  } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const isLoading = propertiesLoading || favoritesLoading;
  const hasError = propertiesError || favoritesError;

  const favorited = (properties ?? [])
    .filter((p) => !p.deleted_at && (favorites?.has(p.id) ?? false))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">
            Opgeslagen Objecten
          </h1>
          <p className="text-muted-foreground font-body">
            Uw persoonlijke shortlist — objecten die u interessant vond.
          </p>
        </div>

        {hasError ? (
          <ErrorState
            onRetry={() => {
              refetchProperties();
              refetchFavorites();
            }}
          />
        ) : isLoading ? (
          <PropertyListSkeleton />
        ) : favorited.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <Heart className="size-12 text-muted-foreground/60 mb-4" aria-hidden="true" />
            <h2 className="font-display font-bold text-xl text-foreground mb-2">
              Nog geen opgeslagen objecten
            </h2>
            <p className="text-muted-foreground font-body max-w-sm mb-6">
              Klik op het hartje bij een object in het aanbod om het hier op te slaan.
            </p>
            <Button asChild>
              <Link to="/aanbod">Naar het aanbod</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {favorited.map((p) => (
              <PropertyCard
                key={p.id}
                slug={p.slug}
                title={p.title}
                location={p.location}
                city={p.city}
                imageUrl={p.image_url}
                price={p.price}
                propertyType={p.property_type}
                matchScore={p.match_score}
                createdAt={p.created_at}
                isFavorite={true}
                onToggleFavorite={() =>
                  toggleFavorite.mutate({ propertyId: p.id, isFavorite: favorites?.has(p.id) ?? true })
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FavorietenPage;
