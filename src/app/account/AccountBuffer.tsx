"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { KalSpinner } from "@/components/loading/KalSpinner";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAuthStore } from "@/store/useAuthStore";

export function AccountBuffer() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  const {
    loading: subscriptionLoading,
    welcomeTrialExpiredNoPay,
    hasPaidAccess,
    fetchError,
    refetch,
  } = useSubscriptionAccess();

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string } | undefined;
    const fromMeta =
      typeof meta?.full_name === "string" && meta.full_name.trim()
        ? meta.full_name.trim()
        : null;
    return fromMeta ?? user?.email ?? null;
  }, [user]);

  const statusLabel = useMemo(() => {
    if (subscriptionLoading && user) return "Loading…";
    if (hasPaidAccess) return "Active Plan";
    if (welcomeTrialExpiredNoPay) return "Trial ended — upgrade required";
    return "Trial";
  }, [hasPaidAccess, subscriptionLoading, user, welcomeTrialExpiredNoPay]);

  if (!initialized) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-kal-page px-6 py-16">
        <KalSpinner size="lg" message="Loading…" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 bg-kal-page px-6 py-16">
        <div className="kal-card-surface space-y-4 p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-kal-text">Account</h1>
          <p className="text-sm leading-relaxed text-kal-muted">
            Sign in to manage your account and billing.
          </p>
          <Link
            href="/auth"
            className="kal-btn-accent inline-flex min-h-[48px] w-full items-center justify-center"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 bg-kal-page px-6 py-16 pb-[max(4rem,env(safe-area-inset-bottom))]">
      <header className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-semibold text-kal-text">Account</h1>
        <p className="text-sm text-kal-muted">Manage your Kalnehi Preparation OS access.</p>
      </header>

      <div className="kal-card-surface space-y-6 p-8">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-kal-muted">Signed in as</p>
          <p className="text-base font-medium text-kal-text">{displayName ?? "—"}</p>
        </div>

        <div className="space-y-1 border-t border-kal-border pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-kal-muted">Current status</p>
          <p className="text-base text-kal-text">
            Status: <span className="font-semibold">{statusLabel}</span>
          </p>
          {fetchError ? (
            <p className="text-xs text-kal-muted">
              Could not refresh subscription details.{" "}
              <button
                type="button"
                className="font-semibold text-kal-accent underline"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-kal-border pt-6">
          {hasPaidAccess ? (
            <p className="text-sm text-kal-muted">
              Your plan is active.{" "}
              <Link href="/my-subscription" className="font-semibold text-kal-accent underline">
                Manage billing
              </Link>
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/upgrade")}
                className="kal-btn-accent inline-flex min-h-[48px] w-full items-center justify-center"
              >
                Activate Plan
              </button>
              <p className="text-center text-xs text-kal-muted">
                Billing opens on the next screen after you continue.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
