import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsState = {
  purposeModeEnabled: boolean;
  showCountdown: boolean;
  soundEffects: boolean;
  dailyReminders: boolean;
  setPurposeModeEnabled: (v: boolean) => void;
  setShowCountdown: (v: boolean) => void;
  setSoundEffects: (v: boolean) => void;
  setDailyReminders: (v: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      purposeModeEnabled: false,
      showCountdown: true,
      soundEffects: true,
      dailyReminders: false,

      setPurposeModeEnabled: (purposeModeEnabled) =>
        set({ purposeModeEnabled }),
      setShowCountdown: (showCountdown) => set({ showCountdown }),
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      setDailyReminders: (dailyReminders) => set({ dailyReminders }),
    }),
    {
      name: "kalnehi-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        purposeModeEnabled: s.purposeModeEnabled,
        showCountdown: s.showCountdown,
        soundEffects: s.soundEffects,
        dailyReminders: s.dailyReminders,
      }),
    },
  ),
);
