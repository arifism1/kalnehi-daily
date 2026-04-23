/** Shared types for Habit Maker (client + server safe). */

export type HabitOutboxOp =
  | { kind: "habit_create"; id: string; name: string }
  | { kind: "habit_delete"; id: string }
  | {
      kind: "habit_log_upsert";
      habitId: string;
      logDate: string;
      completed: boolean;
      comment: string | null;
      logId?: string;
    };
