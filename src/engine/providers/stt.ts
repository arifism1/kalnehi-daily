/**
 * ENGINE provider interface: Speech-to-Text (PROVIDER_STT).
 *
 * Domain-agnostic. Concrete routing (Web Speech API / Capacitor plugin / Groq Whisper
 * fallback) lives outside the engine in the app layer (src/hooks/useVoiceSttRouting.ts
 * + a server transcribe adapter). The engine only knows this interface.
 */

export interface SttTranscribeInput {
  /** Raw audio bytes (server path) — e.g. for the Whisper fallback. */
  audio: ArrayBuffer | Blob;
  mimeType: string;
  /** BCP-47 hint, e.g. "en-IN". */
  lang?: string;
}

export interface SttTranscribeResult {
  text: string;
  /** Billed audio duration in seconds, when the provider reports it. */
  durationSeconds?: number;
  provider?: string;
}

export interface SttProvider {
  /** Server-side transcription of an audio blob (e.g. Groq Whisper). */
  transcribe(input: SttTranscribeInput): Promise<SttTranscribeResult>;
}
