/** sessionStorage keys for Boss Mode voice fallbacks (timer / daily plan pre-fill). */

export const VOICE_FOCUS_HINT_KEY = "kalnehi_voice_focus_hint_v1";

export const VOICE_PLAN_HINT_KEY = "kalnehi_voice_plan_hint_v1";

export type VoiceFocusHintV1 = {
  v: 1;
  /** Block length in seconds */
  customSec: number;
  /** Pre-fill link picker */
  taskHint: string | null;
  /** When fuzzy match succeeded */
  dailyTaskId: string | null;
  legacyTaskId: string | null;
  autoStart: boolean;
};

export type VoicePlanHintV1 = {
  v: 1;
  action_type: "add" | "move" | "mark_done";
  task_name: string;
  target_date: string;
  duration_logged: number | null;
};

export function writeVoiceFocusHint(hint: Omit<VoiceFocusHintV1, "v">): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      VOICE_FOCUS_HINT_KEY,
      JSON.stringify({ v: 1, ...hint } satisfies VoiceFocusHintV1),
    );
  } catch {
    // ignore
  }
}

export function writeVoicePlanHint(
  hint: Omit<VoicePlanHintV1, "v">,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      VOICE_PLAN_HINT_KEY,
      JSON.stringify({ v: 1, ...hint } satisfies VoicePlanHintV1),
    );
  } catch {
    // ignore
  }
}
