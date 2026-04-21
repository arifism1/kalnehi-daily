import { NOTIFICATION_PREFS_DEFAULTS } from "@/lib/engine/notificationPrefs";
import type { Tables } from "@/types/supabase";
import type {
  PlannerTodoState,
  RevisionQueueEntry,
  UserPlannerTextBundle,
} from "@/lib/userPlannerTextTypes";
import type {
  RevisionDifficulty,
  RevisionReminderSource,
  RevisionReminderStatus,
} from "@/lib/engine/revisionSchedule";

function parseReminderStatus(raw: string | null | undefined): RevisionReminderStatus {
  if (raw === "done" || raw === "archived" || raw === "pending") return raw;
  return "pending";
}

function parseReminderSource(raw: string | null | undefined): RevisionReminderSource {
  if (raw === "suggested") return "suggested";
  return "manual";
}

function isoTs(t: string): number {
  const n = Date.parse(t);
  return Number.isFinite(n) ? n : 0;
}

function revisionFromRow(
  r: Tables<"user_revision_queue_items">,
): RevisionQueueEntry {
  return {
    id: r.id,
    title: r.title,
    microtopicId: r.microtopic_id ?? undefined,
    difficulty: r.difficulty as RevisionDifficulty,
    nextDue: r.next_due,
    lastReviewed: r.last_reviewed,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    notes: typeof r.notes === "string" ? r.notes : "",
    status: parseReminderStatus(r.status),
    reminderSource: parseReminderSource(r.reminder_source),
  };
}

function todoFromRow(r: Tables<"user_quick_exam_todos">): PlannerTodoState {
  return {
    id: r.id,
    text: r.text,
    priority: r.priority as PlannerTodoState["priority"],
    done: r.done,
    position: r.position,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  };
}

export type UserPlannerTextServerPayload = {
  revisions: Tables<"user_revision_queue_items">[];
  productivity: Tables<"user_productivity_planner"> | null;
  todos: Tables<"user_quick_exam_todos">[];
  prefs: Tables<"user_engine_notification_prefs"> | null;
};

/**
 * Merge server snapshot into a local bundle using per-row `updated_at` (and prefs/productivity row timestamps).
 */
export function mergeUserPlannerTextFromServer(
  prev: UserPlannerTextBundle,
  server: UserPlannerTextServerPayload,
): UserPlannerTextBundle {
  const revMap = new Map<string, RevisionQueueEntry>();
  for (const it of prev.revisionItems) {
    revMap.set(it.id, it);
  }
  for (const r of server.revisions) {
    const next = revisionFromRow(r);
    const cur = revMap.get(r.id);
    if (!cur || isoTs(r.updated_at) >= isoTs(cur.updatedAt)) {
      revMap.set(r.id, next);
    }
  }

  const todoMap = new Map<string, PlannerTodoState>();
  for (const t of prev.todos) {
    todoMap.set(t.id, t);
  }
  for (const r of server.todos) {
    const next = todoFromRow(r);
    const cur = todoMap.get(r.id);
    if (!cur || isoTs(r.updated_at) >= isoTs(cur.updatedAt)) {
      todoMap.set(r.id, next);
    }
  }
  const mergedTodos = Array.from(todoMap.values()).sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );

  let productivity = { ...prev.productivity };
  let productivityUpdatedAt = prev.productivityUpdatedAt;
  if (server.productivity) {
    const s = server.productivity;
    if (
      !productivityUpdatedAt ||
      isoTs(s.updated_at) >= isoTs(productivityUpdatedAt)
    ) {
      productivity = {
        notes: s.notes,
        p1: s.p1,
        p2: s.p2,
        p3: s.p3,
      };
      productivityUpdatedAt = s.updated_at;
    }
  }

  let enginePrefs = prev.enginePrefs;
  let prefsUpdatedAt = prev.prefsUpdatedAt;
  if (server.prefs) {
    const s = server.prefs;
    if (!prefsUpdatedAt || isoTs(s.updated_at) >= isoTs(prefsUpdatedAt)) {
      const raw = s.prefs;
      const obj =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {};
      enginePrefs = {
        ...NOTIFICATION_PREFS_DEFAULTS,
        ...obj,
      } as UserPlannerTextBundle["enginePrefs"];
      prefsUpdatedAt = s.updated_at;
    }
  }

  return {
    userId: prev.userId,
    revisionItems: Array.from(revMap.values()),
    productivity,
    productivityUpdatedAt,
    todos: mergedTodos,
    enginePrefs,
    prefsUpdatedAt,
    updatedAt: Date.now(),
  };
}
