"use client";

import clsx from "clsx";
import { BellRing, Sparkles } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { SettingsSheetSwitch } from "@/components/settings/SettingsSheetSwitch";
import { useNotificationsToast } from "@/components/settings/notificationsToastContext";
import { useAuthStore } from "@/store/useAuthStore";
import { surfaceOptionalString } from "@/lib/userFacingErrors";

/**
 * Kalnehi-scheduled pushes (IST): morning kickstart, danger-zone alert, evening wind-down.
 */
export function SystemNotificationsSettings({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const baseId = useId();
  const user = useAuthStore((s) => s.user);
  const showToast = useNotificationsToast();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/user/system-push", { credentials: "include" });
        const data = (await res.json()) as { enabled?: boolean };
        if (!cancelled && res.ok) {
          setEnabled(data.enabled !== false);
        }
      } catch {
        if (!cancelled) setMessage("Could not load preference.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onToggle = useCallback(
    async (next: boolean) => {
      setMessage(null);
      setBusy(true);
      try {
        const res = await fetch("/api/user/system-push", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: next }),
        });
        const data = (await res.json()) as { enabled?: boolean; error?: string };
        if (!res.ok) {
          setMessage(
            surfaceOptionalString(data.error, "Could not update."),
          );
          return;
        }
        setEnabled(data.enabled !== false);
        setMessage(
          next
            ? "System notifications are on. You’ll get morning and evening nudges (IST) when push is enabled on a device."
            : "System notifications are off. You won’t receive automated Kalnehi Daily pushes.",
        );
        showToast(
          next ? "System notifications on." : "System notifications off.",
          next ? "success" : "neutral",
        );
      } catch {
        setMessage("Something went wrong. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  if (!user) return null;

  const shellClass = embedded
    ? "rounded-xl border border-white/12 bg-white/[0.035] px-3 py-4 dark:border-white/10 dark:bg-black/25"
    : "kal-glass-panel rounded-[1rem] px-3 py-4";

  return (
    <div className={shellClass}>
      {!embedded ? (
        <div className="flex items-start gap-2">
          <Sparkles
            className="mt-0.5 size-5 shrink-0 text-kal-accent"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-kal-text">
              System notifications
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-kal-text-secondary">
              Automated Kalnehi Daily messages: morning kickstart (7:00 AM IST), danger
              alert when Master Today drops below 25%, and evening wind-down (8:00
              PM IST). Requires push enabled on at least one device.
            </p>
          </div>
        </div>
      ) : null}

      <div className={clsx("flex items-center justify-between gap-3", embedded ? "mt-1" : "mt-4")}>
        {loading ? (
          <div className="flex flex-1 items-center gap-2">
            <div className="size-4 shrink-0 animate-pulse rounded bg-kal-border/60" />
            <div className="h-4 max-w-[12rem] flex-1 animate-pulse rounded bg-kal-border/50" />
          </div>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-kal-text">
            <BellRing className="size-4 shrink-0 text-kal-accent" aria-hidden />
            Automated system messages
          </span>
        )}
        <SettingsSheetSwitch
          id={`${baseId}-sys-push`}
          checked={enabled}
          disabled={busy || loading}
          onChange={(n) => void onToggle(n)}
        />
      </div>

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
