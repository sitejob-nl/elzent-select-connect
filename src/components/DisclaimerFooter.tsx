import { AlertTriangle } from "lucide-react";

/**
 * Shown beneath property cards / property-detail blocks. Meeting 20 apr
 * 2026: Elzent wil expliciet aangeven dat alle getallen indicatief zijn
 * en dat klanten zelf verantwoordelijk zijn voor hun due diligence — wij
 * kunnen niets garanderen zoals BAR of huuromzet.
 */
export default function DisclaimerFooter({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-muted/30 px-5 py-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          Alle getoonde prijzen, huurinkomsten en kerngetallen zijn indicatief
          ("circa") en onder voorbehoud. Aan deze informatie kunnen geen rechten
          worden ontleend. Resid en Elzent Estates zijn niet aansprakelijk voor
          beslissingen die op basis van deze informatie worden genomen — de
          belegger is zelf verantwoordelijk voor het verifiëren van de
          documentatie vóór een koopovereenkomst.
        </div>
      </div>
    </div>
  );
}
