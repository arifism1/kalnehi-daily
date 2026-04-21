"use client";

import { KeyRound, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { formatSupabaseError, getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthResetPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const pw = password;
      const c = confirm;
      if (!pw || !c) {
        setError("Enter and confirm your new password.");
        return;
      }
      if (pw.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (pw !== c) {
        setError("Passwords do not match.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: upErr } = await supabase.auth.updateUser({
        password: pw,
      });
      if (upErr) throw upErr;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) setAuth(session);
      router.replace("/");
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [password, confirm, router, setAuth]);

  return (
    <div className="kal-page-bg flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-kal-accent-dark">
          Kalnehi
        </p>
        <h1 className="kal-feature-title mt-2">Set new password</h1>
        <p className="mt-2 text-sm text-kal-muted">
          Choose a strong password for your account.
        </p>
      </div>

      <div className="kal-glass-panel w-full max-w-sm rounded-2xl p-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <label
              htmlFor="reset-password"
              className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
            >
              <Lock className="h-3.5 w-3.5" />
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label
              htmlFor="reset-confirm"
              className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
            >
              <Lock className="h-3.5 w-3.5" />
              Confirm password
            </label>
            <input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-sm text-kal-danger-text">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="kal-btn-accent flex w-full min-h-[50px] items-center justify-center gap-2 rounded-xl disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Update password
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-kal-muted">
          <Link
            href="/auth"
            className="text-kal-muted underline-offset-2 transition-colors hover:text-kal-accent hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
