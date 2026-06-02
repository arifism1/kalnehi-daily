"use client";

import clsx from "clsx";
import { Bell, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  isIosWebPushDevice,
  obtainFcmToken,
  obtainNativeFcmToken,
  revokeFcmToken,
} from "@/lib/firebase/messagingClient";
import { FCM_STALE_TOKEN_USER_MESSAGE } from "@/lib/fcm/messages";
import {
  FCM_ENABLED_STORAGE_KEY,
  registerFcmTokenOnServer,
  unregisterFcmTokenOnServer,
} from "@/lib/fcm/registerClient";
import { usePlatform } from "@/hooks/usePlatform";
import { SITE_NAME } from "@/lib/seo-metadata";
import { useAuthStore } from "@/store/useAuthStore";
import { surfaceErrorForUi, surfaceOptionalString } from "@/lib/userFacingErrors";
import * as storage from "@/lib/storage";

import { SettingsSheetSwitch } from "@/components/settings/SettingsSheetSwitch";
import { useNotificationsToast } from "@/components/settings/notificationsToastContext";

/** Stale / unregistered token from API — do not turn the toggle off. */
const STALE_TOKEN_MESSAGE = FCM_STALE_TOKEN_USER_MESSAGE;

const IOS_PUSH_HINT =
  "On iOS, if notifications stop working, try turning the toggle off and on again.";

function looksLikeStaleFcmTokenError(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  const t = text.trim().toLowerCase();
  return (
    t.includes("registration-token-not-registered") ||
    t.includes("invalid-registration-token")
  );
}

function testResponseLooksLikeStaleToken(data: {
  code?: string;
  error?: string;
  message?: string;
}): boolean {
  if (data.code === "push_token_stale") return true;
  if (looksLikeStaleFcmTokenError(data.error)) return true;
  if (looksLikeStaleFcmTokenError(data.message)) return true;
  return false;
}

export function PushNotificationsSettings({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { isApp: isNativeKalnehiShell } = usePlatform();
  const baseId = useId();
  const user = useAuthStore((s) => s.user);
  const showToast = useNotificationsToast();
  const tokenRef = useRef<string | null>(null);

  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [clientIsIos, setClientIsIos] = useState(false);
  const [showDevTest, setShowDevTest] = useState(false);

  const configured = isFirebaseConfigured();

  useEffect(() => {
    setClientIsIos(isIosWebPushDevice());
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setShowDevTest(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/fcm/capabilities", { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          showDevFcmTools?: boolean;
        };
        if (!cancelled) setShowDevTest(Boolean(data.showDevFcmTools));
      } catch {
        if (!cancelled) setShowDevTest(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const syncFromBrowser = useCallback(async () => {
    if (typeof window === "undefined") {
      setPushOn(false);
      return;
    }

    if (isNativeKalnehiShell) {
      const want = (await storage.getItem(FCM_ENABLED_STORAGE_KEY)) === "1";
      if (!want) {
        setPushOn(false);
        return;
      }
      const { token, hint } = await obtainNativeFcmToken();
      if (token) {
        tokenRef.current = token;
        const ok = await registerFcmTokenOnServer(token);
        setPushOn(ok);
        if (!ok && hint) setMessage("Could not sync this device with the server.");
      } else {
        setPushOn(false);
        if (hint) setMessage(hint);
      }
      return;
    }

    if (!configured) {
      setPushOn(false);
      return;
    }
    if (Notification.permission !== "granted") {
      setPushOn(false);
      return;
    }
    const want = (await storage.getItem(FCM_ENABLED_STORAGE_KEY)) === "1";
    if (!want) {
      setPushOn(false);
      return;
    }
    try {
      const { token, hint } = await obtainFcmToken();
      if (!token) {
        if (hint) {
          console.warn("[FCM sync]", hint);
          setMessage(hint);
        }
        setPushOn(false);
        return;
      }
      tokenRef.current = token;
      const ok = await registerFcmTokenOnServer(token);
      setPushOn(ok);
      if (!ok) {
        setMessage("Could not sync this device with the server.");
      }
    } catch (e) {
      console.error(e);
      setPushOn(false);
    }
  }, [configured, isNativeKalnehiShell]);

  useEffect(() => {
    void syncFromBrowser();
  }, [syncFromBrowser, user?.id]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void syncFromBrowser();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncFromBrowser]);

  const enablePush = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      if (isNativeKalnehiShell) {
        const { token, hint } = await obtainNativeFcmToken({ forceRefresh: true });
        if (!token) {
          setMessage(hint ?? "Could not get a push token from the native app.");
          return;
        }
        const ok = await registerFcmTokenOnServer(token);
        if (!ok) {
          setMessage("Could not save this device on the server. Try again.");
          return;
        }
        tokenRef.current = token;
        await storage.setItem(FCM_ENABLED_STORAGE_KEY, "1");
        setPushOn(true);
        setMessage("Push notifications are on for this device.");
        showToast("Push is on for this device.");
        return;
      }

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
          "Notifications are blocked for this site. Enable them in your browser or system settings, then try again.",
        );
        return;
      }

      if (Notification.permission === "default") {
        setMessage(
          `Your browser will ask whether ${SITE_NAME} can send notifications — choose Allow to continue.`,
        );
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setMessage(
            perm === "denied"
              ? "Permission was denied. You can enable notifications in browser settings."
              : "Permission was not granted.",
          );
          return;
        }
      }

      const { token, hint } = await obtainFcmToken({ forceRefresh: true });
      if (!token) {
        setMessage(
          hint ??
            "Could not get a push token. Check Firebase config and Web Push key (VAPID).",
        );
        return;
      }

      const ok = await registerFcmTokenOnServer(token);
      if (!ok) {
        setMessage("Could not save this device on the server. Try again.");
        return;
      }

      tokenRef.current = token;
      await storage.setItem(FCM_ENABLED_STORAGE_KEY, "1");
      setPushOn(true);
      setMessage("Push notifications are on for this device.");
      showToast("Push is on for this device.");
    } catch (e) {
      console.error(e);
      setMessage("Something went wrong. Try again or use another browser.");
    } finally {
      setBusy(false);
    }
  }, [configured, isNativeKalnehiShell, showToast]);

  const disablePush = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const tok = tokenRef.current;
      await revokeFcmToken();
      if (tok) {
        await unregisterFcmTokenOnServer(tok);
      }
      tokenRef.current = null;
      await storage.removeItem(FCM_ENABLED_STORAGE_KEY);
      setPushOn(false);
      setMessage("Push notifications are off for this device.");
      showToast("Push is off for this device.", "neutral");
    } catch (e) {
      console.error(e);
      setMessage("Could not turn off push completely. Try clearing site data.");
      await storage.removeItem(FCM_ENABLED_STORAGE_KEY);
      setPushOn(false);
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  const refreshToken = useCallback(async () => {
    setMessage(null);
    setRefreshBusy(true);
    try {
      if (isNativeKalnehiShell) {
        const { token, hint } = await obtainNativeFcmToken({ forceRefresh: true });
        if (!token) {
          setMessage(
            hint ??
              "Could not refresh the push token. Try again in a moment or reopen the app.",
          );
          return;
        }
        const ok = await registerFcmTokenOnServer(token);
        if (!ok) {
          setMessage("Could not save this device on the server. Try again.");
          return;
        }
        tokenRef.current = token;
        await storage.setItem(FCM_ENABLED_STORAGE_KEY, "1");
        setPushOn(true);
        setMessage("Push registration refreshed.");
        showToast("Push registration refreshed.");
        return;
      }

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
          "Notifications are blocked for this site. Enable them in browser or system settings.",
        );
        return;
      }
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setMessage(
            perm === "denied"
              ? "Permission was denied. You can enable notifications in browser settings."
              : "Permission was not granted.",
          );
          return;
        }
      }

      const { token, hint } = await obtainFcmToken({ forceRefresh: true });
      if (!token) {
        setMessage(
          hint ??
            "Could not refresh the push token. Try again in a moment or reload the page.",
        );
        return;
      }

      const ok = await registerFcmTokenOnServer(token);
      if (!ok) {
        setMessage("Could not save this device on the server. Try again.");
        return;
      }

      tokenRef.current = token;
      await storage.setItem(FCM_ENABLED_STORAGE_KEY, "1");
      setPushOn(true);
      setMessage("Push registration refreshed.");
      showToast("Push registration refreshed.");
    } catch (e) {
      console.error(e);
      setMessage("Could not refresh the token. Try again.");
    } finally {
      setRefreshBusy(false);
    }
  }, [configured, isNativeKalnehiShell, showToast]);

  const onToggle = useCallback(
    (next: boolean) => {
      if (next) void enablePush();
      else void disablePush();
    },
    [disablePush, enablePush],
  );

  const sendTest = useCallback(async () => {
    setTestBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fcm/test", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        sent?: number;
        code?: string;
      };
      if (!res.ok) {
        if (res.status === 403) {
          setMessage("You don't have access to send test notifications.");
          return;
        }
        if (looksLikeStaleFcmTokenError(data.error)) {
          setMessage(STALE_TOKEN_MESSAGE);
          return;
        }
        setMessage(surfaceOptionalString(data.error, "Test failed."));
        return;
      }
      if (data.ok && (data.sent ?? 0) > 0) {
        setMessage(data.message ?? "Test sent.");
        showToast("Test notification sent.");
        return;
      }
      if (testResponseLooksLikeStaleToken(data)) {
        setMessage(STALE_TOKEN_MESSAGE);
        return;
      }
      {
        const raw = data.error ?? data.message;
        setMessage(raw ? surfaceErrorForUi(raw) : "Nothing sent.");
      }
    } catch {
      setMessage("Test request failed.");
    } finally {
      setTestBusy(false);
    }
  }, [showToast]);

  if (!user) {
    return null;
  }

  const legacyUnsupportedEnv =
    !isNativeKalnehiShell &&
    typeof window !== "undefined" &&
    (!("Notification" in window) || !("serviceWorker" in navigator));

  const shellClass = embedded
    ? "rounded-xl border border-white/12 bg-white/[0.035] px-3 py-4 dark:border-white/10 dark:bg-black/25"
    : "kal-glass-panel rounded-[1rem] px-3 py-4";

  const devToolsBlock = showDevTest ? (
    <div className="mt-4 border-t border-white/10 pt-4 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void refreshToken()}
          disabled={busy || refreshBusy}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-medium text-kal-text backdrop-blur-sm transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={clsx("size-4", refreshBusy && "animate-spin")}
            aria-hidden
          />
          {refreshBusy ? "Refreshing…" : "Refresh push registration"}
        </button>
        <button
          type="button"
          onClick={() => void sendTest()}
          disabled={testBusy || !pushOn}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-medium text-kal-text backdrop-blur-sm transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden />
          {testBusy ? "Sending…" : "Send test notification"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-kal-text-secondary">
        Admin / developer: calls{" "}
        <span className="font-mono">/api/fcm/test</span>.
      </p>
    </div>
  ) : null;

  return (
    <div className={shellClass}>
      {!embedded ? (
        <div className="flex items-start gap-2">
          <Bell
            className="mt-0.5 size-5 shrink-0 text-kal-accent"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-kal-text">
              Push notifications
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-kal-text-secondary">
              Enable push notifications on my phone (and desktop). Works when the
              app is closed. On iPhone, add Kalnehi to your Home Screen (iOS 16.4+)
              and allow notifications for this site.
            </p>
          </div>
        </div>
      ) : null}

      {isNativeKalnehiShell ? (
        <>
          <div className={clsx("flex items-center justify-between gap-3", embedded ? "mt-1" : "mt-4")}>
            <span className="text-sm font-medium text-kal-text">
              Enable push notifications
            </span>
            <SettingsSheetSwitch
              id={`${baseId}-push`}
              checked={pushOn}
              disabled={busy || refreshBusy}
              onChange={onToggle}
            />
          </div>
          {devToolsBlock}
        </>
      ) : !configured ? (
        <p className={clsx("text-xs text-kal-text-secondary", !embedded && "mt-3")}>
          Push is not configured. Add{" "}
          <span className="font-mono text-[11px]">
            NEXT_PUBLIC_FIREBASE_* and NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY
          </span>{" "}
          for the web app, and{" "}
          <span className="font-mono text-[11px]">
            FIREBASE_SERVICE_ACCOUNT_JSON
          </span>{" "}
          on the server.
        </p>
      ) : legacyUnsupportedEnv ? (
        <p className={clsx("text-xs text-kal-text-secondary", !embedded && "mt-3")}>
          This environment does not support web push.
        </p>
      ) : (
        <>
          <div className={clsx("flex items-center justify-between gap-3", embedded ? "mt-1" : "mt-4")}>
            <span className="text-sm font-medium text-kal-text">
              Enable push notifications on my phone
            </span>
            <SettingsSheetSwitch
              id={`${baseId}-push`}
              checked={pushOn}
              disabled={busy || refreshBusy}
              onChange={onToggle}
            />
          </div>

          {clientIsIos ? (
            <p className="mt-2 text-[11px] leading-relaxed text-kal-text-secondary">
              {IOS_PUSH_HINT}
            </p>
          ) : null}

          {devToolsBlock}
        </>
      )}

      {message ? (
        <p
          className="mt-3 text-xs leading-relaxed text-kal-text-secondary"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
