"use client";

import clsx from "clsx";
import { Bell, Send } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  obtainFcmToken,
  revokeFcmToken,
} from "@/lib/firebase/messagingClient";
import { showFcmDevTools } from "@/lib/fcm/adminGate";
import { SITE_NAME } from "@/lib/seo-metadata";
import { useAuthStore } from "@/store/useAuthStore";

const LS_ENABLED = "kalnehi-fcm-enabled";
const PUSH_REENABLE_MSG =
  "Push notifications need to be re-enabled. Please turn the toggle OFF and then ON again.";

function looksLikeStaleFcmTokenError(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  const t = text.trim().toLowerCase();
  return (
    t.includes("registration-token-not-registered") ||
    t.includes("invalid-registration-token")
  );
}

function SheetSwitch({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={clsx(
        "relative h-9 w-14 shrink-0 rounded-full transition-[background-color] duration-200",
        disabled ? "cursor-not-allowed opacity-50" : "",
        checked ? "bg-kal-accent" : "bg-kal-border",
      )}
    >
      <span
        className={clsx(
          "absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[1.35rem]" : "translate-x-0",
        )}
      />
    </button>
  );
}

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

export function PushNotificationsSettings() {
  const baseId = useId();
  const user = useAuthStore((s) => s.user);
  const tokenRef = useRef<string | null>(null);

  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const configured = isFirebaseConfigured();

  const syncFromBrowser = useCallback(async () => {
    if (!configured || typeof window === "undefined") {
      setPushOn(false);
      return;
    }
    if (Notification.permission !== "granted") {
      setPushOn(false);
      return;
    }
    try {
      const { token, hint } = await obtainFcmToken();
      if (!token) {
        setPushOn(false);
        if (hint) console.warn("[FCM sync]", hint);
        return;
      }
      tokenRef.current = token;
      const want =
        typeof localStorage !== "undefined" &&
        localStorage.getItem(LS_ENABLED) === "1";
      if (!want) {
        setPushOn(false);
        return;
      }
      const ok = await registerTokenOnServer(token);
      setPushOn(ok);
    } catch (e) {
      console.error(e);
      setPushOn(false);
    }
  }, [configured]);

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

  const showDevTest = showFcmDevTools(user);

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
        "Notifications are blocked for this site. Enable them in your browser or system settings, then try again.",
      );
      return;
    }

    setBusy(true);
    try {
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
          setBusy(false);
          return;
        }
      }

      const { token, hint } = await obtainFcmToken();
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
      localStorage.setItem(LS_ENABLED, "1");
      setPushOn(true);
      setMessage("Push notifications are on for this device.");
    } catch (e) {
      console.error(e);
      setMessage("Something went wrong. Try again or use another browser.");
    } finally {
      setBusy(false);
    }
  }, [configured]);

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
      localStorage.removeItem(LS_ENABLED);
      setPushOn(false);
      setMessage("Push notifications are off for this device.");
    } catch (e) {
      console.error(e);
      setMessage("Could not turn off push completely. Try clearing site data.");
      localStorage.removeItem(LS_ENABLED);
      setPushOn(false);
    } finally {
      setBusy(false);
    }
  }, []);

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
          try {
            localStorage.removeItem(LS_ENABLED);
          } catch {
            /* ignore */
          }
          tokenRef.current = null;
          void revokeFcmToken();
          setPushOn(false);
          setMessage(PUSH_REENABLE_MSG);
          return;
        }
        setMessage(data.error ?? "Test failed.");
        return;
      }
      if (data.ok && (data.sent ?? 0) > 0) {
        setMessage(data.message ?? "Test sent.");
        return;
      }
      if (
        data.code === "push_token_stale" ||
        looksLikeStaleFcmTokenError(data.error) ||
        looksLikeStaleFcmTokenError(data.message)
      ) {
        try {
          localStorage.removeItem(LS_ENABLED);
        } catch {
          /* ignore */
        }
        tokenRef.current = null;
        void revokeFcmToken();
        setPushOn(false);
        setMessage(PUSH_REENABLE_MSG);
        return;
      }
      setMessage(data.error ?? data.message ?? "Nothing sent.");
    } catch {
      setMessage("Test request failed.");
    } finally {
      setTestBusy(false);
    }
  }, []);

  if (!user) {
    return null;
  }

  const unsupported =
    typeof window !== "undefined" &&
    (!("Notification" in window) || !("serviceWorker" in navigator));

  return (
    <div className="kal-glass-panel rounded-[1rem] px-3 py-4">
      <div className="flex items-start gap-2">
        <Bell
          className="mt-0.5 h-5 w-5 shrink-0 text-kal-accent"
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

      {!configured ? (
        <p className="mt-3 text-xs text-kal-text-secondary">
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
      ) : unsupported ? (
        <p className="mt-3 text-xs text-kal-text-secondary">
          This environment does not support web push.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-kal-text">
              Enable push notifications on my phone
            </span>
            <SheetSwitch
              id={`${baseId}-push`}
              checked={pushOn}
              disabled={busy}
              onChange={onToggle}
            />
          </div>

          {showDevTest && (
            <div className="mt-4 border-t border-white/10 pt-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => void sendTest()}
                disabled={testBusy || !pushOn}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-medium text-kal-text backdrop-blur-sm transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden />
                {testBusy ? "Sending…" : "Send test notification"}
              </button>
              <p className="mt-2 text-[11px] text-kal-text-secondary">
                Admin / developer: calls{" "}
                <span className="font-mono">/api/fcm/test</span>. Use{" "}
                <span className="font-semibold">Send Push Notification</span>{" "}
                below for targeted or broadcast sends (
                <span className="font-mono">/api/fcm/send</span>).
              </p>
            </div>
          )}
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
