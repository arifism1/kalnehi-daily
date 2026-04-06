"use client";

import { useCallback, useEffect, useState, startTransition } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return (
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1
  );
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

export function usePwaInstall() {
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosDevice] = useState(() =>
    typeof window !== "undefined" ? isIOSDevice() : false,
  );

  useEffect(() => {
    const sync = () =>
      startTransition(() => setInstalled(isStandalonePwa()));
    sync();

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return { ok: false as const, reason: "no_prompt" as const };
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return {
        ok: true as const,
        outcome: choice.outcome,
      };
    } catch {
      return { ok: false as const, reason: "error" as const };
    }
  }, [deferred]);

  const canPromptInstall = Boolean(deferred);

  /** iOS / iPadOS: no native install prompt — show Share → Add to Home Screen. */
  const showIosInstructions =
    iosDevice && !installed && !canPromptInstall;

  return {
    /** Already running as installed PWA */
    installed,
    /** Android / desktop Chromium: native install prompt available */
    canPromptInstall,
    /** iOS: manual Add to Home Screen steps */
    showIosInstructions,
    promptInstall,
  };
}
