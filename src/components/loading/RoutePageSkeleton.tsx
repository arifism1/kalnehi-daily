import { KalShimmerBlock } from "@/components/loading/KalShimmerBlock";
import { KalSpinner } from "@/components/loading/KalSpinner";

/** Shimmer skeleton + orbital spinner for lazy-route loading (30+ routes). */
export function RoutePageSkeleton() {
  return (
    <div
      className="space-y-4 px-1 py-2"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="kal-glass-panel rounded-2xl p-6">
        <KalShimmerBlock className="h-3 w-20 rounded-md" />
        <KalShimmerBlock className="mt-4 h-8 w-2/3 max-w-xs rounded-lg" />
        <KalShimmerBlock className="mt-3 h-3 w-full max-w-lg rounded" />
        <KalShimmerBlock className="mt-2 h-3 w-4/5 max-w-md rounded" />
        <KalShimmerBlock className="mt-6 h-32 w-full rounded-xl" />
      </div>
      <div className="flex justify-center py-2">
        <KalSpinner size="md" />
      </div>
    </div>
  );
}
