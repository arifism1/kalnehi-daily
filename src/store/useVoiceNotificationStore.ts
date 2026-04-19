import { create } from "zustand";

export type HubVoiceNotificationPrefill = {
  title: string;
  next_fire_at: string;
  tag: string;
  repeat_type: "once" | "daily" | "weekly";
  subject: string | null;
  chapter: string | null;
  user_timezone: string;
  voiceQuotaNote?: string | null;
};

type VoiceNotificationState = {
  open: boolean;
  handoffToHubModal: boolean;
  pendingHubPrefill: HubVoiceNotificationPrefill | null;
  openSheet: (opts?: { handoffToHubModal?: boolean }) => void;
  closeSheet: () => void;
  commitHubPrefill: (payload: HubVoiceNotificationPrefill) => void;
  takeHubVoicePrefill: () => HubVoiceNotificationPrefill | null;
};

export const useVoiceNotificationStore = create<VoiceNotificationState>((set, get) => ({
  open: false,
  handoffToHubModal: false,
  pendingHubPrefill: null,
  openSheet: (opts) =>
    set({
      open: true,
      handoffToHubModal: Boolean(opts?.handoffToHubModal),
    }),
  closeSheet: () =>
    set({
      open: false,
      handoffToHubModal: false,
    }),
  commitHubPrefill: (payload) =>
    set({
      pendingHubPrefill: payload,
      open: false,
      handoffToHubModal: false,
    }),
  takeHubVoicePrefill: () => {
    const p = get().pendingHubPrefill;
    if (p) set({ pendingHubPrefill: null });
    return p;
  },
}));
