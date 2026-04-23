import "server-only";
import { unstable_cache } from "next/cache";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const DAILY_CAP_STATUS_TAG = "daily-cap-status";

// ── Date helpers ────────────────────────────────────────────────────────────

/** Returns today's date string in the given IANA timezone, e.g. '2026-04-24'. */
export function getTodayDateStringInTz(tz = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Returns today's IST date string, e.g. '2026-04-24'. */
export function getTodayDateStringIST(): string {
  return getTodayDateStringInTz("Asia/Kolkata");
}

/**
 * Returns the next midnight in the given timezone as a UTC Date.
 * i.e. the moment IST (or configured tz) ticks over to the next calendar day.
 */
export function getNextMidnightInTz(tz = "Asia/Kolkata"): Date {
  const now = new Date();
  // Get today's date parts in target timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year  = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day   = Number(parts.find((p) => p.type === "day")?.value);

  // Construct tomorrow midnight in the target timezone by appending one day.
  // We create an ISO string that represents midnight in that timezone and
  // convert to UTC via the offset.
  const tomorrowISO = `${year}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}T00:00:00`;

  // Use Intl to find the UTC offset at that moment.
  // We do this by parsing the local time string back with the tz.
  const tomorrowLocal = new Date(`${tomorrowISO}`);

  // Create a formatter to get the offset.
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  });

  const offsetMatch = offsetFormatter.format(tomorrowLocal).match(/GMT([+-]\d+(?::\d+)?)/);
  let offsetMinutes = 0;
  if (offsetMatch?.[1]) {
    const parts2 = offsetMatch[1].split(":");
    const h = parseInt(parts2[0] ?? "0", 10);
    const m = parseInt(parts2[1] ?? "0", 10);
    offsetMinutes = h * 60 + (h < 0 ? -m : m);
  }

  // next midnight in UTC = local midnight - offset
  const nextMidnightUTC = new Date(tomorrowLocal.getTime() - offsetMinutes * 60 * 1000);
  return nextMidnightUTC;
}

/** Next IST midnight as a UTC Date. */
export function getNextMidnightIST(): Date {
  return getNextMidnightInTz("Asia/Kolkata");
}

// ── Status types ────────────────────────────────────────────────────────────

export type DailyCapStatus = {
  capEnabled: boolean;
  dailyCap: number;
  trialsStartedToday: number;
  spotsRemaining: number;
  isFull: boolean;
  /** ISO string of next midnight in the configured timezone (as UTC). */
  resetsAt: string;
  hoursUntilReset: number;
};

// ── Core fetch (uncached) ────────────────────────────────────────────────────

async function _getDailyCapStatus(): Promise<DailyCapStatus> {
  const admin = getSupabaseServiceRoleClient();

  const resetsAt = getNextMidnightIST();
  const hoursUntilReset = Math.max(
    0,
    Math.round((resetsAt.getTime() - Date.now()) / (1000 * 60 * 60) * 10) / 10,
  );

  const fallback: DailyCapStatus = {
    capEnabled: false,
    dailyCap: 2000,
    trialsStartedToday: 0,
    spotsRemaining: Infinity,
    isFull: false,
    resetsAt: resetsAt.toISOString(),
    hoursUntilReset,
  };

  if (!admin) return fallback;

  // Fetch app_config for cap settings.
  const { data: config, error: configErr } = await admin
    .from("app_config")
    .select("daily_cap_enabled, daily_trial_cap, daily_cap_timezone")
    .limit(1)
    .maybeSingle();

  if (configErr || !config) {
    console.error("[daily-trial-cap] fetchAppConfig error:", configErr?.message);
    return fallback;
  }

  const cfg = config as unknown as { daily_cap_enabled: boolean; daily_trial_cap: number; daily_cap_timezone: string };
  const capEnabled: boolean = cfg.daily_cap_enabled ?? false;
  const dailyCap: number = cfg.daily_trial_cap ?? 2000;
  const tz: string = cfg.daily_cap_timezone ?? "Asia/Kolkata";

  const tzResetsAt = getNextMidnightInTz(tz);
  const tzHoursUntil = Math.max(
    0,
    Math.round((tzResetsAt.getTime() - Date.now()) / (1000 * 60 * 60) * 10) / 10,
  );

  if (!capEnabled) {
    return {
      ...fallback,
      capEnabled: false,
      dailyCap,
      resetsAt: tzResetsAt.toISOString(),
      hoursUntilReset: tzHoursUntil,
    };
  }

  const todayStr = getTodayDateStringInTz(tz);

  const { data: countRow, error: countErr } = await admin
    .from("daily_trial_counts" as never)
    .select("trials_started, cap")
    .eq("date" as never, todayStr)
    .maybeSingle();

  if (countErr) {
    console.error("[daily-trial-cap] fetchDailyCount error:", countErr.message);
  }

  const trialsStartedToday: number = (countRow as { trials_started: number } | null)?.trials_started ?? 0;
  const effectiveCap = (countRow as { cap: number } | null)?.cap ?? dailyCap;
  const spotsRemaining = Math.max(0, effectiveCap - trialsStartedToday);
  const isFull = spotsRemaining === 0;

  return {
    capEnabled: true,
    dailyCap: effectiveCap,
    trialsStartedToday,
    spotsRemaining,
    isFull,
    resetsAt: tzResetsAt.toISOString(),
    hoursUntilReset: tzHoursUntil,
  };
}

/**
 * Cached daily cap status — refreshes every 60 seconds.
 * Tag `daily-cap-status` is invalidated whenever a trial starts or cap settings change.
 */
export const getDailyCapStatus = unstable_cache(
  _getDailyCapStatus,
  [DAILY_CAP_STATUS_TAG],
  {
    tags: [DAILY_CAP_STATUS_TAG],
    revalidate: 60,
  },
);

/** Quick boolean check — can a new trial start right now? */
export async function canStartTrialToday(): Promise<boolean> {
  const status = await getDailyCapStatus();
  return !status.capEnabled || !status.isFull;
}
