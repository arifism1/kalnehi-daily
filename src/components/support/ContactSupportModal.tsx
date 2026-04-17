"use client";

import clsx from "clsx";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CONTACT_SUPPORT_SUBJECTS } from "@/lib/contactSupport";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatSupabaseError } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export type ContactSupportModalProps = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
};

export function ContactSupportModal({
  open,
  onClose,
  onSent,
}: ContactSupportModalProps) {
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>(
    CONTACT_SUPPORT_SUBJECTS[0].value,
  );
  const [message, setMessage] = useState("");
  /** Honeypot — must stay empty (bots often fill hidden fields). */
  const [websiteTrap, setWebsiteTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!user?.id) {
      setEmail(user?.email?.trim() ?? "");
      setName("");
      return;
    }
    let cancelled = false;
    setEmail(user.email?.trim() ?? "");
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: qErr } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (qErr) throw qErr;
        const fn = data?.full_name?.trim();
        if (fn) setName(fn);
        else {
          const meta =
            (user.user_metadata?.full_name as string | undefined)?.trim() ||
            (user.user_metadata?.name as string | undefined)?.trim();
          setName(meta ?? "");
        }
      } catch (e) {
        if (!cancelled) {
          const meta =
            (user.user_metadata?.full_name as string | undefined)?.trim() ||
            (user.user_metadata?.name as string | undefined)?.trim();
          setName(meta ?? "");
          console.warn("[ContactSupportModal] profile fetch", formatSupabaseError(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id, user?.email, user?.user_metadata]);

  const resetForm = useCallback(() => {
    setSubject(CONTACT_SUPPORT_SUBJECTS[0].value);
    setMessage("");
    setWebsiteTrap("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const submit = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
          website: websiteTrap,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      onSent();
      onClose();
      resetForm();
    } catch {
      setError("Could not send your message. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [name, email, subject, message, websiteTrap, onClose, onSent, resetForm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
        disabled={busy}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-support-title"
        className="kal-glass-panel relative z-[81] flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl sm:max-h-[min(88dvh,36rem)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/15 px-5 pb-4 pt-5 dark:border-white/10">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
              Help
            </p>
            <h2
              id="contact-support-title"
              className="mt-1 text-lg font-bold tracking-tight text-kal-text"
            >
              Contact support
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-kal-muted">
              We read every message and usually reply within a day or two.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="sr-only">
            <label htmlFor="contact-website">Leave blank</label>
            <input
              id="contact-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={websiteTrap}
              onChange={(e) => setWebsiteTrap(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor="contact-name"
              className="text-xs font-semibold text-kal-text-secondary"
            >
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className="min-h-[44px] rounded-xl border border-white/20 bg-white/50 px-3 py-2 text-sm text-kal-text outline-none ring-kal-accent/30 placeholder:text-kal-muted focus:border-kal-accent/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900/60"
              placeholder="Your name"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="contact-email"
              className="text-xs font-semibold text-kal-text-secondary"
            >
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="min-h-[44px] rounded-xl border border-white/20 bg-white/50 px-3 py-2 text-sm text-kal-text outline-none ring-kal-accent/30 placeholder:text-kal-muted focus:border-kal-accent/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900/60"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="contact-subject"
              className="text-xs font-semibold text-kal-text-secondary"
            >
              Subject
            </label>
            <select
              id="contact-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
              className="min-h-[44px] appearance-none rounded-xl border border-white/20 bg-white/50 bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2 pr-9 text-sm text-kal-text outline-none ring-kal-accent/30 focus:border-kal-accent/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900/60"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              }}
            >
              {CONTACT_SUPPORT_SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid min-h-0 flex-1 gap-1.5">
            <label
              htmlFor="contact-message"
              className="text-xs font-semibold text-kal-text-secondary"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy}
              rows={5}
              required
              className="min-h-[120px] resize-y rounded-xl border border-white/20 bg-white/50 px-3 py-2.5 text-sm leading-relaxed text-kal-text outline-none ring-kal-accent/30 placeholder:text-kal-muted focus:border-kal-accent/40 focus:ring-2 dark:border-white/10 dark:bg-zinc-900/60"
              placeholder="Describe what you need help with…"
            />
          </div>

          {error ? (
            <p
              className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-white/10 bg-[color-mix(in_oklab,var(--kal-page)_88%,transparent)] pt-3 backdrop-blur-sm dark:bg-[color-mix(in_oklab,var(--kal-page)_75%,transparent)]">
            <button
              type="submit"
              disabled={busy}
              className={clsx(
                "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors active:scale-[0.99] sm:min-h-[44px]",
                busy
                  ? "cursor-wait bg-kal-accent/60 text-kal-accent-foreground"
                  : "bg-kal-accent text-kal-accent-foreground hover:bg-kal-accent-hover",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                "Send message"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
