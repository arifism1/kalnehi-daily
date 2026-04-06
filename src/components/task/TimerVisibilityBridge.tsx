"use client";

import { useEffect } from "react";

import { useActiveTimerStore } from "@/store/useActiveTimerStore";

/**
 * Pauses the active task timer while the tab/app is hidden; resumes when visible.
 */
export function TimerVisibilityBridge() {
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        useActiveTimerStore.getState().pauseFromVisibility();
      } else {
        useActiveTimerStore.getState().resumeFromVisibility();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return null;
}
