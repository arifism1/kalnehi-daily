/**
 * Shared voice session timing. Used by `useDeviceSpeechRecognition` and
 * `useMediaRecorderVoice` so dictation, global commands, and Whisper stay in sync.
 */

/** Trailing silence after last speech before auto-stop (Web Speech). Same for command and long-form flows. */
export const VOICE_TRAILING_SILENCE_MS = 30_000;

/** @deprecated Alias of {@link VOICE_TRAILING_SILENCE_MS} */
export const VOICE_SILENCE_AUTO_STOP_MS = VOICE_TRAILING_SILENCE_MS;

/** Trailing silence — same as {@link VOICE_TRAILING_SILENCE_MS} (daily plan, doubts, reflection, etc.). */
export const VOICE_LONG_FORM_SILENCE_MS = VOICE_TRAILING_SILENCE_MS;

/** Trailing silence — same as {@link VOICE_TRAILING_SILENCE_MS} (global voice sheet). */
export const VOICE_COMMAND_SILENCE_MS = VOICE_TRAILING_SILENCE_MS;

/** Hard cap per listen session for generic Web Speech callers (non-long-form). */
export const VOICE_MAX_SESSION_MS = 60_000;

/** Wall-clock cap for boss / global voice so long planning isn’t cut at 60s. */
export const VOICE_COMMAND_MAX_SESSION_MS = 120_000;

/** Safety wall-clock cap for long-form native STT sessions (30 min). */
export const VOICE_LONG_FORM_MAX_SESSION_MS = 30 * 60 * 1000;
