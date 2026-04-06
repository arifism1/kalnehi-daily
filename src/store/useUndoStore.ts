"use client";

import { create } from "zustand";

const DEFAULT_TOAST_MS = 5600;

export type UndoSession = {
  message: string;
  runUndo: () => Promise<void>;
  /** Auto-hide toast after this many ms. Defaults to longer window for non-delete flows. */
  autoDismissMs?: number;
};

type UndoStore = {
  open: boolean;
  message: string;
  runUndo: (() => Promise<void>) | null;
  timerId: ReturnType<typeof setTimeout> | null;
  offerUndo: (session: UndoSession) => void;
  dismissToast: () => void;
  executeUndo: () => Promise<void>;
};

export const useUndoStore = create<UndoStore>((set, get) => ({
  open: false,
  message: "",
  runUndo: null,
  timerId: null,

  dismissToast: () => {
    const t = get().timerId;
    if (t) clearTimeout(t);
    set({ open: false, message: "", runUndo: null, timerId: null });
  },

  offerUndo: (session) => {
    const prev = get().timerId;
    if (prev) clearTimeout(prev);
    const ms = session.autoDismissMs ?? DEFAULT_TOAST_MS;
    const timerId = setTimeout(() => {
      get().dismissToast();
    }, ms);
    set({
      open: true,
      message: session.message,
      runUndo: session.runUndo,
      timerId,
    });
  },

  executeUndo: async () => {
    const { runUndo, timerId } = get();
    if (timerId) clearTimeout(timerId);
    set({ open: false, message: "", runUndo: null, timerId: null });
    if (runUndo) {
      try {
        await runUndo();
      } catch (e) {
        console.warn("[undo] failed", e);
      }
    }
  },
}));
