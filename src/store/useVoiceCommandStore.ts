import { create } from "zustand";

export type VoiceCommandPhase = "idle" | "listening" | "processing" | "done" | "error";

type PendingRevision = {
  subject: string;
  days: number;
};

type VoiceCommandState = {
  isOpen: boolean;
  phase: VoiceCommandPhase;
  transcript: string | null;
  responseText: string | null;
  error: string | null;
  pendingRevision: PendingRevision | null;
  /** True once the user has explicitly clicked the mic button this session. Resets on page reload. */
  wakeWordSessionActive: boolean;

  open: () => void;
  close: () => void;
  setPhase: (phase: VoiceCommandPhase) => void;
  setTranscript: (transcript: string | null) => void;
  setResponseText: (responseText: string | null) => void;
  setError: (error: string | null) => void;
  setPendingRevision: (revision: PendingRevision | null) => void;
  reset: () => void;
};

export const useVoiceCommandStore = create<VoiceCommandState>((set) => ({
  isOpen: false,
  phase: "idle",
  transcript: null,
  responseText: null,
  error: null,
  pendingRevision: null,
  wakeWordSessionActive: false,

  open: () => set({ isOpen: true, phase: "idle", transcript: null, responseText: null, error: null, wakeWordSessionActive: true }),
  close: () => set({ isOpen: false }),
  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  setResponseText: (responseText) => set({ responseText }),
  setError: (error) => set({ error }),
  setPendingRevision: (pendingRevision) => set({ pendingRevision }),
  reset: () => set({ phase: "idle", transcript: null, responseText: null, error: null }),
}));
