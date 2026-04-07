import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type StudyCameraFacing = "user" | "environment";

export type StudyDetectionSensitivity = "strict" | "balanced" | "lenient";

export type AppearanceMode = "light" | "dark" | "system";

type SettingsState = {
  /** UI theme; light is default. `system` follows OS preference. */
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
  setAppearance: (v: AppearanceMode) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: "light",
      purposeModeEnabled: false,
      showCountdown: true,
      advancedMarksProjectionEnabled: true,
      soundEffects: true,
      dailyReminders: false,
      studyCameraEnabled: false,
      studyCameraFacing: "user",
      studyCameraAutoStart: true,
      studyCameraPrivacyAcknowledged: false,
      studyDetectionSensitivity: "balanced",

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
      setAppearance: (appearance) => set({ appearance }),
    }),
    {
      name: "kalnehi-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
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
      }),
    },
  ),
);
