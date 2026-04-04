import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useTaskStore } from "@/store/useTaskStore";

/**
 * Pull tasks + syllabus from Supabase into Zustand and IndexedDB.
 */
export async function refreshTasksFromSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const [{ data: taskRows, error: tErr }, { data: microRows, error: mErr }] =
    await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId),
      supabase.from("syllabus_master").select("*"),
    ]);

  if (tErr) throw tErr;
  if (mErr) throw mErr;

  const tasks = taskRows ?? [];
  const microtopics = microRows ?? [];

  useTaskStore.getState().mergeServerTasks(tasks);
  useTaskStore.getState().mergeServerMicrotopics(microtopics);

  const { persistTasks, persistMicrotopics } = await import("@/lib/taskIdb");
  await persistTasks(tasks);
  await persistMicrotopics(microtopics);
}
