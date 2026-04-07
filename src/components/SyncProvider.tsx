"use client";

import { useEffect, useRef } from "react";

import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { refreshExecutionLogFromServer } from "@/lib/refreshExecutionLog";
import { refreshStudySessionsFromServer } from "@/lib/refreshStudySessionsFromServer";
import { persistTasks } from "@/lib/taskIdb";
import { refreshTasksFromSupabase } from "@/lib/refreshTasksFromSupabase";
import { dispatchTasksSync } from "@/lib/taskRefreshDispatch";
import { flushOutbox, initSyncManager } from "@/lib/sync";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useAuthStore } from "@/store/useAuthStore";
import { useSyncStore } from "@/store/useSyncStore";
import { useTaskStore } from "@/store/useTaskStore";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { examLabel } = usePrimaryExamLabel();
  const setHydrated = useTaskStore((s) => s.setHydrated);
  const mergeServerTasks = useTaskStore((s) => s.mergeServerTasks);
  const setMicrotopics = useTaskStore((s) => s.setMicrotopics);
  const retrySeq = useSyncStore((s) => s.retrySeq);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { loadAllLocalState } = await import("@/lib/taskIdb");
        const { tasks, microtopics } = await loadAllLocalState();
        if (cancelled) return;
        mergeServerTasks(tasks);
        setMicrotopics(microtopics);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mergeServerTasks, setMicrotopics, setHydrated]);

  useEffect(() => {
    if (!userId) return;
    void Promise.all([
      refreshTasksFromSupabase(userId),
      refreshExecutionLogFromServer(),
      refreshStudySessionsFromServer(),
    ]).catch(() => {});
  }, [userId, examLabel]);

  useEffect(() => {
    if (!userId) return;
    const onProfileUpdated = () => {
      void Promise.all([
        refreshTasksFromSupabase(userId),
        refreshExecutionLogFromServer(),
        refreshStudySessionsFromServer(),
      ])
        .then(() => {
          dispatchTasksSync();
        })
        .catch(() => {});
    };
    window.addEventListener(KALNEHI_PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () =>
      window.removeEventListener(
        KALNEHI_PROFILE_UPDATED_EVENT,
        onProfileUpdated,
      );
  }, [userId]);

  useEffect(() => {
    return initSyncManager(userId);
  }, [userId]);

  useEffect(() => {
    if (retrySeq > 0 && userId) {
      void flushOutbox(userId);
    }
  }, [retrySeq, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const onMsg = (event: MessageEvent) => {
      if (event.data?.type === "KALNEHI_SYNC" && userId) {
        void flushOutbox(userId);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [userId]);

  useEffect(() => {
    return useTaskStore.subscribe((state) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        const tasks = Object.values(state.tasks);
        void persistTasks(tasks).catch(() => {});
      }, 400);
    });
  }, []);

  return <>{children}</>;
}
