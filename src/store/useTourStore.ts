import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { storageAdapter } from "@/lib/storage";

type TourState = {
  tourCompleted: boolean;
  tourDismissed: boolean;
  currentStep: number;
  nextStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
};

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      tourCompleted: false,
      tourDismissed: false,
      currentStep: 0,
      nextStep: () => set({ currentStep: get().currentStep + 1 }),
      skipTour: () => set({ tourDismissed: true, tourCompleted: true }),
      completeTour: () => set({ tourCompleted: true }),
      resetTour: () =>
        set({ tourCompleted: false, tourDismissed: false, currentStep: 0 }),
    }),
    {
      name: "kalnehi-tour-v1",
      storage: createJSONStorage(() => storageAdapter),
      partialize: (s) => ({
        tourCompleted: s.tourCompleted,
        tourDismissed: s.tourDismissed,
      }),
    },
  ),
);
