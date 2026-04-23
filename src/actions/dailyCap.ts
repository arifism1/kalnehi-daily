"use server";

import { getDailyCapStatus, type DailyCapStatus } from "@/lib/daily-trial-cap";

/** Thin server-action wrapper so client components can call getDailyCapStatus. */
export async function fetchDailyCapStatus(): Promise<DailyCapStatus> {
  return getDailyCapStatus();
}
