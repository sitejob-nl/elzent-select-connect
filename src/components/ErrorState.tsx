import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onRetry?: () => void;
  message?: string;
};

/**
 * Shared error-state block for list pages (Favorieten, Aanbod, Dashboard).
 * Renders when a React Query hook returns an error so users don't confuse a
 * fetch failure with an empty result.
 */
export const ErrorState = ({ onRetry, message }: Props) => {
  return (
    <div className="text-center py-20 flex flex-col items-center">
      <AlertCircle className="size-12 text-muted-foreground/60 mb-4" aria-hidden="true" />
      <h2 className="font-display font-bold text-xl text-foreground mb-2">
        Er ging iets mis
      </h2>
      <p className="text-muted-foreground font-body max-w-sm mb-6">
        {message ?? "Kon gegevens niet laden. Probeer het zo opnieuw."}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Opnieuw proberen
        </Button>
      )}
    </div>
  );
};
