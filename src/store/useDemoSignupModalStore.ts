import { create } from "zustand";

type DemoSignupModalState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useDemoSignupModalStore = create<DemoSignupModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
