"use client";

import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/engine/notificationPrefs";

import { EngineCard, EngineHero } from "./EngineHero";

export function NotificationsEngineClient() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadNotificationPrefs);
  const [perm, setPerm] = useState<string>("unsupported");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  const persist = useCallback((next: NotificationPrefs) => {
    setPrefs(next);
    saveNotificationPrefs(next);
  }, []);

  const requestBrowser = async () => {
    if (!("Notification" in window)) return;
    const r = await Notification.requestPermission();
    setPerm(r);
  };

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Alerts"
        title="Notifications"
        description="Schedule planning nudges and optional browser alerts for pending work, low execution, and revision due — all under your control."
      />

      <EngineCard title="Browser permission">
        {perm === "unsupported" ? (
          <p className="text-sm text-zinc-500">
            Browser notifications aren&apos;t available in this environment.
            Reminders still save locally for when you open the app.
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">
              Status:{" "}
              <span className="font-semibold text-zinc-200">{perm}</span>
            </p>
            <button
              type="button"
              onClick={() => void requestBrowser()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
            >
              <Bell className="h-4 w-4" />
              Enable browser alerts
            </button>
          </div>
        )}
      </EngineCard>

      <EngineCard title="Reminder schedule">
        <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={(e) =>
              persist({ ...prefs, enabled: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-600"
          />
          Daily planning reminder
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-xs text-zinc-500">
            Hour (0–23)
            <input
              type="number"
              min={0}
              max={23}
              value={prefs.planningHour}
              onChange={(e) =>
                persist({
                  ...prefs,
                  planningHour: Math.min(
                    23,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              className="mt-1 block w-24 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Minute
            <input
              type="number"
              min={0}
              max={59}
              value={prefs.planningMinute}
              onChange={(e) =>
                persist({
                  ...prefs,
                  planningMinute: Math.min(
                    59,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              className="mt-1 block w-24 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">
          Times use your device clock. For reliable delivery, keep Kalnehi
          installed as a PWA and allow notifications.
        </p>
      </EngineCard>

      <EngineCard title="Dynamic alerts">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex items-center justify-between gap-2">
            <span>Pending / missed tasks</span>
            <input
              type="checkbox"
              checked={prefs.alertPending}
              onChange={(e) =>
                persist({ ...prefs, alertPending: e.target.checked })
              }
              className="h-4 w-4"
            />
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Low execution days</span>
            <input
              type="checkbox"
              checked={prefs.alertLowExecution}
              onChange={(e) =>
                persist({ ...prefs, alertLowExecution: e.target.checked })
              }
              className="h-4 w-4"
            />
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Revision due (local queue)</span>
            <input
              type="checkbox"
              checked={prefs.alertRevision}
              onChange={(e) =>
                persist({ ...prefs, alertRevision: e.target.checked })
              }
              className="h-4 w-4"
            />
          </li>
        </ul>
      </EngineCard>

      <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-[11px] text-zinc-500">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
        <p>
          Kalnehi never sends exam content from our servers for notifications —
          preferences stay on your device. Background delivery depends on your
          browser and OS; open the app daily for the strongest accountability
          loop.
        </p>
      </div>
    </div>
  );
}
