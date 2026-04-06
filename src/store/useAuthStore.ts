import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  setAuth: (session: Session | null) => void;
  setInitialized: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,

  setAuth: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),

  setInitialized: (v) => set({ initialized: v }),
}));
