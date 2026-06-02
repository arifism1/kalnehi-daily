"use client";

import { useEffect } from "react";

import { shouldSyncWithServer } from "@/lib/nativeSyncPolicy";
import { refreshTasksFromSupabase } from "@/lib/refreshTasksFromSupabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

/**
 * Refetch tasks when the tab becomes visible and on mount (when authed).
 */
export function useRefreshTasksOnHomeFocus() {
  const userId = useAuthStore((s) => s.user?.id);
  const hydrated = useTaskStore((s) => s.hydrated);

  useEffect(() => {
    if (!userId || !hydrated) return;

    const run = () => {
      if (!shouldSyncWithServer()) return;
      void refreshTasksFromSupabase(userId).catch(() => {
        /* ignore */
      });
    };

    run();

    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [userId, hydrated]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    const onSync = () => {
      if (!shouldSyncWithServer()) return;
      void refreshTasksFromSupabase(userId).catch(() => {});
    };
    window.addEventListener("kalnehi-tasks-sync", onSync);
    return () => window.removeEventListener("kalnehi-tasks-sync", onSync);
  }, [userId, hydrated]);
}
