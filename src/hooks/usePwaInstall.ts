"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  startTransition,
} from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return (
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1
  );
}

export function isStandalonePwa(): boolean {
  return readStandalone();
}

export function usePwaInstall() {
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosDevice, setIosDevice] = useState(false);

  useLayoutEffect(() => {
    setInstalled(readStandalone());
    setIosDevice(isIOSDevice());
  }, []);

  useEffect(() => {
    const sync = () =>
      startTransition(() => {
        setInstalled(readStandalone());
      });

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferred(null);
      startTransition(() => setInstalled(true));
    };

    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => sync();

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onAppInstalled);
    document.addEventListener("visibilitychange", sync);

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onDisplayModeChange);
    } else {
      mq.addListener(onDisplayModeChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onAppInstalled);
      document.removeEventListener("visibilitychange", sync);
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", onDisplayModeChange);
      } else {
        mq.removeListener(onDisplayModeChange);
      }
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

  /** iOS / iPadOS Safari: no deferred prompt — open guided sheet instead. */
  const needsIosInstallModal =
    iosDevice && !installed && !canPromptInstall;

  const showInstallButton =
    !installed && (canPromptInstall || iosDevice);

  return {
    /** Running as installed PWA (standalone / iOS home screen). */
    installed,
    /** Chromium: native install prompt is available. */
    canPromptInstall,
    /** iOS: show Share → Add to Home Screen sheet (no `beforeinstallprompt`). */
    needsIosInstallModal,
    /** Hide install CTA in standalone or after successful install flow. */
    showInstallButton,
    iosDevice,
    promptInstall,
  };
}

/** Alias matching common PWA naming. */
export const usePWAInstall = usePwaInstall;
