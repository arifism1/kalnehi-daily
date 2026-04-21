import type { NotificationPrefs } from "@/lib/engine/notificationPrefs";
import type {
  RevisionDifficulty,
  RevisionItem,
  RevisionReminderSource,
  RevisionReminderStatus,
} from "@/lib/engine/revisionSchedule";

export type {
  RevisionDifficulty,
  RevisionItem,
  RevisionReminderSource,
  RevisionReminderStatus,
};

/** Client-side revision row with monotonic merge field (ISO from DB or local). */
export type RevisionQueueEntry = RevisionItem & { updatedAt: string };

export type PlannerTodoState = {
  id: string;
  text: string;
  priority: "high" | "med" | "low";
  done: boolean;
  position: number;
  updatedAt: string;
  /** Preserved for upsert so `created_at` is not reset on update. */
  createdAt?: string;
};

export type UserPlannerTextBundle = {
  userId: string;
  revisionItems: RevisionQueueEntry[];
  productivity: { notes: string; p1: string; p2: string; p3: string };
  productivityUpdatedAt: string | null;
  todos: PlannerTodoState[];
  enginePrefs: NotificationPrefs;
  prefsUpdatedAt: string | null;
  /** Local monotonic clock for bundle writes. */
  updatedAt: number;
};

export type UserPlannerTextOutboxOp =
  | {
      kind: "revision_upsert";
      id: string;
      title: string;
      microtopicId?: string;
      difficulty: RevisionDifficulty;
      nextDue: string;
      lastReviewed: string | null;
      createdAt: string;
      notes: string;
      status: RevisionReminderStatus;
      reminderSource: RevisionReminderSource;
    }
  | { kind: "revision_delete"; id: string }
  | {
      kind: "productivity_put";
      notes: string;
      p1: string;
      p2: string;
      p3: string;
    }
  | {
      kind: "todo_upsert";
      id: string;
      text: string;
      priority: "high" | "med" | "low";
      done: boolean;
      position: number;
      createdAt?: string | null;
    }
  | { kind: "todo_delete"; id: string }
  | { kind: "todo_reorder"; orderedIds: string[] }
  | { kind: "engine_prefs_put"; prefs: NotificationPrefs };
