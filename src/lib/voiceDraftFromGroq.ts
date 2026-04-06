import type { GroqVoiceTask } from "@/lib/voiceDictateGroq";
import { minutesBetweenHHMM, normalizeVoiceHHMM } from "@/lib/voiceIst";

export type VoiceDraftTask = {
  taskTitle: string;
  start_time: string | null;
  end_time: string | null;
  duration: string | null;
};

export function groqTasksToVoiceDraftTasks(tasks: GroqVoiceTask[]): VoiceDraftTask[] {
  return tasks.map((task) => {
    const taskTitle = task.name.trim().slice(0, 200) || "Activity";
    const start = normalizeVoiceHHMM(task.start_time ?? null);
    const end = normalizeVoiceHHMM(task.end_time ?? null);
    const mins = minutesBetweenHHMM(start, end);
    const duration =
      mins == null
        ? null
        : mins >= 60
          ? mins % 60 === 0
            ? `${Math.floor(mins / 60)}h`
            : `${Math.floor(mins / 60)}h ${mins % 60}m`
          : `${mins}m`;
    return { taskTitle, start_time: start, end_time: end, duration };
  });
}
