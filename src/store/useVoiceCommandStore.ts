import { create } from "zustand";

import type { VoiceCommandIntent } from "@/lib/voiceCommandGroq";

export type VoiceCommandPhase =
  | "idle"
  | "listening"
  | "processing"
  | "preview"
  | "done"
  | "error";

type PendingRevision = {
  subject: string;
  nextDue: string;
};

export type PendingVoiceIntent = {
  intent: VoiceCommandIntent;
  responseText: string;
};

type VoiceCommandState = {
  isOpen: boolean;
  phase: VoiceCommandPhase;
  transcript: string | null;
  responseText: string | null;
  error: string | null;
  pendingRevision: PendingRevision | null;
  pendingIntent: PendingVoiceIntent | null;
  /** Driven by Web Speech mic sessions only (`useDeviceSpeechRecognition`); Android Whisper does not toggle this flag today. Reserved for overlapping-session UX. */
  isMicBusy: boolean;

  open: () => void;
  close: () => void;
  setPhase: (phase: VoiceCommandPhase) => void;
  setTranscript: (transcript: string | null) => void;
  setResponseText: (responseText: string | null) => void;
  setError: (error: string | null) => void;
  setPendingRevision: (revision: PendingRevision | null) => void;
  setPendingIntent: (pending: PendingVoiceIntent | null) => void;
  setMicBusy: (busy: boolean) => void;
  reset: () => void;
};

export const useVoiceCommandStore = create<VoiceCommandState>((set) => ({
  isOpen: false,
  phase: "idle",
  transcript: null,
  responseText: null,
  error: null,
  pendingRevision: null,
  pendingIntent: null,
  isMicBusy: false,

  open: () =>
    set({
      isOpen: true,
      phase: "idle",
      transcript: null,
      responseText: null,
      error: null,
      pendingIntent: null,
    }),
  close: () => set({ isOpen: false }),
  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  setResponseText: (responseText) => set({ responseText }),
  setError: (error) => set({ error }),
  setPendingRevision: (pendingRevision) => set({ pendingRevision }),
  setPendingIntent: (pendingIntent) => set({ pendingIntent }),
  setMicBusy: (busy) => set({ isMicBusy: busy }),
  reset: () =>
    set({
      phase: "idle",
      transcript: null,
      responseText: null,
      error: null,
      pendingIntent: null,
    }),
}));
