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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: "light",
      purposeModeEnabled: true,
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
        studyCameraVisionVerify: s.studyCameraVisionVerify,
        studyCameraVerifyIntervalMin: s.studyCameraVerifyIntervalMin,
      }),
    },
  ),
);
