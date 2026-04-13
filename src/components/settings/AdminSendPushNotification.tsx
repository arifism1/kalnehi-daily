"use client";

import clsx from "clsx";
import { Megaphone, Send } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
} from "react";

import { useAuthStore } from "@/store/useAuthStore";

type Scope = "all" | "single";

export function AdminSendPushNotification() {
  const baseId = useId();
  const user = useAuthStore((s) => s.user);

  const [eligible, setEligible] = useState<boolean | null>(null);
  const [scope, setScope] = useState<Scope>("single");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setEligible(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/fcm/capabilities", {
          credentials: "include",
        });
        const data = (await res.json()) as { canSendPush?: boolean };
        if (!cancelled) {
          setEligible(Boolean(data.canSendPush));
        }
      } catch {
        if (!cancelled) setEligible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setBusy(true);
      try {
        const res = await fetch("/api/fcm/send", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            recipient: scope === "single" ? recipient.trim() : undefined,
            title: title.trim(),
            body: body.trim(),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          usersNotified?: number;
          sent?: number;
          recipientUsers?: number;
        };
        if (!res.ok) {
          setError(data.error ?? "Request failed.");
          return;
        }
        if (data.ok === false) {
          setError(data.error ?? "Push could not be sent.");
          return;
        }
        if (data.ok) {
          const n = data.usersNotified ?? 0;
          const sent = data.sent ?? 0;
          if (scope === "all") {
            const total = data.recipientUsers ?? n;
            setToast(
              `Sent to ${n} user(s) (${sent} device message(s)), out of ${total} with registered devices.`,
            );
          } else {
            setToast(
              n > 0
                ? `Notified ${n} user (${sent} device message(s)).`
                : `No devices received the message (${sent} sent). Recipient may need to enable push.`,
            );
          }
        }
      } catch {
        setError("Network error. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [body, recipient, scope, title],
  );

  if (!user || eligible === false) {
    return null;
  }

  if (eligible === null) {
    return (
      <div className="kal-glass-panel rounded-[1rem] px-3 py-4 opacity-80">
        <p className="text-sm text-kal-text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <>
      <div className="kal-glass-panel rounded-[1rem] px-3 py-4">
        <div className="flex items-start gap-2">
          <Megaphone
            className="mt-0.5 h-5 w-5 shrink-0 text-kal-accent"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-kal-text">
              Send Push Notification
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-kal-text-secondary">
              Admin only. Sends through Firebase Cloud Messaging to registered
              web devices. Requires{" "}
              <span className="font-mono text-[11px]">
                FCM_ADMIN_EMAILS
              </span>{" "}
              /{" "}
              <span className="font-mono text-[11px]">
                FCM_ADMIN_USER_IDS
              </span>{" "}
              (or dev email) on the server.
            </p>
          </div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label
              htmlFor={`${baseId}-title`}
              className="block text-xs font-medium text-kal-text-secondary"
            >
              Title
            </label>
            <input
              id={`${baseId}-title`}
              type="text"
              name="title"
              autoComplete="off"
              placeholder='e.g. "Daily Reminder"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-kal-text placeholder:text-kal-text-secondary/70"
              maxLength={120}
              required
            />
          </div>

          <div>
            <label
              htmlFor={`${baseId}-body`}
              className="block text-xs font-medium text-kal-text-secondary"
            >
              Message
            </label>
            <textarea
              id={`${baseId}-body`}
              name="body"
              rows={3}
              placeholder="Notification body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-kal-text placeholder:text-kal-text-secondary/70"
              maxLength={2000}
              required
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-kal-text-secondary">
              Audience
            </legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-kal-text">
              <input
                type="radio"
                name="scope"
                className="accent-kal-accent"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              Send to all users with push tokens
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-kal-text">
              <input
                type="radio"
                name="scope"
                className="accent-kal-accent"
                checked={scope === "single"}
                onChange={() => setScope("single")}
              />
              Send to one user (email or user id)
            </label>
          </fieldset>

          {scope === "single" ? (
            <div>
              <label
                htmlFor={`${baseId}-recipient`}
                className="block text-xs font-medium text-kal-text-secondary"
              >
                Email or user id
              </label>
              <input
                id={`${baseId}-recipient`}
                type="text"
                name="recipient"
                autoComplete="off"
                placeholder="user@example.com or UUID"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-kal-text placeholder:text-kal-text-secondary/70"
                required={scope === "single"}
              />
            </div>
          ) : null}

          {error ? (
            <p className="text-xs text-rose-600 dark:text-rose-300" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={clsx(
              "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-kal-accent/90 px-4 text-sm font-semibold text-white shadow-sm transition-colors",
              busy ? "cursor-wait opacity-80" : "hover:bg-kal-accent",
            )}
          >
            <Send className="h-4 w-4" aria-hidden />
            {busy ? "Sending…" : "Send now"}
          </button>
        </form>
      </div>

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[60] max-w-[min(92vw,26rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-950 shadow-lg dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-50"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
