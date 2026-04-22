"use client";

import { useEffect } from "react";

import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * Applies `dark` on <html> for Coffee theme; removes it for Orange theme.
 */
export function ThemeSync() {
  const appearance = useSettingsStore((s) => s.appearance ?? "light");

  useEffect(() => {
    const root = document.documentElement;
    if (appearance === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [appearance]);

  return null;
}
