"use client";

import clsx from "clsx";
import { Camera, X } from "lucide-react";
import { useId, useState } from "react";

import { SettingsExpandableSection } from "@/components/settings/SettingsExpandableSection";
import { StudyCameraPrivacyModal } from "@/components/study/StudyCameraPrivacyModal";
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

export function CameraPlannerSettings() {
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
  const studyCameraVisionVerify = useSettingsStore(
    (s) => s.studyCameraVisionVerify ?? true,
  );
  const setStudyCameraVisionVerify = useSettingsStore(
    (s) => s.setStudyCameraVisionVerify,
  );
  const studyCameraVerifyIntervalMin = useSettingsStore(
    (s) => s.studyCameraVerifyIntervalMin ?? 3,
  );
  const setStudyCameraVerifyIntervalMin = useSettingsStore(
    (s) => s.setStudyCameraVerifyIntervalMin,
  );

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [aiNoticeVisible, setAiNoticeVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("kal_ai_study_notice_dismissed") !== "1";
  });

  function dismissAiNotice() {
    setAiNoticeVisible(false);
    try {
      localStorage.setItem("kal_ai_study_notice_dismissed", "1");
    } catch {
      /* ignore */
    }
  }

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
      <SettingsExpandableSection
        sectionId="camera-planner"
        title="On-camera study sessions"
        description="On-device pose detection, optional cloud spot-checks, and your privacy choice."
        icon={Camera}
      >
        <div className="kal-glass-panel divide-y divide-white/15 rounded-[1rem] px-1 dark:divide-white/10">
          <div className="px-3 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[15px] font-medium text-kal-text">
                  Enable on-camera verification
                </span>
                <p className="mt-2 text-xs leading-relaxed text-kal-text-secondary">
                  <strong>On-device:</strong> MediaPipe runs in your browser for live
                  pose/face/hands. <strong>Optional:</strong> you can turn on cloud
                  study checks (below) so a single still frame is sent to Google Gemini
                  on a schedule—no video is stored on our servers.
                </p>
              </div>
              <SheetSwitch
                checked={studyCameraEnabled}
                onChange={onStudyCameraSwitchRequest}
                id={`${baseId}-sc`}
              />
            </div>
          </div>
          {studyCameraEnabled ? (
            <>
              <div className="flex flex-col gap-2 px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="px-3 py-3.5">
                <span className="text-[15px] font-medium text-kal-text">
                  Detection sensitivity
                </span>
                <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                  Stricter needs clearer head-down + stable pose; Lenient is easier
                  to trigger while still on-device only.
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
              {aiNoticeVisible ? (
                <div className="mx-3 my-2 flex items-start gap-3 rounded-xl border border-kal-border bg-kal-card-muted px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-kal-text-secondary">
                      AI Study Verification
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-kal-muted">
                      To ensure accurate focus tracking, we analyze a single webcam frame every
                      3.5 minutes using AI. This helps verify that you are actively studying
                      (reading, writing, or focused on study material).
                    </p>
                    <p className="mt-1.5 text-xs font-medium text-kal-text-secondary">
                      No images are stored or retained at any time.
                    </p>
                    <button
                      type="button"
                      onClick={dismissAiNotice}
                      className="mt-2.5 rounded-lg border border-kal-border bg-kal-card px-3 py-1.5 text-xs font-semibold text-kal-text-secondary hover:bg-kal-card-muted"
                    >
                      Got it
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={dismissAiNotice}
                    aria-label="Dismiss notice"
                    className="mt-0.5 shrink-0 rounded-md p-1 text-kal-muted hover:bg-kal-card hover:text-kal-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              <div className="px-3 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[15px] font-medium text-kal-text">
                      AI study spot-checks (Google Gemini)
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-kal-text-secondary">
                      {studyCameraVerifyIntervalMin === 2
                        ? "Every 2 minutes, "
                        : studyCameraVerifyIntervalMin === 5
                          ? "Every 5 minutes, "
                          : "Every 3 minutes, "}
                      a single frame is sent to Google Gemini to verify you&apos;re
                      actually studying. No frames are stored by Kalnehi. The first
                      check runs about 90 seconds after your timer starts. Disable to
                      use on-device detection only.
                    </p>
                  </div>
                  <SheetSwitch
                    checked={studyCameraVisionVerify}
                    onChange={setStudyCameraVisionVerify}
                    id={`${baseId}-vision`}
                  />
                </div>
                {studyCameraVisionVerify ? (
                  <div className="mt-3">
                    <label
                      htmlFor={`${baseId}-iv`}
                      className="text-xs font-medium text-kal-text-secondary"
                    >
                      Check frequency
                    </label>
                    <select
                      id={`${baseId}-iv`}
                      value={String(studyCameraVerifyIntervalMin)}
                      onChange={(e) => {
                        const n = Number(e.target.value) as 2 | 3 | 5;
                        if (n === 2 || n === 3 || n === 5) {
                          setStudyCameraVerifyIntervalMin(n);
                        }
                      }}
                      className="mt-1.5 min-h-[44px] w-full max-w-xs rounded-lg border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text sm:w-auto"
                    >
                      <option value="2">Every 2 min</option>
                      <option value="3">Every 3 min (default)</option>
                      <option value="5">Every 5 min</option>
                    </select>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </SettingsExpandableSection>
    </>
  );
}
// Vercel force rebuild - 10 April 2026