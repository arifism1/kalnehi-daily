"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export function LiveStudyCounter() {
  const [n, setN] = useState<number | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/live-study-count", { cache: "no-store" });
        if (!r.ok) throw new Error("bad");
        const j = (await r.json()) as { count: number };
        if (!cancelled) setN(j.count);
      } catch {
        if (!cancelled) setN(200);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (n == null) {
    return (
      <p className="text-[11px] text-kal-muted" aria-hidden>
        …
      </p>
    );
  }

  return (
    <motion.p
      className="text-[11px] font-medium text-kal-text-secondary"
      initial={reduce ? false : { opacity: 0.6 }}
      animate={reduce ? { opacity: 1 } : { opacity: [0.6, 1, 0.9, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="font-bold tabular-nums text-kal-text">{n}</span> students are
      in flow right now.
    </motion.p>
  );
}
