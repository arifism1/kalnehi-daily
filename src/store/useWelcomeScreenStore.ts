import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WelcomeScreenState = {
  /** Calendar day (yyyy-MM-dd) when the morning screen was completed or skipped. */
  lastMorningYmd: string | null;
  setLastMorningYmd: (ymd: string) => void;
};

const STORAGE_KEY = "kalnehi-welcome-v1";

export const useWelcomeScreenStore = create<WelcomeScreenState>()(
  persist(
    (set) => ({
      lastMorningYmd: null,
      setLastMorningYmd: (ymd) => set({ lastMorningYmd: ymd }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        lastMorningYmd: s.lastMorningYmd,
      }),
    },
  ),
);

/**
 * Show morning welcome when we have not recorded this calendar day yet.
 */
export function shouldShowMorningForDate(
  todayYmd: string,
  lastMorningYmd: string | null,
): boolean {
  if (!todayYmd) return false;
  return lastMorningYmd !== todayYmd;
}
