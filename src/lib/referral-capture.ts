/**
 * Referral source capture utilities.
 *
 * Captures ref= and UTM params from Instagram/ManyChat magic links on first
 * page load, stores them in sessionStorage for the duration of the session,
 * and exposes helpers for the signup flow and welcome banner.
 *
 * ManyChat URL format:
 *   kalnehi.com/start?ref=IGTRIAL3&utm_source=instagram&utm_medium=manychat&utm_campaign=reel_comment
 *
 * All functions are client-side only (guard against SSR with typeof window check).
 */

const KEYS = {
  ref: "kalnehi_ref",
  utmSource: "kalnehi_utm_source",
  utmMedium: "kalnehi_utm_medium",
  utmCampaign: "kalnehi_utm_campaign",
  refUrl: "kalnehi_ref_url",
  capturedAt: "kalnehi_ref_captured_at",
  bannerDismissed: "kalnehi_ig_banner_dismissed",
} as const;

export type StoredReferral = {
  ref: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  refUrl: string | null;
  capturedAt: string | null;
};

/**
 * Run on every page load (via ReferralCapture component in root layout).
 *
 * 1. Parses ref= and utm_* from the current URL.
 * 2. If ref exists and is not already stored, writes to sessionStorage (first-wins).
 * 3. Cleans the params from the URL bar via history.replaceState.
 * 4. Fires a link_clicked event to /api/referral/event (fire-and-forget).
 */
export function captureReferralParams(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    // First-wins: don't overwrite an existing referral from this session.
    if (sessionStorage.getItem(KEYS.ref)) return;

    const utmSource = params.get("utm_source") ?? "";
    const utmMedium = params.get("utm_medium") ?? "";
    const utmCampaign = params.get("utm_campaign") ?? "";
    const capturedAt = new Date().toISOString();

    sessionStorage.setItem(KEYS.ref, ref);
    sessionStorage.setItem(KEYS.utmSource, utmSource);
    sessionStorage.setItem(KEYS.utmMedium, utmMedium);
    sessionStorage.setItem(KEYS.utmCampaign, utmCampaign);
    sessionStorage.setItem(KEYS.refUrl, window.location.href);
    sessionStorage.setItem(KEYS.capturedAt, capturedAt);

    // Remove params from URL bar — clean UX without losing the data.
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("ref");
    cleanUrl.searchParams.delete("utm_source");
    cleanUrl.searchParams.delete("utm_medium");
    cleanUrl.searchParams.delete("utm_campaign");
    window.history.replaceState({}, "", cleanUrl.toString());

    // Fire-and-forget event log — never block the page.
    void fetch("/api/referral/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "link_clicked",
        code: ref,
        session_id: getOrCreateSessionId(),
        metadata: {
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          page: window.location.pathname,
        },
      }),
    }).catch(() => {
      // Silently ignore — analytics must never break the user flow.
    });
  } catch {
    // Private browsing or storage quota — silently ignore.
  }
}

/** Returns the stored referral for the current session. All fields null if nothing stored. */
export function getStoredReferral(): StoredReferral {
  if (typeof window === "undefined") {
    return { ref: null, utmSource: null, utmMedium: null, utmCampaign: null, refUrl: null, capturedAt: null };
  }
  try {
    return {
      ref: sessionStorage.getItem(KEYS.ref),
      utmSource: sessionStorage.getItem(KEYS.utmSource),
      utmMedium: sessionStorage.getItem(KEYS.utmMedium),
      utmCampaign: sessionStorage.getItem(KEYS.utmCampaign),
      refUrl: sessionStorage.getItem(KEYS.refUrl),
      capturedAt: sessionStorage.getItem(KEYS.capturedAt),
    };
  } catch {
    return { ref: null, utmSource: null, utmMedium: null, utmCampaign: null, refUrl: null, capturedAt: null };
  }
}

/** Removes all referral keys from sessionStorage. Call after successfully attaching ref to user account. */
export function clearStoredReferral(): void {
  if (typeof window === "undefined") return;
  try {
    Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignore private mode errors.
  }
}

/**
 * Returns true if the stored referral came from Instagram/ManyChat.
 * Used to conditionally show Instagram-specific UI (welcome banner, pre-filled code field).
 */
export function isInstagramReferral(): boolean {
  const { utmMedium, utmSource } = getStoredReferral();
  return utmMedium === "manychat" || utmSource === "instagram";
}

// ── Internal helpers ──────────────────────────────────────────────────────

const SESSION_ID_KEY = "kalnehi_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}
