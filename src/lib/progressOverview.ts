import type { Microtopic, Task } from "@/store/useTaskStore";

import { isTaskCompleted } from "@/lib/progressEngine";

export function topicCompletionStats(
  tasks: Task[],
  microtopics: Microtopic[],
): { percent: number; doneTopics: number; totalTopics: number } {
  const totalTopics = microtopics.length;
  if (totalTopics === 0) return { percent: 0, doneTopics: 0, totalTopics: 0 };
  const doneMicroIds = new Set<string>(
    tasks.flatMap((t) => (isTaskCompleted(t) && t.microtopic_id ? [t.microtopic_id] : [])),
  );
  const doneTopics = microtopics.filter((m) => doneMicroIds.has(m.id)).length;
  const percent = (doneTopics / totalTopics) * 100;
  return { percent, doneTopics, totalTopics };
}
