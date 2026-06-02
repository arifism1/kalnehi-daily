import { KalShimmerBlock } from "@/components/loading/KalShimmerBlock";

/** Shimmer skeleton for lazy-route loading (kalnehi app routes). */
export function RoutePageSkeleton() {
  return (
    <div
      className="space-y-4 px-1 py-2"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="kal-glass-panel rounded-2xl p-6">
        <KalShimmerBlock className="h-3 w-20 rounded-md" />
        <KalShimmerBlock className="mt-4 h-8 w-2/3 max-w-xs rounded-lg" delayMs={40} />
        <KalShimmerBlock className="mt-3 h-3 w-full max-w-lg rounded" delayMs={80} />
        <KalShimmerBlock className="mt-2 h-3 w-4/5 max-w-md rounded" delayMs={120} />
        <KalShimmerBlock className="mt-6 h-32 w-full rounded-xl" delayMs={160} />
      </div>
    </div>
  );
}
