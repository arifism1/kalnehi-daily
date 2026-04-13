"use client";

import Link from "next/link";
import { Camera, Lock, Mic } from "lucide-react";

import { useAiGate } from "@/hooks/useAiGate";

type Props = {
  feature: "photo_scan" | "voice";
  children: React.ReactNode;
};

export function AiFeatureGate({ feature, children }: Props) {
  const {
    loading,
    hasAiAccess,
    isBasicTrial,
    canDoPhotoScan,
    canDoVoiceSession,
    photoScanStatus,
    voiceMinuteStatus,
    photoScansRemaining,
    voiceMinutesRemaining,
  } = useAiGate();

  if (loading) return <>{children}</>;

  if (!hasAiAccess) {
    return (
      <div className="kal-glass-panel flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
        <Lock className="h-8 w-8 text-kal-text-secondary" />
        <h3 className="text-lg font-bold text-kal-text">
          {feature === "photo_scan"
            ? "Photo Scanner is a Pro feature"
            : "Voice Dictation is a Pro feature"}
        </h3>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          Upgrade to Pro or Pro Max to unlock AI-powered features like voice
          planning and handwritten scanner.
        </p>
        <Link
          href="/pricing"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-6 py-2.5 text-sm font-bold text-kal-accent-foreground"
        >
          View Plans
        </Link>
      </div>
    );
  }

  const isPhoto = feature === "photo_scan";
  const atLimit = isPhoto ? !canDoPhotoScan : !canDoVoiceSession;

  if (atLimit) {
    if (isBasicTrial) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
          {isPhoto ? (
            <Camera className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          ) : (
            <Mic className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          )}
          <h3 className="text-lg font-bold text-kal-text">Trial gift used</h3>
          <p className="max-w-sm text-sm text-kal-text-secondary">
            You&apos;ve used your trial bonus{" "}
            {isPhoto ? "(3 photo scans)" : "(2 voice minutes)"}. Upgrade to Pro
            to get{" "}
            {isPhoto
              ? "20 scans per month"
              : "40 voice minutes per month"}{" "}
            and full AI access.
          </p>
          <Link
            href="/pricing"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-6 py-2.5 text-sm font-bold text-kal-accent-foreground"
          >
            Upgrade to Pro
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
        {isPhoto ? (
          <Camera className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        ) : (
          <Mic className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        )}
        <h3 className="text-lg font-bold text-kal-text">
          Monthly limit reached
        </h3>
        <p className="max-w-sm text-sm text-kal-text-secondary">
          {isPhoto ? photoScanStatus : voiceMinuteStatus}. Buy extra credits or
          upgrade your plan for higher limits.
        </p>
        <div className="flex gap-3">
          <Link
            href="/pricing"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-5 py-2.5 text-sm font-bold text-kal-accent-foreground"
          >
            Upgrade Plan
          </Link>
          <Link
            href="/my-plan"
            className="kal-glass-subtle inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-kal-text"
          >
            Buy Credits
          </Link>
        </div>
      </div>
    );
  }

  const remaining = isPhoto ? photoScansRemaining : voiceMinutesRemaining;
  const statusText = isPhoto ? photoScanStatus : voiceMinuteStatus;

  return (
    <>
      <div className="kal-glass-subtle mb-2 flex min-h-0 items-center justify-between rounded-lg px-3 py-1.5">
        <span className="flex items-center gap-2 text-xs text-kal-text-secondary">
          {isPhoto ? (
            <Camera className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          {statusText}
        </span>
        {remaining <= 3 && (
          <Link
            href="/my-plan"
            className="text-xs font-semibold text-kal-accent hover:underline"
          >
            Buy more
          </Link>
        )}
      </div>
      {children}
    </>
  );
}
