import { create } from "zustand";

type VoiceReminderState = {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};

export const useVoiceReminderStore = create<VoiceReminderState>((set) => ({
  open: false,
  openSheet: () => set({ open: true }),
  closeSheet: () => set({ open: false }),
}));
