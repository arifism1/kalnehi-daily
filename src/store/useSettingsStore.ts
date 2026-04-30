import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { storageAdapter } from "@/lib/storage";

export type StudyCameraFacing = "user" | "environment";

export type StudyDetectionSensitivity = "strict" | "balanced" | "lenient";

export type AppearanceMode = "light" | "dark" | "system";

export type SettingsState = {
  /** UI theme: Orange, Coffee, or follow OS / browser `prefers-color-scheme`. */
  appearance: AppearanceMode;
  purposeModeEnabled: boolean;
  showCountdown: boolean;
  /** When true, home/progress show projected marks from syllabus weights; when false, % only. */
  advancedMarksProjectionEnabled: boolean;
  soundEffects: boolean;
  dailyReminders: boolean;
  /** Study Camera page + detection (on-device). */
  studyCameraEnabled: boolean;
  studyCameraFacing: StudyCameraFacing;
  /** When true, a sustained “studying” signal starts the session timer automatically. */
  studyCameraAutoStart: boolean;
  /** User saw and accepted the study camera privacy notice (one-time). */
  studyCameraPrivacyAcknowledged: boolean;
  /** Study detection thresholds (face + pose + hands). */
  studyDetectionSensitivity: StudyDetectionSensitivity;
  /** When true, periodic single frames are sent to Google Gemini to verify real studying. */
  studyCameraVisionVerify: boolean;
  /** Interval between vision checks in minutes (2, 3, or 5). */
  studyCameraVerifyIntervalMin: 2 | 3 | 5;
  setPurposeModeEnabled: (v: boolean) => void;
  setShowCountdown: (v: boolean) => void;
  setAdvancedMarksProjectionEnabled: (v: boolean) => void;
  setSoundEffects: (v: boolean) => void;
  setDailyReminders: (v: boolean) => void;
  setStudyCameraEnabled: (v: boolean) => void;
  setStudyCameraFacing: (v: StudyCameraFacing) => void;
  setStudyCameraAutoStart: (v: boolean) => void;
  setStudyCameraPrivacyAcknowledged: (v: boolean) => void;
  setStudyDetectionSensitivity: (v: StudyDetectionSensitivity) => void;
  setStudyCameraVisionVerify: (v: boolean) => void;
  setStudyCameraVerifyIntervalMin: (v: 2 | 3 | 5) => void;
  setAppearance: (v: AppearanceMode) => void;
};

/** Keys persisted locally and mirrored to `user_profiles.ui_prefs` when signed in. */
export type UiPrefsPersisted = {
  appearance: AppearanceMode;
  purposeModeEnabled: boolean;
  showCountdown: boolean;
  advancedMarksProjectionEnabled: boolean;
  soundEffects: boolean;
  dailyReminders: boolean;
  studyCameraEnabled: boolean;
  studyCameraFacing: StudyCameraFacing;
  studyCameraAutoStart: boolean;
  studyCameraPrivacyAcknowledged: boolean;
  studyDetectionSensitivity: StudyDetectionSensitivity;
  studyCameraVisionVerify: boolean;
  studyCameraVerifyIntervalMin: 2 | 3 | 5;
};

export function pickUiPrefsForSync(s: SettingsState): UiPrefsPersisted {
  return {
    appearance: s.appearance,
    purposeModeEnabled: s.purposeModeEnabled,
    showCountdown: s.showCountdown,
    advancedMarksProjectionEnabled: s.advancedMarksProjectionEnabled,
    soundEffects: s.soundEffects,
    dailyReminders: s.dailyReminders,
    studyCameraEnabled: s.studyCameraEnabled,
    studyCameraFacing: s.studyCameraFacing,
    studyCameraAutoStart: s.studyCameraAutoStart,
    studyCameraPrivacyAcknowledged: s.studyCameraPrivacyAcknowledged,
    studyDetectionSensitivity: s.studyDetectionSensitivity,
    studyCameraVisionVerify: s.studyCameraVisionVerify,
    studyCameraVerifyIntervalMin: s.studyCameraVerifyIntervalMin,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: "system",
      purposeModeEnabled: false,
      showCountdown: true,
      advancedMarksProjectionEnabled: true,
      soundEffects: true,
      dailyReminders: false,
      studyCameraEnabled: true,
      studyCameraFacing: "user",
      studyCameraAutoStart: true,
      studyCameraPrivacyAcknowledged: false,
      studyDetectionSensitivity: "balanced",
      studyCameraVisionVerify: true,
      studyCameraVerifyIntervalMin: 3 as 2 | 3 | 5,

      setPurposeModeEnabled: (purposeModeEnabled) =>
        set({ purposeModeEnabled }),
      setShowCountdown: (showCountdown) => set({ showCountdown }),
      setAdvancedMarksProjectionEnabled: (advancedMarksProjectionEnabled) =>
        set({ advancedMarksProjectionEnabled }),
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      setDailyReminders: (dailyReminders) => set({ dailyReminders }),
      setStudyCameraEnabled: (studyCameraEnabled) => set({ studyCameraEnabled }),
      setStudyCameraFacing: (studyCameraFacing) => set({ studyCameraFacing }),
      setStudyCameraAutoStart: (studyCameraAutoStart) =>
        set({ studyCameraAutoStart }),
      setStudyCameraPrivacyAcknowledged: (studyCameraPrivacyAcknowledged) =>
        set({ studyCameraPrivacyAcknowledged }),
      setStudyDetectionSensitivity: (studyDetectionSensitivity) =>
        set({ studyDetectionSensitivity }),
      setStudyCameraVisionVerify: (studyCameraVisionVerify) =>
        set({ studyCameraVisionVerify }),
      setStudyCameraVerifyIntervalMin: (studyCameraVerifyIntervalMin) =>
        set({ studyCameraVerifyIntervalMin }),
      setAppearance: (appearance) => set({ appearance }),
    }),
    {
      name: "kalnehi-settings",
      version: 3,
      migrate: (persisted: unknown, storedVersion: number) => {
        const s = persisted as Record<string, unknown>;
        delete s.wakeWordEnabled;
        if (storedVersion < 3) {
          const a = s.appearance;
          if (a !== "light" && a !== "dark" && a !== "system") {
            s.appearance = "system";
          }
        }
        return s as unknown;
      },
      storage: createJSONStorage(() => storageAdapter),
      partialize: (s) => pickUiPrefsForSync(s),
    },
  ),
);
