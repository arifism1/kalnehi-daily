"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

export function InstallPWA({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstall as EventListener,
    );
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstall as EventListener,
      );
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const onClick = useCallback(async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setBusy(false);
      setDeferred(null);
    }
  }, [deferred]);

  if (installed || !deferred) {
    return null;
  }

  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-3 text-left transition-colors duration-200 hover:bg-emerald-950/55 ${className}`}
      onClick={() => void onClick()}
      disabled={busy}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Download
          className="h-5 w-5 shrink-0 text-emerald-400"
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">
            Install Kalnehi
          </span>
          <span className="block text-[11px] text-zinc-400">
            Add to home screen for a full-screen app experience.
          </span>
        </span>
      </span>
      <span className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
        {busy ? "…" : "Install"}
      </span>
    </button>
  );
}
