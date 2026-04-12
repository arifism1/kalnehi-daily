"use client";

import clsx from "clsx";
import { useId, useState } from "react";

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
      <div className="kal-glass-panel divide-y divide-white/15 rounded-[1rem] px-1 dark:divide-white/10">
        <div className="px-3 py-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
            Camera &amp; planner
          </p>
          <p className="mt-1 text-xs text-kal-text-secondary">
            Study camera runs on-device only. No video is uploaded or streamed.
          </p>
        </div>
        <div className="px-3 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[15px] font-medium text-kal-text">
                Enable Study Camera
              </span>
              <p className="mt-2 text-xs leading-relaxed text-kal-text-secondary">
                Video is processed only on your phone or computer. No data is
                streamed, uploaded, or shared. Completely private and safe—AI runs
                on-device (MediaPipe); nothing is sent to our servers.
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
                  For camera-proven study sessions. Your choice is remembered.
                </p>
              </div>
              <select
                value={studyCameraFacing}
                onChange={(e) =>
                  setStudyCameraFacing(e.target.value as StudyCameraFacing)
                }
                className="min-h-[44px] rounded-lg border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text"
                aria-label="Default camera for study sessions"
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
          </>
        ) : null}
      </div>
    </>
  );
}
// Vercel force rebuild - 10 April 2026