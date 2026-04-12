import { Loader2 } from "lucide-react";

/** Soft card + shimmer + spinner for lazy route loading (light premium theme). */
export function RoutePageSkeleton() {
  return (
    <div
      className="space-y-4 px-1 py-2"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="kal-glass-panel rounded-2xl p-6">
        <div className="h-3 w-20 animate-pulse rounded-md bg-kal-card-muted" />
        <div className="mt-4 h-8 w-2/3 max-w-xs animate-pulse rounded-lg bg-kal-card-muted" />
        <div className="mt-3 h-3 w-full max-w-lg animate-pulse rounded bg-kal-card-muted/90" />
        <div className="mt-2 h-3 w-4/5 max-w-md animate-pulse rounded bg-kal-card-muted/80" />
        <div className="mt-6 h-32 w-full animate-pulse rounded-xl bg-kal-card-muted/70" />
      </div>
      <div className="flex justify-center py-2">
        <Loader2
          className="h-6 w-6 animate-spin text-kal-accent/55"
          aria-hidden
        />
      </div>
    </div>
  );
}
