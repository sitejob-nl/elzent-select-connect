import { Link } from "react-router-dom";
import { Sparkles, Heart } from "lucide-react";
import { propertyTypeLabel } from "@/lib/taxonomy";
import { formatCirca } from "@/lib/format";

interface PropertyCardProps {
  slug: string;
  title: string;
  location: string;
  city: string;
  imageUrl: string | null;
  price: number | null;
  propertyType: string | null;
  matchScore: number;
  createdAt: string;
  viewCount?: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const isNew = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 14 * 24 * 60 * 60 * 1000; // 14 days
};

const timeAgo = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Vandaag";
  if (days === 1) return "Gisteren";
  if (days < 7) return `${days} dagen geleden`;
  if (days < 14) return "1 week geleden";
  if (days < 30) return `${Math.floor(days / 7)} weken geleden`;
  return new Date(createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
};

const PropertyCard = ({
  slug,
  title,
  location,
  imageUrl,
  price,
  propertyType,
  matchScore,
  createdAt,
  viewCount,
  isFavorite,
  onToggleFavorite,
}: PropertyCardProps) => (
  <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 animate-fade-in-up">
    <Link to={`/aanbod/${slug}`} className="relative h-48 overflow-hidden block">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-muted" />
      )}
      {/* Top-left badges */}
      <div className="absolute top-3 left-3 flex gap-1.5">
        {isNew(createdAt) && (
          <span className="px-2 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-sm">
            Nieuw
          </span>
        )}
        {propertyType && (
          <span className="px-2 py-1 bg-primary/80 text-white text-xs font-medium rounded-sm backdrop-blur-sm">
            {propertyTypeLabel(propertyType)}
          </span>
        )}
      </div>
      {/* Top-right: match score */}
      {matchScore > 0 && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-sm backdrop-blur-sm">
            {matchScore}% Match
          </span>
        </div>
      )}
      {/* Bottom-left: social proof */}
      {viewCount !== undefined && viewCount > 0 && (
        <div className="absolute bottom-3 left-3">
          <span className="px-2 py-0.5 bg-card/90 text-xs text-muted-foreground rounded backdrop-blur-sm flex items-center gap-1">
            <Heart className="h-3 w-3 text-primary" />
            {viewCount} keer bekeken
          </span>
        </div>
      )}
    </Link>

    <div className="p-5">
      <div className="flex items-start justify-between">
        <Link to={`/aanbod/${slug}`}>
          <h3 className="font-display font-bold text-foreground text-lg mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{location}</p>
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); onToggleFavorite(); }}
          className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0 ml-2"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-400 text-red-400" : "text-muted-foreground"}`} />
        </button>
      </div>

      {matchScore > 0 && (
        <p className="text-xs text-primary mt-2 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Match op basis van uw profiel
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <div className="text-xs text-muted-foreground">Investering</div>
          <div className="font-display font-bold text-foreground text-sm">{formatCirca(price)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Type</div>
          <div className="font-display font-bold text-foreground text-sm">{propertyType ? propertyTypeLabel(propertyType) : "–"}</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">{timeAgo(createdAt)}</span>
        <Link to={`/aanbod/${slug}`} className="text-primary text-sm font-medium hover:underline">
          Details →
        </Link>
      </div>
    </div>
  </div>
);

export default PropertyCard;
