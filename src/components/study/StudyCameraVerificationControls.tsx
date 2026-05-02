"use client";

import clsx from "clsx";
import { Camera } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { StudyCameraPrivacyModal } from "@/components/study/StudyCameraPrivacyModal";
import { isAiStudyPartnerUiEnabled } from "@/lib/aiStudyPartnerUi";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useSettingsStore,
  type StudyCameraFacing,
  type StudyDetectionSensitivity,
} from "@/store/useSettingsStore";

function SheetSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-9 w-14 shrink-0 rounded-full transition-[background-color] duration-200",
        checked ? "bg-kal-accent" : "bg-kal-border",
      )}
    >
      <span
        className={clsx(
          "absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[1.35rem]" : "translate-x-0",
        )}
      />
    </button>
  );
}

/**
 * Verification toggle + default camera + detection sensitivity — lives on the
 * On-camera Study Sessions page (also removed from Settings for less clutter).
 */
export function StudyCameraVerificationControls({ className }: { className?: string }) {
  const baseId = useId();
  const studyCameraEnabled = useSettingsStore((s) => s.studyCameraEnabled);
  const setStudyCameraEnabled = useSettingsStore((s) => s.setStudyCameraEnabled);
  const studyCameraPrivacyAcknowledged = useSettingsStore(
    (s) => s.studyCameraPrivacyAcknowledged,
  );
  const setStudyCameraPrivacyAcknowledged = useSettingsStore(
    (s) => s.setStudyCameraPrivacyAcknowledged,
  );
  const studyCameraFacing = useSettingsStore((s) => s.studyCameraFacing);
  const setStudyCameraFacing = useSettingsStore((s) => s.setStudyCameraFacing);
  const studyDetectionSensitivity = useSettingsStore(
    (s) => s.studyDetectionSensitivity,
  );
  const setStudyDetectionSensitivity = useSettingsStore(
    (s) => s.setStudyDetectionSensitivity,
  );

  const userId = useAuthStore((s) => s.user?.id);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  function onStudyCameraSwitchRequest(next: boolean) {
    if (next) {
      if (!studyCameraPrivacyAcknowledged) {
        setPrivacyOpen(true);
        return;
      }
      setStudyCameraEnabled(true);
    } else {
      setStudyCameraEnabled(false);
    }
  }

  function onPrivacyContinue() {
    setStudyCameraPrivacyAcknowledged(true);
    setStudyCameraEnabled(true);
    setPrivacyOpen(false);
  }

  function onPrivacyDismiss() {
    setPrivacyOpen(false);
  }

  return (
    <>
      <StudyCameraPrivacyModal
        open={privacyOpen}
        variant="settings"
        onContinue={onPrivacyContinue}
        onDismiss={onPrivacyDismiss}
      />
      <section
        id="study-camera-setup"
        aria-labelledby="study-camera-setup-heading"
        className={clsx(
          "scroll-mt-24 overflow-hidden rounded-2xl border border-kal-border bg-kal-card/80 kal-shadow-card",
          className,
        )}
      >
        <div className="border-b border-kal-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15 text-kal-accent">
              <Camera className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                Setup
              </p>
              <h2 id="study-camera-setup-heading" className="kal-feature-title mt-0.5 text-lg">
                Verification &amp; camera
              </h2>
              <p className="mt-0.5 text-xs text-kal-text-secondary">
                On-device detection and your default webcam for timed sessions here.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/15 dark:divide-white/10">
          <div className="px-4 py-4 sm:px-5">
            {!userId ? (
              <p className="text-sm text-kal-muted">
                Sign in to turn on-camera verification on.
              </p>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[15px] font-medium text-kal-text">
                    Enable on-camera verification
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-kal-text-secondary">
                    <strong>On-device:</strong> MediaPipe runs in your browser for live
                    pose/face/hands. <strong>Cloud:</strong> while a session runs, periodic
                    still frames verify you&apos;re studying (Google Gemini) — combined with on-device cues. No video is stored on our servers.
                  </p>
                </div>
                <SheetSwitch
                  checked={studyCameraEnabled}
                  onChange={onStudyCameraSwitchRequest}
                  id={`${baseId}-sc`}
                />
              </div>
            )}
          </div>

          {userId && studyCameraEnabled ? (
            <>
              <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <span className="text-[15px] font-medium text-kal-text">
                    Default camera
                  </span>
                  <p className="mt-0.5 text-xs text-kal-text-secondary">
                    For on-camera study sessions. Your choice is remembered.
                  </p>
                </div>
                <select
                  value={studyCameraFacing}
                  onChange={(e) =>
                    setStudyCameraFacing(e.target.value as StudyCameraFacing)
                  }
                  className="min-h-[44px] rounded-lg border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text"
                  aria-label="Default camera for on-camera study sessions"
                >
                  <option value="user">Front (selfie)</option>
                  <option value="environment">Back</option>
                </select>
              </div>
              <div className="px-4 py-4 sm:px-5">
                <span className="text-[15px] font-medium text-kal-text">
                  Detection sensitivity
                </span>
                <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                  Stricter needs clearer head-down + stable pose; Lenient is easier to
                  trigger while still on-device only.
                </p>
                <select
                  value={studyDetectionSensitivity}
                  onChange={(e) =>
                    setStudyDetectionSensitivity(
                      e.target.value as StudyDetectionSensitivity,
                    )
                  }
                  className="mt-3 min-h-[44px] w-full max-w-xs rounded-lg border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text sm:w-auto"
                  aria-label="Study detection sensitivity"
                >
                  <option value="strict">Strict</option>
                  <option value="balanced">Balanced</option>
                  <option value="lenient">Lenient</option>
                </select>
              </div>
            </>
          ) : null}
        </div>
        {isAiStudyPartnerUiEnabled && (
          <div className="border-t border-kal-border bg-kal-card-muted/50 px-4 py-3 sm:px-5">
            <p className="text-[11px] leading-relaxed text-kal-text-secondary">
              AI Study Partner pooled time &amp; extra hours:&nbsp;
              <Link
                href="/my-subscription#ai-study-partner"
                className="font-semibold text-kal-accent underline underline-offset-2"
              >
                My Subscription
              </Link>
            </p>
          </div>
        )}
      </section>
    </>
  );
}
