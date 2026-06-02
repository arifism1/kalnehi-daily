"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSyncStore } from "@/store/useSyncStore";

/**
 * Brief confirmation when the outbox successfully applied at least one mutation
 * (see `touchQuietSync` in sync flush).
 */
export function QuietSavedToast() {
  const seq = useSyncStore((s) => s.quietSyncSeq);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSeqRef = useRef(0);

  useEffect(() => {
    if (seq <= prevSeqRef.current) return;
    prevSeqRef.current = seq;
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setVisible(false);
    }, 1000);
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [seq]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "pointer-events-none fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.5rem)] left-1/2 z-[90] transition-all duration-200 lg:bottom-6",
        visible
          ? "-translate-x-1/2 translate-y-0 opacity-100"
          : "-translate-x-1/2 translate-y-2 opacity-0",
      )}
    >
      <div
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border border-kal-accent/25 bg-red-950/90 px-4 py-2 text-[11px] font-medium text-red-100 shadow-lg shadow-black/40 backdrop-blur-sm",
        )}
      >
        <Check className="size-3.5 shrink-0 text-kal-accent" strokeWidth={2.5} />
        Saved
      </div>
    </div>
  );
}
