import { saveSignupAttributionOnce } from "@/actions/clientProfileExtras";
import type { Json } from "@/types/supabase";

const STORAGE_KEY = "kalnehi_first_touch_v1";

export type FirstTouch = {
  landingPath: string;
  referrer: string;
  capturedAt: number;
  utm: Record<string, string>;
};

export function captureFirstTouchIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ] as const) {
      const v = params.get(key);
      if (v) utm[key] = v;
    }
    const payload: FirstTouch = {
      landingPath: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer || "",
      capturedAt: Date.now(),
      utm,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function getFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirstTouch;
  } catch {
    return null;
  }
}

export function isProbablyOrganicSearch(ft: FirstTouch | null): boolean {
  if (!ft) return false;
  const ref = ft.referrer.toLowerCase();
  if (ref.includes("google.") || ref.includes("yahoo.")) return true;
  if (ref.includes("bing.com") || ref.includes("duckduckgo.")) return true;
  if (ft.utm["utm_medium"] === "organic") return true;
  return false;
}

type DataLayer = Record<string, unknown>;

function pushDataLayer(data: DataLayer) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: DataLayer[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push(data);
}

/**
 * Call after successful email/password login or signup (session present).
 * Works with GA4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set (`gtag` + dataLayer).
 */
export function trackAuthSuccess(event: "login" | "sign_up"): void {
  const ft = getFirstTouch();
  if (ft) {
    void saveSignupAttributionOnce({
      landingPath: ft.landingPath,
      referrer: ft.referrer,
      capturedAt: ft.capturedAt,
      utm: ft.utm,
      event,
    } as unknown as Json);
  }
  const organic = isProbablyOrganicSearch(ft);
  const payload = {
    kalnehi_first_landing: ft?.landingPath ?? "",
    kalnehi_organic_guess: organic,
  };
  pushDataLayer({
    event,
    ...payload,
  });
  if (typeof window !== "undefined") {
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (typeof gtag === "function") {
      const name = event === "sign_up" ? "sign_up" : "login";
      gtag("event", name, payload);
    }
  }
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.info("[kalnehi analytics]", event, { firstTouch: ft, organic });
  }

  trackMetaAuthSuccess(event);
}

/** Meta Pixel custom events — use when `fbq` may be unavailable (warn in dev). */
function callMetaTrackCustom(eventName: string): void {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq === "function") {
    fbq("trackCustom", eventName);
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[kalnehi analytics] Meta Pixel not ready; skipped trackCustom:",
      eventName,
    );
  }
}

/** Meta Pixel: registration standard event + funnel custom event for all auths. */
export function trackMetaAuthSuccess(event: "login" | "sign_up"): void {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  if (event === "sign_up") {
    fbq("track", "CompleteRegistration");
  }
  fbq("trackCustom", "Auth Success");
}

/** Meta Pixel custom event when the welcome (7-day) trial is newly started (not idempotent no-op). */
export function trackMetaFreeTrialStarted(): void {
  if (typeof window === "undefined") return;
  window.fbq?.("trackCustom", "Free Trial Started");
}

export const trackMetaBacklogAdded = (): void => {
  callMetaTrackCustom("Backlog Added");
};

export const trackMetaBacklogPlanLocked = (): void => {
  callMetaTrackCustom("Backlog Plan Locked");
};

export const trackMetaTaskCreated = (): void => {
  callMetaTrackCustom("Task Created");
};

export const trackMetaTimerStarted = (): void => {
  callMetaTrackCustom("Timer Started");
};

export const trackMetaTaskCompleted = (): void => {
  callMetaTrackCustom("Task Completed");
};
