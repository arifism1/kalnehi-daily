/** Groq Whisper supported upload types (see console.groq.com/docs/speech-to-text). */
const GROQ_SUPPORTED_MIME = new Set([
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/mpga",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
]);

const MIN_AUDIO_BYTES = 512;

export type VoiceTranscribeErrorCode =
  | "unsupported_format"
  | "empty_audio"
  | "quota"
  | "provider_error"
  | "no_speech"
  | "auth"
  | "forbidden";

export function normalizeAudioMime(type: string | undefined): string {
  const t = (type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (!t) return "";
  if (t === "audio/x-m4a") return "audio/mp4";
  return t;
}

export function isGroqSupportedAudioMime(type: string | undefined): boolean {
  const n = normalizeAudioMime(type);
  if (!n) return false;
  return GROQ_SUPPORTED_MIME.has(n);
}

export function isAudioBlobTooSmall(size: number): boolean {
  return size < MIN_AUDIO_BYTES;
}

export function audioFileExtensionForMime(mimeType: string): string {
  const n = normalizeAudioMime(mimeType);
  if (n.includes("mp4") || n.includes("m4a")) return "m4a";
  if (n.includes("mpeg") || n.includes("mp3")) return "mp3";
  if (n.includes("ogg")) return "ogg";
  if (n.includes("wav")) return "wav";
  if (n.includes("flac")) return "flac";
  return "webm";
}

/** Map BCP-47 tags (e.g. en-IN) to ISO-639-1 for Whisper. */
export function whisperLanguageFromBcp47(lang: string | undefined): string {
  const primary = (lang ?? "en").trim().split(/[-_]/)[0]?.toLowerCase();
  return primary && /^[a-z]{2}$/.test(primary) ? primary : "en";
}

export function pickWhisperModel(lang: string | undefined): string {
  const code = whisperLanguageFromBcp47(lang);
  return code === "en" ? "distil-whisper-large-v3-en" : "whisper-large-v3-turbo";
}
