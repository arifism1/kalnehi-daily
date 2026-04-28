"use client";

import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getAiStudyPartnerBalance } from "@/actions/aiStudyPartner";
import { StudyCameraPrivacyModal } from "@/components/study/StudyCameraPrivacyModal";
import { StudyCameraTracker } from "@/components/study/StudyCameraTracker";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type Step = "subject" | "camera";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddStudySessionSheet({ open, onClose }: Props) {
  const userId = useAuthStore((s) => s.user?.id);
  const studyCameraEnabled = useSettingsStore((s) => s.studyCameraEnabled);
  const studyCameraPrivacyAcknowledged = useSettingsStore(
    (s) => s.studyCameraPrivacyAcknowledged,
  );
  const setStudyCameraPrivacyAcknowledged = useSettingsStore(
    (s) => s.setStudyCameraPrivacyAcknowledged,
  );

  const [step, setStep] = useState<Step>("subject");
  const [subject, setSubject] = useState("");
  const [privacyGateOpen, setPrivacyGateOpen] = useState(false);
  const [needsPartnerTime, setNeedsPartnerTime] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("subject");
      setSubject("");
      setPrivacyGateOpen(false);
      setNeedsPartnerTime(false);
      setIsCheckingBalance(false);
    }
  }, [open]);

  /** Routes to camera when pooled AI Study Partner time &gt; 0; otherwise surface link to subscribe. */
  const doStart = useCallback(async () => {
    setIsCheckingBalance(true);
    setNeedsPartnerTime(false);
    try {
      const bal = await getAiStudyPartnerBalance();
      if (bal > 0) {
        setStep("camera");
      } else {
        setNeedsPartnerTime(true);
      }
    } catch {
      setNeedsPartnerTime(true);
    } finally {
      setIsCheckingBalance(false);
    }
  }, []);

  const advanceToCamera = useCallback(() => {
    if (!studyCameraPrivacyAcknowledged) {
      setPrivacyGateOpen(true);
      return;
    }
    void doStart();
  }, [studyCameraPrivacyAcknowledged, doStart]);

  const onPrivacyGateContinue = useCallback(() => {
    setStudyCameraPrivacyAcknowledged(true);
    setPrivacyGateOpen(false);
    void doStart();
  }, [setStudyCameraPrivacyAcknowledged, doStart]);

  const subjectOk = subject.trim().length > 0;

  if (!open) return null;

  if (!userId) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/65"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-kal-border bg-kal-card p-6 kal-shadow-card sm:rounded-2xl">
          <p className="text-sm text-kal-muted">Sign in to log study sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StudyCameraPrivacyModal
        open={privacyGateOpen}
        variant="session"
        onContinue={onPrivacyGateContinue}
        onDismiss={() => {
          setPrivacyGateOpen(false);
        }}
      />
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
        {step !== "camera" ? (
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/65"
            onClick={onClose}
          />
        ) : (
          <div className="absolute inset-0 bg-black/65" aria-hidden />
        )}
        <div
          className="relative z-10 flex min-h-0 w-full max-w-lg max-h-[min(92dvh,52rem)] flex-col overflow-hidden rounded-t-2xl border border-kal-border bg-kal-card kal-shadow-card sm:max-h-[min(90dvh,52rem)] sm:rounded-2xl"
          role="dialog"
          aria-modal="true"
        >
          {step === "camera" ? (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-kal-border px-5 py-4 sm:px-6">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                  Live verification
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-5 pt-3 sm:px-6 sm:pb-6 [-webkit-overflow-scrolling:touch]">
                <StudyCameraTracker
                  subject={subject}
                  userId={userId}
                  aiPartnerMode={true}
                  onDone={onClose}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-kal-border px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
                    Study session
                  </p>
                  <h2 className="kal-section-heading mt-0.5">
                    What are you studying?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 [-webkit-overflow-scrolling:touch]">
                <label className="block text-xs font-medium text-kal-muted">
                  Subject
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    placeholder="e.g. Organic Chemistry, Chapter 5"
                    className="mt-2 min-h-[52px] w-full rounded-2xl border border-kal-border bg-kal-input-bg px-4 text-base text-kal-text placeholder:text-kal-muted"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subjectOk) advanceToCamera();
                    }}
                  />
                </label>

                {!studyCameraEnabled ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-kal-border bg-kal-card-muted px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-kal-text">
                      Verification not enabled
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-kal-muted">
                      Turn on on-camera study sessions on{" "}
                      <Link
                        href="/study-sessions#study-camera-setup"
                        className="font-semibold text-kal-accent underline underline-offset-2"
                      >
                        Study Sessions
                      </Link>
                      . Video stays on your device only — never uploaded.
                    </p>
                  </div>
                ) : needsPartnerTime ? (
                  <div className="mt-4 rounded-2xl border border-amber-500/35 bg-amber-500/[0.07] px-4 py-4">
                    <p className="text-sm font-semibold text-kal-text">
                      No AI Study Partner time left
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-kal-muted">
                      Buy pooled hours first — credits are deducted only while you&apos;re in
                      session.
                    </p>
                    <Link
                      href="/my-subscription#ai-study-partner"
                      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                    >
                      Buy hours on My Subscription
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-kal-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
                {studyCameraEnabled ? (
                  <button
                    type="button"
                    disabled={!subjectOk || isCheckingBalance}
                    onClick={advanceToCamera}
                    className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent text-base font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover disabled:opacity-40"
                  >
                    {isCheckingBalance ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking balance…
                      </>
                    ) : (
                      "Continue to verification"
                    )}
                  </button>
                ) : (
                  <Link
                    href="/settings"
                    className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                  >
                    Open Settings
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
