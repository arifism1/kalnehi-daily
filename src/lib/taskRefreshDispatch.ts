/**
 * Dispatch a custom event so open screens can refetch tasks after sync.
 */
export function dispatchTasksSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kalnehi-tasks-sync"));
}
