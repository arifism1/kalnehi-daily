"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#FF7A00", "#FFB366", "#FFD4A8", "#FFCB99", "#FF9A33"];

type Particle = {
  id: number;
  color: string;
  size: number;
  dx: number;
  dy: number;
  dr: number;
  shape: "square" | "circle";
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildParticles(): Particle[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length]!,
    size: Math.round(randomBetween(5, 9)),
    dx: randomBetween(-32, 32),
    dy: randomBetween(-60, -38),
    dr: randomBetween(110, 310),
    shape: i % 3 === 0 ? "circle" : "square",
  }));
}

interface ConfettiBurstProps {
  /** Called after the animation finishes so the parent can unmount this component. */
  onDone: () => void;
}

/**
 * Renders a short burst of brand-colored confetti particles at the position of
 * its nearest `position: relative` ancestor, then calls `onDone` so the parent
 * can remove it from the DOM.
 *
 * Uses the existing `confetti-burst` CSS keyframe (globals.css) via inline style.
 * Respects `prefers-reduced-motion` — skips the animation and calls onDone immediately.
 */
export function ConfettiBurst({ onDone }: ConfettiBurstProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onDoneRef.current();
      return;
    }
    const timer = window.setTimeout(() => onDoneRef.current(), 660);
    return () => window.clearTimeout(timer);
  }, []);

  const particles = useRef<Particle[]>(buildParticles()).current;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: 50 }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: p.size,
            height: p.size,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`,
            ["--dr" as string]: `${p.dr}deg`,
            animation: "confetti-burst 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards",
            transformOrigin: "center center",
          }}
        />
      ))}
    </span>
  );
}
