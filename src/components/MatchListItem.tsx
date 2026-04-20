import { Link } from "react-router-dom";
import { formatCirca } from "@/lib/format";

interface MatchListItemProps {
  slug: string;
  title: string;
  location: string;
  matchReason?: string;
  price: number | null;
  imageUrl: string | null;
}

const MatchListItem = ({ slug, title, location, matchReason, price, imageUrl }: MatchListItemProps) => (
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
      <div className="text-sm font-bold text-foreground font-display">{formatCirca(price)}</div>
    </div>
  </Link>
);

export default MatchListItem;
