"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { formatSupabaseError, getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

type Mode = "login" | "signup";
type AuthView = "form" | "forgot" | "forgot-sent";

function authCallbackUrl(nextPath: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const next = encodeURIComponent(nextPath.startsWith("/") ? nextPath : `/${nextPath}`);
  if (!normalizedOrigin) return `/auth/callback?next=${next}`;
  return `${normalizedOrigin}/auth/callback?next=${next}`;
}

export default function AuthPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<Mode>("login");
  const [view, setView] = useState<AuthView>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(decodeURIComponent(err));
      window.history.replaceState({}, "", "/auth");
    }
  }, []);

  const redirectAfterAuth = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) setAuth(session);
    router.replace("/");
  }, [router, setAuth]);

  const submitEmailAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    setVerifyEmailSent(false);
    try {
      const supabase = getSupabaseBrowserClient();
      const em = email.trim();
      const pw = password;
      if (!em || !pw) {
        setError("Enter email and password.");
        return;
      }
      if (pw.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (mode === "login") {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: em,
          password: pw,
        });
        if (signErr) throw signErr;
        await redirectAfterAuth();
      } else {
        const { error: signErr } = await supabase.auth.signUp({
          email: em,
          password: pw,
        });
        if (signErr) throw signErr;
        const {
          data: { session: after },
        } = await supabase.auth.getSession();
        if (!after) {
          setVerifyEmailSent(true);
          return;
        }
        await redirectAfterAuth();
      }
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [email, password, mode, redirectAfterAuth]);

  const submitForgot = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const em = email.trim();
      if (!em) {
        setError("Enter your email address.");
        return;
      }
      /* PKCE: recovery link exchanges the code on /auth/callback, then sends user to /auth/reset */
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: authCallbackUrl("/auth/reset"),
      });
      if (resetErr) throw resetErr;
      setView("forgot-sent");
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [email]);

  const signInGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: oErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authCallbackUrl("/") },
      });
      if (oErr) throw oErr;
    } catch (e) {
      setError(formatSupabaseError(e));
      setBusy(false);
    }
  }, []);

  if (view === "forgot-sent") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-8 bg-kal-page px-6 py-16">
        <div className="text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
            Kalnehi
          </p>
          <h1 className="mt-2 text-2xl font-bold text-kal-text">Check your email</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-kal-muted">
            Password reset link sent to your email. Check your inbox (and spam
            folder).
          </p>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-kal-accent/25 bg-red-950/30 px-4 py-5 text-center">
          <p className="text-sm text-red-100/90">
            When you open the link, you&apos;ll set a new password and return to
            the app.
          </p>
          <button
            type="button"
            onClick={() => {
              setView("form");
              setError(null);
            }}
            className="mt-5 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-kal-accent py-3 text-sm font-semibold text-white shadow-sm hover:bg-kal-accent-hover transition-opacity hover:opacity-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-8 bg-kal-page px-6 py-16">
        <div className="text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
            Kalnehi
          </p>
          <h1 className="mt-2 text-2xl font-bold text-kal-text">Forgot password</h1>
          <p className="mt-2 text-sm text-kal-muted">
            We&apos;ll email you a link to reset it.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-kal-border bg-kal-card kal-shadow-card p-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitForgot();
            }}
          >
            <div>
              <label
                htmlFor="forgot-email"
                className="flex items-center gap-1.5 text-xs font-medium text-kal-muted"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-[15px] text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-xl bg-kal-accent py-3 text-sm font-semibold text-white shadow-sm hover:bg-kal-accent-hover transition-opacity duration-200 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send reset link
            </button>
          </form>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setView("form");
              setError(null);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-kal-muted transition-colors hover:text-kal-text-secondary disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 bg-kal-page px-6 py-16">
      <div className="text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Kalnehi
        </p>
        <h1 className="mt-2 text-2xl font-bold text-kal-text">Kalnehi Daily</h1>
        <p className="mt-2 text-sm text-kal-muted">
          Welcome back — your plan and syllabus stay with you on every device.
        </p>
      </div>

      {verifyEmailSent && (
        <div
          className="w-full max-w-sm rounded-2xl border border-kal-accent/30 bg-red-950/40 px-4 py-3 text-sm text-red-100"
          role="status"
        >
          Check your inbox to confirm your email. After confirming, use{" "}
          <strong className="text-kal-text">Log in</strong> with the same password.
        </div>
      )}

      <div className="w-full max-w-sm rounded-2xl border border-kal-border bg-kal-card kal-shadow-card p-1">
        <div className="flex rounded-xl bg-kal-input-bg/80 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setVerifyEmailSent(false);
            }}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-200",
              mode === "login"
                ? "bg-kal-accent text-white"
                : "text-kal-muted hover:text-kal-text-secondary",
            )}
          >
            <LogIn className="h-4 w-4" />
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setVerifyEmailSent(false);
            }}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-200",
              mode === "signup"
                ? "bg-kal-accent text-white"
                : "text-kal-muted hover:text-kal-text-secondary",
            )}
          >
            <UserPlus className="h-4 w-4" />
            Sign up
          </button>
        </div>

        <form
          className="mt-4 space-y-4 px-3 pb-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitEmailAuth();
          }}
        >
          <div>
            <label
              htmlFor="auth-email"
              className="flex items-center gap-1.5 text-xs font-medium text-kal-muted"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-[15px] text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="flex items-center gap-1.5 text-xs font-medium text-kal-muted"
            >
              <Lock className="h-3.5 w-3.5" />
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-[15px] text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              placeholder="••••••••"
            />
            {mode === "login" && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setError(null);
                  }}
                  className="text-[12px] font-medium text-kal-muted underline-offset-4 transition-colors hover:text-kal-accent/90 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-xl bg-kal-accent py-3 text-sm font-semibold text-white shadow-sm hover:bg-kal-accent-hover transition-opacity duration-200 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {mode === "login" ? "Continue with email" : "Create account"}
          </button>
        </form>

        <div className="border-t border-kal-border px-3 pb-4 pt-2">
          <p className="text-center text-[11px] text-kal-muted">or</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signInGoogle()}
            className="mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card py-3 text-sm font-semibold text-kal-text transition-colors duration-200 hover:bg-kal-card-muted disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : null}
            Continue with Google
          </button>
        </div>
      </div>

      <p className="max-w-sm text-center text-[11px] text-kal-muted">
        By continuing you agree to study like your rank depends on it.{" "}
        <Link href="/" className="text-kal-muted hover:text-kal-accent">
          Back to home
        </Link>
      </p>
    </div>
  );
}
