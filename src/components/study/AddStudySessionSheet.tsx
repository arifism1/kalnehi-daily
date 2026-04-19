"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) {
      setStep("subject");
      setSubject("");
      setPrivacyGateOpen(false);
    }
  }, [open]);

  const enterCamera = useCallback(() => {
    if (!studyCameraPrivacyAcknowledged) {
      setPrivacyGateOpen(true);
      return;
    }
    setStep("camera");
  }, [studyCameraPrivacyAcknowledged]);

  const onPrivacyGateContinue = useCallback(() => {
    setStudyCameraPrivacyAcknowledged(true);
    setPrivacyGateOpen(false);
    setStep("camera");
  }, [setStudyCameraPrivacyAcknowledged]);

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
        onDismiss={() => setPrivacyGateOpen(false)}
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
          className="relative z-10 max-h-[min(92dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-kal-border bg-kal-card p-5 kal-shadow-card sm:max-h-[min(90vh,52rem)] sm:rounded-2xl sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {step === "camera" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
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
              <StudyCameraTracker
                subject={subject}
                userId={userId}
                onDone={onClose}
              />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-kal-border pb-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
                    Study session
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold text-kal-text">
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

              <div className="mt-5 space-y-4">
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
                      if (e.key === "Enter" && subjectOk) enterCamera();
                    }}
                  />
                </label>

                {studyCameraEnabled ? (
                  <button
                    type="button"
                    disabled={!subjectOk}
                    onClick={enterCamera}
                    className="flex w-full min-h-[52px] items-center justify-center rounded-2xl bg-kal-accent text-base font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover disabled:opacity-40"
                  >
                    Continue to verification
                  </button>
                ) : (
                  <div className="rounded-2xl border border-dashed border-kal-border bg-kal-card-muted px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-kal-text">
                      Verification not enabled
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-kal-muted">
                      Turn on on-camera study sessions in Settings to log with
                      on-device checks. Video stays on your device only — never
                      uploaded.
                    </p>
                    <Link
                      href="/settings"
                      className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                    >
                      Open Settings
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
