import { create } from "zustand";

type SyncState = {
  isOnline: boolean;
  pendingCount: number;
  /** User-facing message when the outbox has stuck entries. null = healthy. */
  lastSyncError: string | null;
  /** Bumped to signal the SyncProvider to run flushOutbox immediately. */
  retrySeq: number;
  /** Monotonic: UI can flash a subtle “saved” when outbox applied ops while pending is 0. */
  quietSyncSeq: number;

  setOnline: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  bumpPending: () => void;
  setLastSyncError: (msg: string | null) => void;
  requestRetry: () => void;
  touchQuietSync: () => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingCount: 0,
  lastSyncError: null,
  retrySeq: 0,
  quietSyncSeq: 0,

  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  bumpPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  setLastSyncError: (lastSyncError) => set({ lastSyncError }),
  requestRetry: () =>
    set((s) => ({ retrySeq: s.retrySeq + 1, lastSyncError: null })),
  touchQuietSync: () =>
    set((s) => ({ quietSyncSeq: s.quietSyncSeq + 1 })),
}));
