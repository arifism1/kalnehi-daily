"use client";

import { useEffect } from "react";

import { useSettingsStore } from "@/store/useSettingsStore";

function setDarkClass(root: HTMLElement, dark: boolean) {
  if (dark) root.classList.add("dark");
  else root.classList.remove("dark");
}

/**
 * Syncs `dark` on <html> from settings: fixed light/dark or `prefers-color-scheme` when "system".
 */
export function ThemeSync() {
  const appearance = useSettingsStore((s) => s.appearance ?? "light");

  useEffect(() => {
    const root = document.documentElement;

    if (appearance === "light") {
      setDarkClass(root, false);
      return;
    }
    if (appearance === "dark") {
      setDarkClass(root, true);
      return;
    }

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDarkClass(root, mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [appearance]);

  return null;
}
