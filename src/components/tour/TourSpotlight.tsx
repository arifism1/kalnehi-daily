"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

type Rect = { x: number; y: number; w: number; h: number };

const PADDING = 8;
const RADIUS = 12;

function getTargetRect(tourTarget: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${tourTarget}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: r.left - PADDING,
    y: r.top - PADDING,
    w: r.width + PADDING * 2,
    h: r.height + PADDING * 2,
  };
}

type TourSpotlightProps = {
  /** data-tour target value, or null for a plain dark overlay (no cutout). */
  tourTarget: string | null;
};

/**
 * Full-viewport SVG overlay with an animated rounded-rect cutout that smoothly
 * moves to whichever element has the matching `data-tour` attribute.
 *
 * When `tourTarget` is null the overlay is a uniform dark background with no
 * cutout (used for welcome / celebration full-screen steps).
 */
export function TourSpotlight({ tourTarget }: TourSpotlightProps) {
  const vw = useMotionValue(window.innerWidth);
  const vh = useMotionValue(window.innerHeight);

  const cx = useMotionValue(window.innerWidth / 2);
  const cy = useMotionValue(window.innerHeight / 2);
  const cw = useMotionValue(0);
  const ch = useMotionValue(0);

  const rafRef = useRef<number | null>(null);

  // Animate the cutout to the new target whenever tourTarget changes.
  useEffect(() => {
    if (!tourTarget) {
      animate(cw, 0, { duration: 0.25, ease: "easeOut" });
      animate(ch, 0, { duration: 0.25, ease: "easeOut" });
      return;
    }

    function updateRect() {
      const rect = getTargetRect(tourTarget!);
      if (!rect) {
        rafRef.current = requestAnimationFrame(updateRect);
        return;
      }
      animate(cx, rect.x, { duration: 0.45, ease: [0.4, 0, 0.2, 1] });
      animate(cy, rect.y, { duration: 0.45, ease: [0.4, 0, 0.2, 1] });
      animate(cw, rect.w, { duration: 0.45, ease: [0.4, 0, 0.2, 1] });
      animate(ch, rect.h, { duration: 0.45, ease: [0.4, 0, 0.2, 1] });
    }

    // Wait one frame so the DOM is fully painted before measuring.
    rafRef.current = requestAnimationFrame(updateRect);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [tourTarget, cx, cy, cw, ch]);

  // Keep viewport dimensions in sync on resize.
  useEffect(() => {
    function onResize() {
      vw.set(window.innerWidth);
      vh.set(window.innerHeight);
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [vw, vh]);

  return (
    <motion.svg
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{ width: vw, height: vh }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-hidden
    >
      <defs>
        <mask id="tour-cutout-mask">
          {/* White = show overlay; black = transparent (the spotlight hole) */}
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {tourTarget && (
            <motion.rect
              style={{
                x: cx,
                y: cy,
                width: cw,
                height: ch,
              }}
              rx={RADIUS}
              ry={RADIUS}
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.72)"
        mask="url(#tour-cutout-mask)"
      />
      {/* Subtle glow ring around the spotlight hole */}
      {tourTarget && (
        <motion.rect
          style={{
            x: cx,
            y: cy,
            width: cw,
            height: ch,
          }}
          rx={RADIUS}
          ry={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={2}
        />
      )}
    </motion.svg>
  );
}
