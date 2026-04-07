"use client";

import { useEffect } from "react";

import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * Applies `dark` on <html> from settings (light default, system respects OS).
 */
export function ThemeSync() {
  const appearance = useSettingsStore((s) => s.appearance ?? "light");

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      if (appearance === "dark") {
        root.classList.add("dark");
        return;
      }
      if (appearance === "light") {
        root.classList.remove("dark");
        return;
      }
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    apply();

    if (appearance !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [appearance]);

  return null;
}
