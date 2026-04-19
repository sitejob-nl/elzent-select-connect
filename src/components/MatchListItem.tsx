import { Link } from "react-router-dom";

interface MatchListItemProps {
  slug: string;
  title: string;
  location: string;
  matchReason?: string;
  price: number | null;
  barPercentage: number | null;
  imageUrl: string | null;
}

const formatPrice = (price: number | null) => {
  if (!price) return "–";
  if (price >= 1_000_000) return `€ ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `€ ${Math.round(price / 1_000)}K`;
  return `€ ${price}`;
};

const MatchListItem = ({ slug, title, location, matchReason, price, barPercentage, imageUrl }: MatchListItemProps) => (
  <Link
    to={`/aanbod/${slug}`}
    className="px-6 py-5 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        {imageUrl && (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
      <div>
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{location}</p>
        {matchReason && (
          <p className="text-xs text-primary mt-0.5">{matchReason}</p>
        )}
      </div>
    </div>
    <div className="text-right hidden sm:block">
      <div className="text-sm font-bold text-foreground font-display">{formatPrice(price)}</div>
      {barPercentage && (
        <div className="text-xs text-primary">BAR {barPercentage}%</div>
      )}
    </div>
  </Link>
);

export default MatchListItem;
