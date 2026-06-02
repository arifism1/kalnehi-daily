import clsx from "clsx";

export type KalShimmerBlockProps = {
  className?: string;
  /** Stagger shimmer start (e.g. index * 80). */
  delayMs?: number;
};

/**
 * Shimmer skeleton block — a moving light-sweep gradient that replaces
 * the flat `animate-pulse` pattern. Uses the brand's warm tone palette
 * in both light and dark modes via CSS variables.
 *
 * Drop-in replacement: pass the same sizing / rounding classes you'd
 * put on an `animate-pulse` div.
 */
export function KalShimmerBlock({ className, delayMs }: KalShimmerBlockProps) {
  return (
    <div
      aria-hidden
      className={clsx("kal-shimmer-block overflow-hidden", className)}
      style={delayMs != null ? { animationDelay: `${delayMs}ms` } : undefined}
    />
  );
}
