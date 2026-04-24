/**
 * Shared voice session timing. Used by `useDeviceSpeechRecognition` and
 * `useMediaRecorderVoice` so dictation, global commands, and Whisper stay in sync.
 */
export const VOICE_SILENCE_AUTO_STOP_MS = 30_000; // long-form / dictation flows
export const VOICE_COMMAND_SILENCE_MS = 5_000; // GlobalVoiceSheet only (short commands)
export const VOICE_MAX_SESSION_MS = 60_000; // hard cap per listen session, all flows
