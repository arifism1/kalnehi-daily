"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * Size → pixel diameter map.
 * xs  16 px  — inline inside buttons / micro-spinners
 * sm  24 px  — card-edge / compact indicators
 * md  36 px  — section-level loading
 * lg  52 px  — full-component / feature-gate loading
 * xl  80 px  — full-page loading (pair with `message` prop)
 */
const SIZES = { xs: 16, sm: 24, md: 36, lg: 52, xl: 80 } as const;
type Size = keyof typeof SIZES;

interface KalSpinnerProps {
  size?: Size;
  /** Optional caption that fades in 400 ms after mount — use for full-page loaders. */
  message?: string;
  className?: string;
}

type RingSpec = {
  radiusFraction: number; // how far inward from the SVG edge
  duration: number;
  direction: 1 | -1;
  opacity: number;
  arc: number; // fraction of circumference that is visible (0–1)
};

function buildRings(size: Size): RingSpec[] {
  const base: RingSpec[] = [
    { radiusFraction: 0.48, duration: 3.4, direction: 1, opacity: 0.25, arc: 0.72 },
    { radiusFraction: 0.35, duration: 2.1, direction: -1, opacity: 0.55, arc: 0.55 },
  ];
  const innerRing: RingSpec = {
    radiusFraction: 0.22,
    duration: 1.3,
    direction: 1,
    opacity: 0.9,
    arc: 0.38,
  };
  if (size === "md" || size === "lg" || size === "xl") {
    return [...base, innerRing];
  }
  return base;
}

export function KalSpinner({ size = "md", message, className }: KalSpinnerProps) {
  const px = SIZES[size];
  const cx = px / 2;
  // stroke width scales with diameter but stays crisp
  const sw = Math.max(1.5, px * 0.065);
  const rings = buildRings(size);
  const showDot = size === "md" || size === "lg" || size === "xl";

  return (
    <div className={clsx("flex flex-col items-center", message ? "gap-3" : "", className)}>
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        aria-hidden
        style={{ overflow: "visible" }}
      >
        {/* Optional outer glow — only on lg/xl for drama */}
        {(size === "lg" || size === "xl") && (
          <motion.circle
            cx={cx}
            cy={cx}
            r={cx * 0.88}
            fill="var(--kal-accent-glow)"
            initial={{ opacity: 0.3, r: cx * 0.88 }}
            animate={{ opacity: [0.3, 0.65, 0.3], r: [cx * 0.8, cx * 0.95, cx * 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Orbital rings */}
        {rings.map((ring, i) => {
          const r = ring.radiusFraction * px;
          const circumference = 2 * Math.PI * r;
          const dashArray = `${circumference * ring.arc} ${circumference * (1 - ring.arc)}`;

          return (
            <motion.g
              key={i}
              style={{ transformOrigin: `${cx}px ${cx}px` }}
              animate={{ rotate: ring.direction * 360 }}
              transition={{
                duration: ring.duration,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <circle
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke="var(--kal-accent)"
                strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={dashArray}
                opacity={ring.opacity}
              />
            </motion.g>
          );
        })}

        {/* Glowing center dot */}
        {showDot && (
          <motion.g
            style={{ transformOrigin: `${cx}px ${cx}px` }}
            animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx={cx} cy={cx} r={sw * 1.15} fill="var(--kal-accent)" />
          </motion.g>
        )}
      </svg>

      {/* Optional message — fades in after a short delay so it only shows for slow loads */}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center text-sm text-kal-muted"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
