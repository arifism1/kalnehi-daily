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
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { buildAuthCallbackUrl } from "@/lib/authCallbackUrl";

const AuthAppNavPreviewMenu = dynamic(
  () =>
    import("@/components/auth/AuthAppNavPreviewMenu").then((m) => ({
      default: m.AuthAppNavPreviewMenu,
    })),
  { ssr: false },
);
import { attachReferralToUser } from "@/actions/referral";
import { trackAuthSuccess } from "@/lib/analytics";
import {
  clearStoredReferral,
  getStoredReferral,
  isInstagramReferral,
  type StoredReferral,
} from "@/lib/referral-capture";
import { SITE_NAME } from "@/lib/seo-metadata";
import { formatSupabaseError, getSupabaseBrowserClient } from "@/lib/supabase";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";

type Mode = "login" | "signup";
type AuthView = "form" | "forgot" | "forgot-sent";

/** Small app mark: grid tile + overflow so the 192px asset cannot flex-grow past the frame. */
function AuthPageMark({ priority }: { priority?: boolean }) {
  return (
    <div className="mb-3 flex shrink-0 justify-center">
      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[rgba(255,252,248,0.95)] shadow-sm ring-2 ring-kal-accent/20">
        <Image
          src="/icon-192x192.png"
          alt=""
          width={48}
          height={48}
          priority={priority}
          className="size-10 object-contain"
        />
      </div>
    </div>
  );
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
  const [storedReferral, setStoredReferral] = useState<StoredReferral | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(toUserFacingMessage(new Error(decodeURIComponent(err))));
      window.history.replaceState({}, "", "/auth");
    }
    // Pre-fill referral badge if user arrived from Instagram.
    if (isInstagramReferral()) {
      const stored = getStoredReferral();
      if (stored.ref) {
        setStoredReferral(stored);
        setMode("signup");
      }
    }
  }, []);

  const redirectAfterAuth = useCallback(
    async (kind: "login" | "sign_up") => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setAuth(session);
        trackAuthSuccess(kind);
      }
      const params = new URLSearchParams(window.location.search);
      const nextRaw = params.get("next");
      const nextPath =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/home";
      router.replace(nextPath);
    },
    [router, setAuth],
  );

  const submitEmailAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    setVerifyEmailSent(false);
    try {
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

      const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: em, password: pw }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Something went wrong.",
        );
      }

      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const {
          data: { session: after },
        } = await supabase.auth.getSession();
        if (!after) {
          setVerifyEmailSent(true);
          return;
        }
        // Attach referral attribution if user arrived via a referral link.
        const ref = getStoredReferral();
        if (ref.ref) {
          void attachReferralToUser({
            ref: ref.ref,
            utmSource: ref.utmSource,
            utmMedium: ref.utmMedium,
            utmCampaign: ref.utmCampaign,
            refUrl: ref.refUrl,
          }).then(() => clearStoredReferral());
        }
        await redirectAfterAuth("sign_up");
      } else {
        await redirectAfterAuth("login");
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
      const em = email.trim();
      if (!em) {
        setError("Enter your email address.");
        return;
      }
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: em }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Something went wrong.",
        );
      }
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
      const params = new URLSearchParams(window.location.search);
      const nextRaw = params.get("next");
      const nextPath =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/home";
      const supabase = getSupabaseBrowserClient();
      const { error: oErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: buildAuthCallbackUrl(nextPath) },
      });
      if (oErr) throw oErr;
    } catch (e) {
      setError(formatSupabaseError(e));
      setBusy(false);
    }
  }, []);

  if (view === "forgot-sent") {
    return (
      <div className="kal-page-bg flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
        <AuthAppNavPreviewMenu />
        <div className="text-center">
          <AuthPageMark />
          <h1 className="kal-feature-title mt-2">Check your email</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-kal-muted">
            Password reset link sent to your email. Check your inbox (and spam
            folder).
          </p>
        </div>
        <div className="kal-glass-card w-full max-w-sm rounded-2xl border border-kal-accent/25 px-4 py-5 text-center">
          <p className="text-sm text-kal-text-secondary">
            When you open the link, you&apos;ll set a new password and return to
            the app.
          </p>
          <button
            type="button"
            onClick={() => {
              setView("form");
              setError(null);
            }}
            className="kal-btn-accent mt-5 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="kal-page-bg flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
        <AuthAppNavPreviewMenu />
        <div className="text-center">
          <AuthPageMark />
          <h1 className="kal-feature-title mt-2">Forgot password</h1>
          <p className="mt-2 text-sm text-kal-muted">
            We&apos;ll email you a link to reset it.
          </p>
        </div>

        <div className="kal-glass-panel w-full max-w-sm rounded-2xl p-4">
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
                className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
              >
                <Mail className="size-3.5" />
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                placeholder="you@example.com"
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
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Mail className="size-4" />
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
            <ArrowLeft className="size-4" />
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kal-page-bg flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      <AuthAppNavPreviewMenu />

      <div className="flex w-full max-w-sm flex-col items-center gap-2 sm:max-w-md">
        <div className="text-center">
          <AuthPageMark priority />
          <h1 className="kal-feature-title mt-2 max-w-md text-balance leading-snug">
            {SITE_NAME}
          </h1>
        </div>
      </div>

      {verifyEmailSent && (
        <div
          className="kal-glass-card w-full max-w-sm rounded-2xl border border-kal-accent/30 px-4 py-3 text-sm text-kal-text-secondary"
          role="status"
        >
          Check your inbox to confirm your email. After confirming, use{" "}
          <strong className="text-kal-text">Log in</strong> with the same password.
        </div>
      )}

      <div className="kal-glass-panel w-full max-w-sm rounded-2xl p-1">
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
                : "text-kal-text-secondary hover:text-kal-text",
            )}
          >
            <LogIn className="size-4" />
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
                : "text-kal-text-secondary hover:text-kal-text",
            )}
          >
            <UserPlus className="size-4" />
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
          {mode === "signup" && storedReferral?.ref && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary">
                <KeyRound className="size-3.5" />
                Referral code
              </p>
              <div className="mt-1.5 flex min-h-[44px] w-full items-center justify-between rounded-xl border border-kal-accent/25 bg-kal-accent/[0.04] px-4 py-2.5">
                <span className="font-mono text-sm font-semibold tracking-wide text-kal-text">
                  {storedReferral.ref}
                </span>
                <span className="text-xs font-semibold text-emerald-500">Applied ✓</span>
              </div>
            </div>
          )}
          <div>
            <label
              htmlFor="auth-email"
              className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
            >
              <Mail className="size-3.5" />
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
            >
              <Lock className="size-3.5" />
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
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
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
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
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
            className="kal-glass-subtle mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-kal-text transition-colors duration-200 hover:opacity-95 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : null}
            Continue with Google
          </button>
        </div>
      </div>

      <p className="max-w-sm text-center text-[11px] text-kal-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline-offset-2 hover:text-kal-accent hover:underline">
          terms and conditions
        </Link>
        .
      </p>
    </div>
  );
}
