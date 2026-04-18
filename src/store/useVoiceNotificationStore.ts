import { create } from "zustand";

type VoiceNotificationState = {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};

export const useVoiceNotificationStore = create<VoiceNotificationState>((set) => ({
  open: false,
  openSheet: () => set({ open: true }),
  closeSheet: () => set({ open: false }),
}));
