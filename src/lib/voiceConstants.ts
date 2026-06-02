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

/**
 * Boss Mode / global voice: short trailing silence so commands finalize quickly.
 * Long-form dictation surfaces keep {@link VOICE_TRAILING_SILENCE_MS}.
 */
export const VOICE_COMMAND_TRAILING_SILENCE_MS = 900;

/** Android command mode: slightly longer gap tolerance without the 60s long-form floor. */
export const VOICE_COMMAND_ANDROID_SILENCE_MS = 1_200;

/** @deprecated Use {@link VOICE_COMMAND_TRAILING_SILENCE_MS} for Boss Mode. */
export const VOICE_COMMAND_SILENCE_MS = VOICE_COMMAND_TRAILING_SILENCE_MS;

/** Hard cap per listen session for generic Web Speech callers (non-long-form). */
export const VOICE_MAX_SESSION_MS = 60_000;

/** Wall-clock cap for boss / global voice so long planning isn’t cut at 60s. */
export const VOICE_COMMAND_MAX_SESSION_MS = 120_000;

/**
 * Web Speech + recorder limits aligned with the Global Voice Sheet (Hey Boss).
 * Backlog Speak and similar surfaces use this for parity with global voice infra.
 */
export const VOICE_GLOBAL_NAV_SPEECH_TIMING = {
  silenceMs: VOICE_COMMAND_TRAILING_SILENCE_MS,
  androidSilenceMs: VOICE_COMMAND_ANDROID_SILENCE_MS,
  maxSessionMs: VOICE_COMMAND_MAX_SESSION_MS,
} as const;

/**
 * Android Web Speech: longer trailing silence before auto-stop (phrase gaps, noisy mics).
 * Hook uses `Math.max(callerSilence, this)` on Android Chrome-like hosts.
 */
export const VOICE_ANDROID_TRAILING_SILENCE_MS = 60_000;

/**
 * Brief delay before the first {@link SpeechRecognition#start} on Android so capture
 * is less likely to clip the opening syllable.
 */
export const VOICE_ANDROID_PRE_START_DELAY_MS = 220;

/**
 * Android only: defer arming trailing-silence after {@link SpeechRecognition#onspeechend}
 * so clause-sized pauses do not arm an early Stop.
 */
export const VOICE_ANDROID_SPEECH_END_GRACE_MS = 450;

/**
 * Android Web Speech: extend short session caps (commands / generic 60s) so mid-utterance
 * restarts do not cut off. Long-form callers using {@link VOICE_LONG_FORM_MAX_SESSION_MS} are unchanged.
 */
export const VOICE_ANDROID_COMMAND_MAX_SESSION_MS = 180_000;

/** Long-form session cap above this is treated as “already generous” — no Android bump. */
export const VOICE_ANDROID_SESSION_BUMP_BELOW_MS = 10 * 60 * 1000;

/** Max engine `onend` → `start()` restarts per user listen session (Android phrase-gap recovery). */
export const VOICE_ANDROID_MAX_ENGINE_RESTARTS = 48;

/**
 * Android only: stagger {@link SpeechRecognition#start} after {@link SpeechRecognition#onend}
 * to reduce flaky restarts between phrases.
 */
export const VOICE_ANDROID_ONEND_RESTART_JITTER_MS = 50;

/** Safety wall-clock cap for long-form native STT sessions (30 min). */
export const VOICE_LONG_FORM_MAX_SESSION_MS = 30 * 60 * 1000;
