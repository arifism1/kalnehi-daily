"use client";

import clsx from "clsx";
import { Bell, Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useNotificationsToast } from "@/components/settings/notificationsToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { obtainFcmToken } from "@/lib/firebase/messagingClient";
import { SITE_NAME } from "@/lib/seo-metadata";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const LS_ENABLED = "kalnehi-fcm-enabled";

async function registerTokenOnServer(token: string): Promise<boolean> {
  const res = await fetch("/api/fcm/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    }),
  });
  return res.ok;
}

export function SmartNotificationSetupBanner() {
  const showToast = useNotificationsToast();
  const {
    installed,
    showInstallButton,
    needsIosInstallModal,
    promptInstall,
    installEligibilityKnown,
  } = usePwaInstall();

  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  const syncPerm = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("denied");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    syncPerm();
    const onVis = () => {
      if (document.visibilityState === "visible") syncPerm();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncPerm]);

  const allowNotifications = useCallback(async () => {
    setMessage(null);
    if (!configured) {
      setMessage("Push is not configured on this deployment.");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setMessage("This browser does not support web push.");
      return;
    }
    if (Notification.permission === "denied") {
      setMessage(
        "Notifications are blocked for this site. Enable them in your browser or system settings, then reload.",
      );
      return;
    }

    setBusy(true);
    try {
      if (Notification.permission === "default") {
        setMessage(
          `Your browser will ask whether ${SITE_NAME} can send notifications — choose Allow to continue.`,
        );
        const p = await Notification.requestPermission();
        syncPerm();
        if (p !== "granted") {
          setMessage(
            p === "denied"
              ? "Permission was denied. You can enable notifications in browser settings."
              : "Permission was not granted.",
          );
          setBusy(false);
          return;
        }
      }

      const { token, hint } = await obtainFcmToken({ forceRefresh: true });
      if (!token) {
        setMessage(
          hint ??
            "Could not get a push token. Check Firebase config and Web Push key (VAPID).",
        );
        setBusy(false);
        return;
      }

      const ok = await registerTokenOnServer(token);
      if (!ok) {
        setMessage("Could not save this device on the server. Try again.");
        setBusy(false);
        return;
      }

      try {
        localStorage.setItem(LS_ENABLED, "1");
      } catch {
        /* ignore */
      }
      showToast("Notifications allowed for this device.");
      syncPerm();
    } catch (e) {
      console.error(e);
      setMessage("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }, [configured, showToast, syncPerm]);

  const runInstall = useCallback(async () => {
    setMessage(null);
    if (needsIosInstallModal) {
      setMessage(
        'On iPhone/iPad: tap Share, then "Add to Home Screen" to install the app.',
      );
      return;
    }
    setInstallBusy(true);
    try {
      const r = await promptInstall();
      if (r.ok && r.outcome === "accepted") {
        showToast("App install started.", "neutral");
      } else if (!r.ok) {
        setMessage("Install prompt is not available in this browser yet. Try Chrome desktop, or use the browser menu “Install app”.");
      }
    } finally {
      setInstallBusy(false);
    }
  }, [promptInstall, needsIosInstallModal, showToast]);

  const notificationsOk = perm === "granted";
  const pwaOk = installed;
  const allOk = notificationsOk && pwaOk;

  if (allOk) {
    return (
      <div
        className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/35 dark:text-emerald-100"
        role="status"
      >
        You are set up to receive smart push notifications on this device.
      </div>
    );
  }

  return (
    <div
      className="space-y-3 rounded-2xl border-2 border-kal-border-strong bg-kal-bg-elevated px-4 py-4 shadow-sm"
      role="region"
      aria-label="Notification setup"
    >
      <div className="flex gap-2">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-kal-accent-dark" aria-hidden />
        <p className="text-sm font-medium leading-relaxed text-kal-text">
          To receive smart push notifications, you must allow notifications and install{" "}
          {SITE_NAME} as an app.
        </p>
      </div>

      <ul className="list-inside list-disc space-y-1 text-xs text-kal-text-secondary sm:text-sm">
        <li>
          <strong className="text-kal-text">Notifications:</strong>{" "}
          {perm === "granted"
            ? "Allowed"
            : perm === "denied"
              ? "Blocked — change in browser or system settings"
              : "Not yet allowed"}
        </li>
        <li>
          <strong className="text-kal-text">Installed app:</strong>{" "}
          {installed ? "Yes" : "Not installed as PWA"}
        </li>
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!notificationsOk ? (
          <button
            type="button"
            disabled={busy || perm === "denied"}
            onClick={() => void allowNotifications()}
            className={clsx(
              "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
              perm === "denied"
                ? "cursor-not-allowed border border-kal-border bg-kal-card-muted text-kal-muted"
                : "border border-kal-accent/40 bg-kal-accent text-white shadow-sm hover:opacity-95 disabled:opacity-60",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Allow notifications
          </button>
        ) : null}

        {!pwaOk && showInstallButton && installEligibilityKnown ? (
          <button
            type="button"
            disabled={installBusy}
            onClick={() => void runInstall()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-kal-border bg-white/70 px-4 text-sm font-semibold text-kal-text transition hover:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900/70"
          >
            {installBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {needsIosInstallModal ? "How to install (iOS)" : "Install app"}
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="text-xs text-kal-text-secondary sm:text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
