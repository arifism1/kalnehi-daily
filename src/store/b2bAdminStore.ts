"use client";

/**
 * B2B Admin Zustand store.
 * Completely isolated from all 13 existing student stores — no shared state.
 * Holds UI selection state for the institute admin dashboard.
 * Intentionally NOT persisted: selections reset on page reload (fresh from server).
 */
import { create } from "zustand";

export interface B2BBatch {
  id: string;
  name: string;
  exam_type: string;
  created_at: string;
}

export interface B2BStudent {
  user_id: string;
  full_name: string | null;
  email: string | null;
  batch_id: string | null;
  batch_name: string | null;
  joined_at: string;
}

interface B2BAdminState {
  /** The currently viewed/selected batch id (null = all batches). */
  selectedBatchId: string | null;
  /** In-memory student list for the selected batch (populated by server action). */
  studentList: B2BStudent[];
  /** Whether a push-assignment operation is in progress. */
  isPushingAssignment: boolean;
  /** Last error message from a server action, if any. */
  lastError: string | null;

  setSelectedBatchId: (id: string | null) => void;
  setStudentList: (students: B2BStudent[]) => void;
  setIsPushingAssignment: (v: boolean) => void;
  setLastError: (msg: string | null) => void;
  reset: () => void;
}

const initialState = {
  selectedBatchId: null,
  studentList: [],
  isPushingAssignment: false,
  lastError: null,
} satisfies Omit<B2BAdminState, "setSelectedBatchId" | "setStudentList" | "setIsPushingAssignment" | "setLastError" | "reset">;

export const useB2BAdminStore = create<B2BAdminState>()((set) => ({
  ...initialState,

  setSelectedBatchId: (id) => set({ selectedBatchId: id }),
  setStudentList: (students) => set({ studentList: students }),
  setIsPushingAssignment: (v) => set({ isPushingAssignment: v }),
  setLastError: (msg) => set({ lastError: msg }),
  reset: () => set(initialState),
}));
