import {
  useSettingsStore,
  type AppearanceMode,
  type SettingsState,
  type StudyCameraFacing,
  type StudyDetectionSensitivity,
} from "@/store/useSettingsStore";

function isAppearance(v: unknown): v is AppearanceMode {
  return v === "light" || v === "dark";
}

function isFacing(v: unknown): v is StudyCameraFacing {
  return v === "user" || v === "environment";
}

function isSensitivity(v: unknown): v is StudyDetectionSensitivity {
  return v === "strict" || v === "balanced" || v === "lenient";
}

function isVerifyInterval(v: unknown): v is 2 | 3 | 5 {
  return v === 2 || v === 3 || v === 5;
}

/** Applies server `ui_prefs` JSON into the settings store (validated keys only). */
export function applyRemoteUiPrefs(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const o = raw as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (isAppearance(o.appearance)) patch.appearance = o.appearance;
  // purposeModeEnabled is intentionally NOT pulled from the server — images are device-local
  // (IndexedDB) and the toggle must be too, or a stale server row can hide the motivation strip
  // on refresh before the debounced push completes. It is still pushed outbound (pickUiPrefsForSync)
  // so a user's latest value eventually lands on the server as a backup; we just never let the
  // server value overwrite a locally-persisted one.
  if (typeof o.showCountdown === "boolean") patch.showCountdown = o.showCountdown;
  if (typeof o.advancedMarksProjectionEnabled === "boolean")
    patch.advancedMarksProjectionEnabled = o.advancedMarksProjectionEnabled;
  if (typeof o.soundEffects === "boolean") patch.soundEffects = o.soundEffects;
  if (typeof o.dailyReminders === "boolean")
    patch.dailyReminders = o.dailyReminders;
  if (typeof o.studyCameraEnabled === "boolean")
    patch.studyCameraEnabled = o.studyCameraEnabled;
  if (isFacing(o.studyCameraFacing)) patch.studyCameraFacing = o.studyCameraFacing;
  if (typeof o.studyCameraAutoStart === "boolean")
    patch.studyCameraAutoStart = o.studyCameraAutoStart;
  if (typeof o.studyCameraPrivacyAcknowledged === "boolean")
    patch.studyCameraPrivacyAcknowledged = o.studyCameraPrivacyAcknowledged;
  if (isSensitivity(o.studyDetectionSensitivity))
    patch.studyDetectionSensitivity = o.studyDetectionSensitivity;
  if (typeof o.studyCameraVisionVerify === "boolean")
    patch.studyCameraVisionVerify = o.studyCameraVisionVerify;
  if (isVerifyInterval(o.studyCameraVerifyIntervalMin))
    patch.studyCameraVerifyIntervalMin = o.studyCameraVerifyIntervalMin;

  if (Object.keys(patch).length > 0) {
    useSettingsStore.setState(patch as Partial<SettingsState>);
  }
}
