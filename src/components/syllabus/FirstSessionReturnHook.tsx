"use client";

import { Bell, Clock } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  obtainFcmToken,
  obtainNativeFcmToken,
} from "@/lib/firebase/messagingClient";
import {
  FCM_ENABLED_STORAGE_KEY,
  registerFcmTokenOnServer,
} from "@/lib/fcm/registerClient";
import { usePlatform } from "@/hooks/usePlatform";
import { SITE_NAME } from "@/lib/seo-metadata";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";
import * as storage from "@/lib/storage";

const STUDY_TIMES = [
  { label: "6:00 AM", value: "06:00" },
  { label: "7:00 AM", value: "07:00" },
  { label: "8:00 AM", value: "08:00" },
  { label: "5:00 PM", value: "17:00" },
  { label: "7:00 PM", value: "19:00" },
  { label: "9:00 PM", value: "21:00" },
];

export function FirstSessionReturnHook({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const { isApp: isNative } = usePlatform();
  const [selectedTime, setSelectedTime] = useState("07:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (!isFirebaseConfigured()) return false;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return false;
      }
      const tokenResult = isNative
        ? await obtainNativeFcmToken()
        : await obtainFcmToken();
      const token = tokenResult.token;
      if (!token) return false;
      await registerFcmTokenOnServer(token);
      await storage.setItem(FCM_ENABLED_STORAGE_KEY, "1");
      setPushEnabled(true);
      return true;
    } catch {
      return false;
    }
  }, [isNative]);

  const saveReminder = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/custom-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Study time",
          body: "Open Kalnehi — tick today's syllabus and keep your projection climbing.",
          scheduledTime: `${selectedTime}:00`,
          repeatType: "daily",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not save reminder.");
      }
      await enablePush();
      onClose();
    } catch (e) {
      setError(surfaceErrorForUi(e));
    } finally {
      setBusy(false);
    }
  }, [selectedTime, enablePush, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-4">
      <div
        className="kal-glass-panel w-full max-w-md rounded-2xl border border-kal-border p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-lg font-semibold text-kal-text">
          Nice — your projection moved!
        </h2>
        <p className="mt-2 text-sm text-kal-text-secondary">
          Come back tomorrow and keep ticking syllabus. When do you usually start studying?
        </p>

        <div className="mt-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-kal-muted">
            <Clock className="size-3.5" aria-hidden />
            Daily reminder
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {STUDY_TIMES.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={busy}
                onClick={() => setSelectedTime(t.value)}
                className={
                  selectedTime === t.value
                    ? "rounded-lg border border-kal-accent bg-kal-accent/15 px-2 py-2 text-xs font-semibold text-kal-text"
                    : "rounded-lg border border-kal-border px-2 py-2 text-xs text-kal-text-secondary hover:border-kal-accent/40"
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs text-kal-muted">
          <Bell className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          We&apos;ll also ask {SITE_NAME} for notification permission so we can nudge you on
          day 2 if you forget.
          {pushEnabled ? (
            <span className="font-semibold text-kal-accent"> Notifications on.</span>
          ) : null}
        </p>

        {error ? <p className="mt-3 text-sm text-kal-warn-text">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-kal-border px-4 text-sm font-medium text-kal-text-secondary"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveReminder()}
            className="min-h-[44px] flex-1 rounded-xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover disabled:opacity-50"
          >
            {busy ? "Saving…" : "Set reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
