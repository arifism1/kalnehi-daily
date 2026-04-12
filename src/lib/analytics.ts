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
  if (ref.includes("google.") && ref.includes("yahoo.") === false) return true;
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
}
