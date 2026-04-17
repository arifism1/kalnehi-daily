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

const INSTALL_STATE_STORAGE_KEY = "kalnehi-pwa-installed";

function readStoredInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(INSTALL_STATE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredInstalled(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INSTALL_STATE_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Ignore storage write failures (private mode / quota / blocked storage).
  }
}

/** Wait this long before showing "install not supported" so `beforeinstallprompt` can fire. */
const INSTALL_ELIGIBILITY_PROBE_MS = 1_000;

export function usePwaInstall() {
  const [installed, setInstalled] = useState(() =>
    typeof window === "undefined" ? false : readStandalone() || readStoredInstalled(),
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosDevice, setIosDevice] = useState(false);
  /** True after deferred prompt, iOS detection, installed state, or probe timeout — avoids a false "unsupported" flash on Chromium. */
  const [installEligibilityKnown, setInstallEligibilityKnown] =
    useState(false);

  useLayoutEffect(() => {
    setInstalled(readStandalone() || readStoredInstalled());
    setIosDevice(isIOSDevice());
  }, []);

  useEffect(() => {
    const syncInstalledState = () => {
      const standalone = readStandalone();
      writeStoredInstalled(standalone);
      startTransition(() => {
        setInstalled(standalone);
      });
    };

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      startTransition(() => setInstalled(false));
      writeStoredInstalled(false);
      setInstallEligibilityKnown(true);
    };

    const onAppInstalled = () => {
      setDeferred(null);
      writeStoredInstalled(true);
      setInstallEligibilityKnown(true);
      startTransition(() => setInstalled(true));
    };

    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => syncInstalledState();

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("focus", syncInstalledState);
    window.addEventListener("pageshow", syncInstalledState);
    document.addEventListener("visibilitychange", syncInstalledState);

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onDisplayModeChange);
    } else {
      mq.addListener(onDisplayModeChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("focus", syncInstalledState);
      window.removeEventListener("pageshow", syncInstalledState);
      document.removeEventListener("visibilitychange", syncInstalledState);
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", onDisplayModeChange);
      } else {
        mq.removeListener(onDisplayModeChange);
      }
    };
  }, []);

  useEffect(() => {
    if (deferred) setInstallEligibilityKnown(true);
  }, [deferred]);

  useEffect(() => {
    if (iosDevice) setInstallEligibilityKnown(true);
  }, [iosDevice]);

  useEffect(() => {
    if (installed) setInstallEligibilityKnown(true);
  }, [installed]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setInstallEligibilityKnown(true);
    }, INSTALL_ELIGIBILITY_PROBE_MS);
    return () => window.clearTimeout(id);
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
    /** When false, defer showing "install not supported" for non‑iOS (BIP may arrive late). */
    installEligibilityKnown,
    iosDevice,
    promptInstall,
  };
}

/** Alias matching common PWA naming. */
export const usePWAInstall = usePwaInstall;
