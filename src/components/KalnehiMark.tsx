import clsx from "clsx";
import type { SVGProps } from "react";

type KalnehiMarkProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

/**
 * Vector header mark — uses theme CSS variables so light/dark chrome stay legible.
 */
export function KalnehiMark({ className, ...props }: KalnehiMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 132 34"
      fill="none"
      className={clsx("shrink-0", className)}
      {...props}
    >
      <text
        x="0"
        y="22"
        fill="var(--kal-text)"
        style={{
          fontFamily:
            "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
        }}
        fontSize="16"
        fontWeight="700"
      >
        kalnehi
      </text>
      <text
        x="0"
        y="32"
        fill="var(--kal-accent)"
        style={{
          fontFamily:
            "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
        }}
        fontSize="6.5"
        fontWeight="700"
        letterSpacing="0.14em"
      >
        DAILY
      </text>
    </svg>
  );
}
