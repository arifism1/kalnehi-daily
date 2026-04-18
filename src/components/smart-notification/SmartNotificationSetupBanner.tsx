"use client";

import clsx from "clsx";
import { Bell, Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useNotificationsToast } from "@/components/settings/notificationsToastContext";
import { SettingsSheetSwitch } from "@/components/settings/SettingsSheetSwitch";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  obtainFcmToken,
  revokeFcmToken,
} from "@/lib/firebase/messagingClient";
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

async function unregisterTokenOnServer(token: string): Promise<boolean> {
  const q = new URLSearchParams({ token });
  const res = await fetch(`/api/fcm/register?${q.toString()}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok;
}

export function SmartNotificationSetupBanner() {
  const baseId = useId();
  const tokenRef = useRef<string | null>(null);
  const showToast = useNotificationsToast();
  const {
    installed,
    showInstallButton,
    needsIosInstallModal,
    promptInstall,
    installEligibilityKnown,
  } = usePwaInstall();

  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  const unsupported =
    typeof window !== "undefined" &&
    (!("Notification" in window) || !("serviceWorker" in navigator));

  const syncFromBrowser = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("denied");
      setPushOn(false);
      return;
    }
    setPerm(Notification.permission);

    if (!configured) {
      setPushOn(false);
      return;
    }
    if (Notification.permission !== "granted") {
      setPushOn(false);
      return;
    }

    const want =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(LS_ENABLED) === "1";

    try {
      const { token, hint } = await obtainFcmToken();
      if (!token) {
        if (hint) console.warn("[SmartNotificationSetupBanner FCM]", hint);
        setPushOn(want);
        return;
      }
      tokenRef.current = token;
      if (!want) {
        setPushOn(false);
        return;
      }
      const ok = await registerTokenOnServer(token);
      setPushOn(ok || want);
    } catch (e) {
      console.error(e);
      setPushOn(want);
    }
  }, [configured]);

  useEffect(() => {
    void syncFromBrowser();
  }, [syncFromBrowser]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void syncFromBrowser();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncFromBrowser]);

  const enablePush = useCallback(async () => {
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
        setPerm(p);
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

      tokenRef.current = token;
      try {
        localStorage.setItem(LS_ENABLED, "1");
      } catch {
        /* ignore */
      }
      setPushOn(true);
      showToast("Push notifications are on for this device.");
    } catch (e) {
      console.error(e);
      setMessage("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }, [configured, showToast]);

  const disablePush = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const tok = tokenRef.current;
      await revokeFcmToken();
      if (tok) {
        await unregisterTokenOnServer(tok);
      }
      tokenRef.current = null;
      try {
        localStorage.removeItem(LS_ENABLED);
      } catch {
        /* ignore */
      }
      setPushOn(false);
      showToast("Push notifications are off for this device.", "neutral");
    } catch (e) {
      console.error(e);
      setMessage("Could not turn off push completely. Try clearing site data.");
      try {
        localStorage.removeItem(LS_ENABLED);
      } catch {
        /* ignore */
      }
      setPushOn(false);
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const onPushToggle = useCallback(
    (next: boolean) => {
      if (next) void enablePush();
      else void disablePush();
    },
    [disablePush, enablePush],
  );

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

  const pwaOk = installed;
  const allOk = pushOn && pwaOk;

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
      className="space-y-3 rounded-2xl border border-kal-border/80 bg-kal-card-muted/80 px-4 py-4 backdrop-blur-sm"
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

      <ul className="list-none space-y-3 text-xs text-kal-muted sm:text-sm">
        <li className="rounded-xl border border-kal-border/80 bg-white/40 px-3 py-3 dark:bg-zinc-900/30">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-kal-text">Push notifications</p>
              <p className="mt-0.5 text-[11px] leading-snug text-kal-muted sm:text-xs">
                {!configured
                  ? "Push is not configured on this server."
                  : unsupported
                    ? "This browser does not support web push."
                    : perm === "denied"
                      ? "Blocked for this site — change in browser or system settings."
                      : perm === "default"
                        ? "Browser permission not granted yet — turn on to allow."
                        : pushOn
                          ? "On — this device can receive pushes from Kalnehi."
                          : "Browser allows notifications — turn on to register this device."}
              </p>
            </div>
            <SettingsSheetSwitch
              id={`${baseId}-smart-push`}
              checked={pushOn}
              disabled={
                busy ||
                !configured ||
                unsupported ||
                perm === "denied"
              }
              onChange={onPushToggle}
            />
          </div>
        </li>
        <li className="list-inside list-disc pl-1">
          <strong className="text-kal-text">Installed app:</strong>{" "}
          {installed ? "Yes" : "Not installed as PWA"}
        </li>
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
        <p className="text-xs text-kal-muted sm:text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
