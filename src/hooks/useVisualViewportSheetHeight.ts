"use client";

import { useEffect } from "react";

/**
 * Sets --kal-sheet-max-h on documentElement from visualViewport so fixed sheets
 * shrink when the mobile keyboard opens (Capacitor / mobile Safari).
 */
export function useVisualViewportSheetHeight(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      if (vv?.height) {
        root.style.setProperty("--kal-sheet-max-h", `${Math.round(vv.height)}px`);
      } else {
        root.style.setProperty("--kal-sheet-max-h", "92dvh");
      }
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);

    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--kal-sheet-max-h");
    };
  }, [active]);
}
