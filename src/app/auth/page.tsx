"use client";

import clsx from "clsx";
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { buildAuthCallbackUrl } from "@/lib/authCallbackUrl";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { useNativeOAuthBrowserDismiss } from "@/hooks/useNativeOAuthBrowserDismiss";
import {
  isNativeKalnehiShell,
  startNativeSupabaseOAuthFlow,
} from "@/lib/nativeSupabaseOAuth";

const AuthAppNavPreviewMenu = dynamic(
  () =>
    import("@/components/auth/AuthAppNavPreviewMenu").then((m) => ({
      default: m.AuthAppNavPreviewMenu,
    })),
  { ssr: false },
);
import { DpdpConsentNotice } from "@/components/auth/DpdpConsentNotice";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
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

type AuthStep = "email" | "otp";

const OTP_RESEND_COOLDOWN_SEC = 60;

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

function isNewUserFromSession(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const createdMs = Date.parse(createdAt);
  return createdMs > 0 && Date.now() - createdMs < 5 * 60 * 1000;
}

export default function AuthPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isNativeApp = isNativeKalnehiShell();

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [storedReferral, setStoredReferral] = useState<StoredReferral | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [dpdpAgreed, setDpdpAgreed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(toUserFacingMessage(new Error(decodeURIComponent(err))));
      window.history.replaceState({}, "", "/auth");
    }
    if (isInstagramReferral()) {
      const stored = getStoredReferral();
      if (stored.ref) {
        setStoredReferral(stored);
      }
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

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
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : APP_HOME_PATH;
      router.replace(nextPath);
    },
    [router, setAuth],
  );

  const signupChecksOk = ageConfirmed && dpdpAgreed;

  const recordSignupConsent = useCallback(async (method: "email_otp" | "google_oauth") => {
    try {
      await fetch("/api/dpdp/record-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ method }),
      });
    } catch {
      /* non-blocking; consent can be reconciled via support */
    }
  }, []);

  const sendOtp = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const em = email.trim();
      if (!em) {
        setError("Enter your email address.");
        return;
      }
      if (!signupChecksOk) {
        setError("Please confirm you are 18+ and agree to the data processing notice.");
        return;
      }
      const res = await fetch("/api/auth/otp-send", {
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
      setStep("otp");
      setOtp("");
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [email, signupChecksOk]);

  const verifyOtp = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const em = email.trim();
      const token = otp.trim();
      if (!em) {
        setError("Enter your email address.");
        return;
      }
      if (!/^\d{6}$/.test(token)) {
        setError("Enter the 6-digit code from your email.");
        return;
      }
      const res = await fetch("/api/auth/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: em, token, type: "email" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Something went wrong.",
        );
      }

      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Could not sign you in. Please try again.");
      }

      const isNewUser = isNewUserFromSession(session.user.created_at);
      if (isNewUser) {
        await recordSignupConsent("email_otp");
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
      }
      await redirectAfterAuth(isNewUser ? "sign_up" : "login");
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [email, otp, redirectAfterAuth, recordSignupConsent]);

  const clearGoogleBusy = useCallback(() => {
    setBusy(false);
  }, []);

  useNativeOAuthBrowserDismiss(clearGoogleBusy, busy);

  const signInGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (!signupChecksOk) {
        setError("Please confirm you are 18+ and agree to the data processing notice.");
        setBusy(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const nextRaw = params.get("next");
      const nextPath =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : APP_HOME_PATH;
      const supabase = getSupabaseBrowserClient();
      const redirectTo = buildAuthCallbackUrl(nextPath);

      if (isNativeKalnehiShell()) {
        await startNativeSupabaseOAuthFlow(() =>
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo, skipBrowserRedirect: true },
          }),
        );
        return;
      }

      const { error: oErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oErr) throw oErr;
    } catch (e) {
      setError(formatSupabaseError(e));
      setBusy(false);
    }
  }, [signupChecksOk]);

  const trimmedEmail = email.trim();

  return (
    <div className="kal-page-bg flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      <AuthAppNavPreviewMenu />

      <div className="flex w-full max-w-sm flex-col items-center gap-2 sm:max-w-md">
        <div className="text-center">
          <AuthPageMark priority />
          <h1 className="kal-feature-title mt-2 max-w-md text-balance leading-snug">
            Continue to {SITE_NAME}
          </h1>
          <p className="mt-2 text-sm text-kal-muted">
            {step === "email"
              ? isNativeApp
                ? "Enter your email to receive a sign-in code."
                : "Sign in with Google, or use a one-time email code."
              : `We sent a 6-digit code to ${trimmedEmail}.`}
          </p>
        </div>
      </div>

      <div className="kal-glass-panel w-full max-w-sm rounded-2xl p-1">
        {!isNativeApp && step === "email" && (
          <>
            <div className="space-y-3 px-3 pt-4">
              <DpdpConsentNotice agreed={dpdpAgreed} onAgreedChange={setDpdpAgreed} />
              <label
                htmlFor="auth-age-confirm"
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-kal-border/80 bg-kal-input-bg/60 p-2.5 text-xs text-kal-text"
              >
                <input
                  id="auth-age-confirm"
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 rounded border-kal-border accent-kal-accent"
                />
                <span>I confirm I am 18 years of age or older.</span>
              </label>
            </div>
            <div className="px-3 pt-2">
              <GoogleSignInButton
                busy={busy}
                disabled={busy || !signupChecksOk}
                onClick={() => void signInGoogle()}
              />
              <p className="mt-2 text-center text-[11px] text-kal-muted">
                Fastest way to get started
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="text-center text-[11px] text-kal-muted">or use email</p>
            </div>
          </>
        )}
        {step === "email" ? (
          <form
            className={clsx("space-y-4 px-3 pb-4", isNativeApp ? "pt-4" : "pt-2")}
            onSubmit={(e) => {
              e.preventDefault();
              void sendOtp();
            }}
          >
            {storedReferral?.ref && (
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

            {isNativeApp && (
              <div className="space-y-3">
                <DpdpConsentNotice agreed={dpdpAgreed} onAgreedChange={setDpdpAgreed} />
                <label
                  htmlFor="auth-age-confirm-native"
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-kal-border/80 bg-kal-input-bg/60 p-2.5 text-xs text-kal-text"
                >
                  <input
                    id="auth-age-confirm-native"
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 rounded border-kal-border accent-kal-accent"
                  />
                  <span>I confirm I am 18 years of age or older.</span>
                </label>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-sm text-kal-danger-text">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !signupChecksOk}
              className="kal-glass-subtle flex w-full min-h-[50px] items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-kal-text transition-colors duration-200 hover:opacity-95 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Mail className="size-4" />}
              Continue with email
            </button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form
            className="space-y-4 px-3 pb-4 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void verifyOtp();
            }}
          >
            <div>
              <label
                htmlFor="auth-otp"
                className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary"
              >
                <KeyRound className="size-3.5" />
                Sign-in code
              </label>
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-4 py-3 text-center text-lg tracking-[0.3em] text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                placeholder="000000"
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
              {busy ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-4" />}
              Continue
            </button>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={busy || resendCooldown > 0}
                onClick={() => void sendOtp()}
                className={clsx(
                  "text-sm font-medium transition-colors",
                  resendCooldown > 0
                    ? "text-kal-muted"
                    : "text-kal-accent hover:underline",
                )}
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                className="flex items-center justify-center gap-2 text-sm text-kal-muted transition-colors hover:text-kal-text-secondary disabled:opacity-50"
              >
                <ArrowLeft className="size-4" />
                Use a different email
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <p className="max-w-sm text-center text-[11px] text-kal-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline-offset-2 hover:text-kal-accent hover:underline">
          terms and conditions
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline-offset-2 hover:text-kal-accent hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
