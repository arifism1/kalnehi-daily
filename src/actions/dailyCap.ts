"use server";

import { getDailyCapStatus, type DailyCapStatus } from "@/lib/daily-trial-cap";

/** Thin server-action wrapper so client components can call getDailyCapStatus. */
// react-doctor-disable-next-line react-doctor/server-auth-actions -- public cap status shown on landing/waitlist, no user required
export async function fetchDailyCapStatus(): Promise<DailyCapStatus> {
  return getDailyCapStatus();
}
