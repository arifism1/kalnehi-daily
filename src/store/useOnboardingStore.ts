import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { storageAdapter } from "@/lib/storage";

type OnboardingState = {
  onboardingCompleted: boolean;
  setOnboardingCompleted: (v: boolean) => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      setOnboardingCompleted: (onboardingCompleted) =>
        set({ onboardingCompleted }),
    }),
    {
      name: "kalnehi-onboarding",
      storage: createJSONStorage(() => storageAdapter),
      partialize: (s) => ({ onboardingCompleted: s.onboardingCompleted }),
    },
  ),
);
