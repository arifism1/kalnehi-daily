/**
 * Shared voice session timing. Used by `useDeviceSpeechRecognition` and
 * `useMediaRecorderVoice` so dictation, global commands, and Whisper stay in sync.
 */
/** @deprecated Prefer `VOICE_LONG_FORM_SILENCE_MS` for long-form web STT. */
export const VOICE_SILENCE_AUTO_STOP_MS = 30_000;
/** Trailing silence after speech before auto-stop — long-form flows (web + Capacitor idle timer target). */
export const VOICE_LONG_FORM_SILENCE_MS = 120_000;
export const VOICE_COMMAND_SILENCE_MS = 5_000; // GlobalVoiceSheet only (short commands)
export const VOICE_MAX_SESSION_MS = 60_000; // hard cap per listen session (commands / default)
/** Safety wall-clock cap for long-form native STT sessions (30 min). */
export const VOICE_LONG_FORM_MAX_SESSION_MS = 30 * 60 * 1000;
