"use client";

import confetti from "canvas-confetti";

const defaults = { spread: 70, ticks: 120, zIndex: 99999 } as const;

/**
 * One-shot confetti; safe to call from event handlers (client only).
 */
export function triggerConfetti(intensity: "low" | "medium" | "high" = "medium") {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const count =
    intensity === "low" ? 80 : intensity === "high" ? 200 : 120;
  const scalar = intensity === "low" ? 0.6 : intensity === "high" ? 1.15 : 0.9;

  const fire = (x: number, y: number) => {
    void confetti({
      ...defaults,
      particleCount: Math.floor(count * 0.6 * scalar),
      origin: { x, y },
    });
  };

  fire(0.55, 0.25);
  window.setTimeout(() => fire(0.35, 0.45), 120);
  window.setTimeout(() => fire(0.75, 0.45), 200);

  void confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.4 * scalar),
    origin: { y: 0.75, x: 0.5 },
    angle: 90,
  });
}
