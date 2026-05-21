"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Optional fallback to render instead of the default error UI. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * React class error boundary for client components that are not covered by
 * Next.js route-level error.tsx boundaries (e.g. components mounted outside
 * the route tree, or wrapped widgets inside shared layouts).
 *
 * Usage:
 *   <GlobalErrorBoundary>
 *     <SomeComponent />
 *   </GlobalErrorBoundary>
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[Kalnehi] Caught by GlobalErrorBoundary:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback(error, this.handleReset);

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-kal-border bg-kal-card-muted/50 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kal-accent/10">
            <AlertTriangle className="h-6 w-6 text-kal-accent" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-kal-text">
              This section couldn&apos;t load
            </p>
            <p className="text-xs text-kal-text-secondary">
              An unexpected error occurred. Your data is safe.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent/10"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </div>
      );
    }

    return children;
  }
}
