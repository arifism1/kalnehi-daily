"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type PositionData = {
  position: number;
  batchNumber: number;
  opensAt: string | null;
  aheadCount: number;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type RazorpayOrderResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

/** Format seconds into HH:MM:SS */
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Wait threshold: ≤5 days = short, 5-30 = medium, >30 = long */
function getWaitState(opensAt: string | null): "short" | "medium" | "long" {
  if (!opensAt) return "medium";
  const diffDays = (new Date(opensAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 5) return "short";
  if (diffDays <= 30) return "medium";
  return "long";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: true,
  }).toUpperCase();
}

export function WaitlistPositionClient() {
  const [data, setData] = useState<PositionData | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [skipBusy, setSkipBusy] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [skipDone, setSkipDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load position data from sessionStorage.
  useEffect(() => {
    const raw = sessionStorage.getItem("wl_position");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PositionData;
        setData(parsed);

        if (parsed.opensAt) {
          const remaining = Math.max(0, Math.floor((new Date(parsed.opensAt).getTime() - Date.now()) / 1000));
          setCountdown(remaining);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Countdown ticker.
  useEffect(() => {
    if (countdown <= 0) return;
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countdown]);

  const handleSkip = useCallback(async () => {
    if (!window.Razorpay) return;
    setSkipBusy(true);
    setSkipError(null);

    try {
      const res = await fetch("/api/waitlist/skip", { method: "POST" });
      const orderData = await res.json() as {
        ok: boolean; error?: string; keyId?: string; orderId?: string;
        amountPaise?: number; prefill?: Record<string, string>;
      };

      if (!orderData.ok) {
        setSkipError(orderData.error ?? "Payment setup failed.");
        setSkipBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        order_id: orderData.orderId,
        amount: orderData.amountPaise,
        currency: "INR",
        name: "Kalnehi Daily",
        description: "Skip the waitlist — ₹19",
        prefill: orderData.prefill ?? {},
        handler: async (response: RazorpayOrderResponse) => {
          setSkipBusy(true);
          const verifyRes = await fetch("/api/waitlist/skip/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json() as { ok: boolean; error?: string };
          if (!verifyData.ok) {
            setSkipError(verifyData.error ?? "Verification failed.");
            setSkipBusy(false);
            return;
          }
          setSkipDone(true);
          setSkipBusy(false);
          // Redirect to app after short delay.
          setTimeout(() => { window.location.href = "/"; }, 1500);
        },
        modal: { ondismiss: () => setSkipBusy(false) },
      });
      rzp.open();
    } catch {
      setSkipError("Something went wrong. Please try again.");
      setSkipBusy(false);
    }
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold text-kal-text">No waitlist position found.</p>
          <p className="mt-2 text-sm text-kal-text-secondary">
            Please <a href="/waitlist" className="text-kal-accent underline">join the waitlist</a> first.
          </p>
        </div>
      </div>
    );
  }

  const waitState = getWaitState(data.opensAt);
  const accessDate = formatDate(data.opensAt);
  const accessTime = formatTime(data.opensAt);
  const countdownStr = formatCountdown(countdown);
  const aheadCount = Math.max(0, data.aheadCount);

  if (skipDone) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p
            className="text-4xl font-normal text-kal-accent"
            style={{ fontFamily: "var(--font-display)" }}
          >
            You&apos;re in.
          </p>
          <p className="mt-3 text-lg text-kal-text">Redirecting to Kalnehi…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-screen bg-kal-page">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">

          {/* Header */}
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-kal-muted">
            Kalnehi Daily · Batch {data.batchNumber}
          </p>
          <p className="text-base font-medium text-kal-text">Your spot is locked.</p>

          {/* Position number */}
          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-kal-muted">
              Your position
            </p>
            <p
              className="mt-1 text-7xl font-normal tabular-nums text-kal-text sm:text-8xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              #{data.position.toLocaleString("en-IN")}
            </p>
            {aheadCount > 0 && (
              <p className="mt-2 text-base text-kal-text-secondary">
                {aheadCount.toLocaleString("en-IN")} students ahead of you
              </p>
            )}
          </div>

          {/* Access date */}
          {data.opensAt && (
            <div className="mt-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-kal-muted">
                Access opens
              </p>
              <p
                className="mt-2 text-4xl font-normal text-kal-accent sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {accessDate}
              </p>
              {accessTime && (
                <p className="mt-1 text-lg font-medium text-kal-text-secondary">
                  at {accessTime} IST
                </p>
              )}

              {/* Countdown */}
              {countdown > 0 && (
                <div className="mt-6">
                  <p
                    className="font-mono text-3xl font-bold tabular-nums tracking-wider text-kal-text sm:text-4xl"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    aria-live="polite"
                    aria-label={`Countdown: ${countdownStr}`}
                  >
                    {countdownStr}
                  </p>
                  <p className="mt-1 text-xs text-kal-muted">HH : MM : SS</p>
                </div>
              )}
              {countdown === 0 && data.opensAt && new Date(data.opensAt) < new Date() && (
                <p className="mt-4 text-base font-semibold text-emerald-500">
                  Your batch is now open — check your email!
                </p>
              )}
            </div>
          )}

          {/* CTA section — hierarchy changes with wait state */}
          <div className="mt-12 space-y-4">

            {waitState === "short" && (
              <>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ You&apos;re in — your spot is safe.
                  </p>
                </div>
                <p className="text-xs text-kal-muted">
                  Don&apos;t want to wait?{" "}
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={skipBusy}
                    className="font-semibold text-kal-accent hover:underline disabled:opacity-50"
                  >
                    {skipBusy ? "Processing…" : "₹19 gets you in right now →"}
                  </button>
                </p>
              </>
            )}

            {waitState === "medium" && (
              <>
                <div className="rounded-xl border border-kal-border bg-kal-card/50 px-4 py-3">
                  <p className="text-sm font-semibold text-kal-text">
                    ✓ You&apos;re in line — your spot is safe.
                  </p>
                </div>
                <p className="text-sm text-kal-muted">
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={skipBusy}
                    className="font-semibold text-kal-accent hover:underline disabled:opacity-50"
                  >
                    {skipBusy ? "Processing…" : "Skip the queue for ₹19 →"}
                  </button>
                </p>
              </>
            )}

            {waitState === "long" && (
              <>
                {skipError && <p className="text-sm text-red-500">{skipError}</p>}
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={skipBusy}
                  className="w-full min-h-[52px] rounded-full bg-kal-accent px-6 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.32)] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                >
                  {skipBusy ? "Processing…" : "Skip the queue for ₹19 →"}
                </button>
                <p className="text-sm text-kal-muted">
                  Or wait — your spot is safe.{" "}
                  {accessDate && <span>Access opens {accessDate}.</span>}
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-16 space-y-2 border-t border-kal-border pt-8">
            <p className="text-sm text-kal-muted">Your data is ready when you are.</p>
            <p className="text-xs text-kal-muted/70">
              We&apos;ll send you a push + email the day before Batch {data.batchNumber} opens.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
