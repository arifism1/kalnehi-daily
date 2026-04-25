"use client";

import { motion } from "framer-motion";

const BRAND = "#F07B1D";
const SKY = "#1A1209";

const STAR_POSITIONS: readonly { x: number; y: number; r: number }[] = [
  { x: 32, y: 28, r: 1.4 },
  { x: 78, y: 52, r: 1.1 },
  { x: 120, y: 22, r: 1.6 },
  { x: 180, y: 40, r: 1 },
  { x: 220, y: 18, r: 1.3 },
  { x: 280, y: 55, r: 1.2 },
  { x: 340, y: 30, r: 1.5 },
  { x: 50, y: 88, r: 0.9 },
  { x: 145, y: 72, r: 1.1 },
  { x: 300, y: 78, r: 1 },
  { x: 360, y: 65, r: 1.4 },
  { x: 95, y: 110, r: 0.8 },
  { x: 250, y: 100, r: 1.1 },
];

const starVariants = {
  rest: { opacity: 0, scale: 0.3 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.08,
      type: "spring" as const,
      stiffness: 360,
      damping: 20,
    },
  }),
};

/**
 * Night sky with staggered stars + crescent (Framer Motion). Inline SVG, no images.
 */
export function NightIllustration({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 390 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full max-w-[390px]"
      >
        <defs>
          <linearGradient id="kalNightHorizon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D0905" />
            <stop offset="100%" stopColor={SKY} />
          </linearGradient>
          <mask id="kalMoonMask" maskUnits="userSpaceOnUse">
            <rect width="390" height="220" fill="white" />
            <circle cx="268" cy="86" r="36" fill="black" />
          </mask>
        </defs>
        <rect width="390" height="220" fill="url(#kalNightHorizon)" />
        {STAR_POSITIONS.map((p, i) => (
          <motion.circle
            key={`${p.x}-${p.y}`}
            custom={i}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill="#FAF6F1"
            initial="rest"
            animate="show"
            variants={starVariants}
          />
        ))}

        <motion.g
          initial={{ y: 44, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 78, damping: 17, mass: 1, delay: 0.15 }}
        >
          <circle
            cx="310"
            cy="86"
            r="40"
            fill="#F5ECD8"
            fillOpacity="0.96"
            mask="url(#kalMoonMask)"
            stroke="rgba(240,123,29,0.2)"
            strokeWidth="0.5"
          />
          <path
            d="M272 50 Q318 50 333 90 Q320 120 280 120 Q260 100 260 80 Q258 60 272 50"
            fill={BRAND}
            fillOpacity="0.1"
          />
        </motion.g>
      </svg>
    </div>
  );
}
