"use client";

import { useEffect, useState } from "react";

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function formatDeviceTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h}:${m.toString().padStart(2, "0")}`;
  }
}

/**
 * Slim status row (clock) shown only when the app runs as an installed PWA
 * (iOS home screen or display-mode: standalone). Gives a more native shell feel
 * alongside the system status bar; does not duplicate signal/battery (OS handles those).
 */
export function PwaStandaloneStatusRow() {
  const [standalone, setStandalone] = useState(false);
  const [clock, setClock] = useState<{ label: string; iso: string } | null>(
    null,
  );

  useEffect(() => {
    setStandalone(isStandalonePwa());
  }, []);

  useEffect(() => {
    if (!standalone) return;
    const tick = () => {
      const d = new Date();
      setClock({ label: formatDeviceTime(d), iso: d.toISOString() });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [standalone]);

  if (!standalone || !clock) return null;

  return (
    <div
      className="flex h-5 w-full shrink-0 items-center justify-center px-3 sm:h-5"
      aria-hidden
    >
      <time
        dateTime={clock.iso}
        className="text-[11px] font-medium tabular-nums tracking-wide text-kal-muted"
      >
        {clock.label}
      </time>
    </div>
  );
}
