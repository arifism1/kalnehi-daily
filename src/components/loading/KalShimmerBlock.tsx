import clsx from "clsx";

/**
 * Shimmer skeleton block — a moving light-sweep gradient that replaces
 * the flat `animate-pulse` pattern. Uses the brand's warm tone palette
 * in both light and dark modes via CSS variables.
 *
 * Drop-in replacement: pass the same sizing / rounding classes you'd
 * put on an `animate-pulse` div.
 */
export function KalShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx("overflow-hidden", className)}
      style={{
        background:
          "linear-gradient(90deg, var(--kal-border) 0%, var(--kal-card-muted) 40%, var(--kal-border-strong) 50%, var(--kal-card-muted) 60%, var(--kal-border) 100%)",
        backgroundSize: "200% 100%",
        animation: "kal-shimmer 1.6s ease-in-out infinite",
      }}
    />
  );
}
