"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Wifi } from "lucide-react";

import { getNativeConnectionKind } from "@/lib/nativeSyncPolicy";
import { useAuthStore } from "@/store/useAuthStore";

const STORAGE_KEY = "kalnehi_android_wifi_tip_dismissed";

/**
 * One-time tip for Android: connect on Wi‑Fi to download full syllabus cache.
 */
export function CapacitorFirstRunWifiTip() {
  const userId = useAuthStore((s) => s.user?.id);
  const initialized = useAuthStore((s) => s.initialized);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !userId || !initialized) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    if (getNativeConnectionKind() === "wifi") {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    setVisible(true);
  }, [userId, initialized]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-xs text-kal-text-secondary"
    >
      <Wifi className="mt-0.5 size-4 shrink-0 text-kal-accent" aria-hidden />
      <p className="min-w-0 flex-1">
        Connect on Wi‑Fi once to download your full syllabus and the latest app updates for
        offline study.
      </p>
      <button
        type="button"
        className="shrink-0 font-semibold text-kal-accent"
        onClick={() => {
          setVisible(false);
          try {
            localStorage.setItem(STORAGE_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        Got it
      </button>
    </div>
  );
}
