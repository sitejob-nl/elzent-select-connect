import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center px-4">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">Er ging iets mis</h2>
          <p className="text-sm text-muted-foreground font-body mb-6 text-center max-w-md">
            Er is een onverwachte fout opgetreden. Probeer de pagina te vernieuwen.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Pagina vernieuwen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
