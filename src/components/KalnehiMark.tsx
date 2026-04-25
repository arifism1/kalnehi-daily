import clsx from "clsx";
import type { SVGProps } from "react";

type KalnehiMarkProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

const syne = "var(--font-syne), ui-sans-serif, system-ui, sans-serif" as const;
const mono = "var(--font-dm-sans), ui-monospace, monospace" as const;

/**
 * Vector wordmark: stacked "kal" / "nehi" and tagline. Uses theme text color for legibility in light/dark.
 */
export function KalnehiMark({ className, ...props }: KalnehiMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 92 60"
      fill="none"
      className={clsx("shrink-0", className)}
      {...props}
    >
      <text
        x="0"
        y="20"
        fill="var(--kal-text)"
        style={{ fontFamily: syne }}
        fontSize="20"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        kal
      </text>
      <text
        x="0"
        y="40"
        fill="var(--kal-text)"
        style={{ fontFamily: syne }}
        fontSize="20"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        nehi
      </text>
      <text
        x="0"
        y="55"
        fill="var(--kal-text)"
        style={{ fontFamily: mono, fontFeatureSettings: '"tnum"' }}
        fontSize="6.5"
        fontWeight="500"
        letterSpacing="0.2em"
      >
        WIN DAILY
      </text>
    </svg>
  );
}
