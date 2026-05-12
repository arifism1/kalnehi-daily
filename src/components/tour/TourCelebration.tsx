"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type TourCelebrationProps = {
  onFinish: () => void;
};

/* ── CSS-only confetti particles ──────────────────────────────────────────── */

type Particle = {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotate: number;
  shape: "rect" | "circle";
};

const COLORS = [
  "#EF9F27",
  "#1D9E75",
  "#7F77DD",
  "#D4537E",
  "#5BA4CF",
  "#F4C430",
  "#E07B54",
];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 0.6,
    duration: 1.4 + Math.random() * 1.0,
    rotate: Math.random() * 720 - 360,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
}

function ConfettiBurst() {
  const particles = useRef<Particle[]>(generateParticles(60)).current;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.shape === "rect" ? p.size : p.size,
            height: p.shape === "rect" ? p.size * 0.45 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            opacity: [1, 1, 0.6, 0],
            rotate: p.rotate,
          }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            ease: [0.2, 0.6, 0.8, 1],
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

/**
 * Full-screen celebration shown at the final tour step (step 13).
 * Fires a confetti burst and prompts the user to start their first day.
 */
export function TourCelebration({ onFinish }: TourCelebrationProps) {
  const router = useRouter();
  const didPrefetch = useRef(false);

  // Prefetch the daily-plan route so navigation is instant.
  useEffect(() => {
    if (!didPrefetch.current) {
      router.prefetch("/daily-plan");
      didPrefetch.current = true;
    }
  }, [router]);

  function handleStart() {
    onFinish();
    router.push("/daily-plan");
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-kal-page px-6">
      <ConfettiBurst />

      {/* Check mark */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1D9E75]/12"
      >
        <CheckCircle2 className="h-10 w-10 text-[#1D9E75]" strokeWidth={1.75} />
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="relative z-10 text-center font-serif text-[28px] font-semibold leading-tight text-kal-text"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
      >
        You&apos;re all set.
      </motion.h1>

      <motion.p
        className="relative z-10 mt-3 max-w-[280px] text-center text-[14px] leading-relaxed text-kal-text-secondary"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
      >
        Every tool is ready. Let&apos;s build your first day.
      </motion.p>

      {/* Feature completion chips */}
      <motion.div
        className="relative z-10 mt-5 flex flex-wrap justify-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.4 }}
      >
        {[
          { label: "5 Power features", color: "#EF9F27" },
          { label: "7 Workflow tools", color: "#1D9E75" },
        ].map(({ label, color }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
            style={{
              color,
              backgroundColor: `${color}18`,
              border: `1px solid ${color}30`,
            }}
          >
            <CheckCircle2 className="h-3 w-3" style={{ color }} aria-hidden />
            {label}
          </span>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        type="button"
        onClick={handleStart}
        className="relative z-10 mt-10 flex items-center gap-2 rounded-xl bg-kal-accent px-7 py-3.5 text-[15px] font-semibold text-white shadow-md transition-opacity active:opacity-80"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.45, ease: "easeOut" }}
      >
        Start my first day
        <ArrowRight className="h-4.5 w-4.5" />
      </motion.button>
    </div>
  );
}
