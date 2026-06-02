/**
 * All user-visible error copy — never expose raw API, DB, or network strings.
 *
 * Network-style messages (cantConnect / offlineShort) are used sparingly — only
 * when failure is likely due to connectivity or unreachable service. Other
 * failures use neutral "try again" copy so users aren't told they're "offline"
 * when they're online.
 */

export const USER_ERROR = {
  offline:
    "You're offline. Your work is saved on this device and will update when you're back online.",
  offlineShort: "You're offline — your progress is safe on this device.",
  cantConnect:
    "Connection dropped. Your latest work is saved here — we'll retry when the network is stable.",
  tryAgain: "Something went wrong. Try again in a moment.",
  loadFailed:
    "We couldn't load this right now. Pull to refresh or try again shortly.",
  localData:
    "We couldn't read saved data on this device. Try closing other tabs or restarting the app.",
  syncPending:
    "Almost there — your latest changes are saved on this device.",
  signIn: "Couldn't sign you in. Check your email and code, then try again.",
  session: "Please sign in again to continue.",
  taskMissing: "That task isn't available anymore. Refresh and try again.",
} as const;

function extractMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.details === "string" && o.details) return o.details;
    if (typeof o.hint === "string" && o.hint) return o.hint;
    if (typeof o.error_description === "string" && o.error_description)
      return o.error_description;
    if (typeof o.code === "string" && o.code) return o.code;
  }
  if (typeof err === "string") return err;
  return "";
}

function navigatorReportsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * True only when the error text strongly suggests transport / reachability,
 * not app logic (RLS, validation, missing row, etc.).
 */
function isLikelyNetworkTransportFailure(raw: string): boolean {
  const t = raw.toLowerCase();
  if (!t.trim()) return false;

  // Explicit browser / fetch network failures
  if (
    /failed to fetch|fetch failed|networkerror|network request failed|load failed|connection.*(failed|refused|reset|closed|timed out)|net::err|net::err_internet_disconnected|err_network_changed|econnrefused|econnreset|enotfound|etimedout|eai_again|dns|getaddrinfo|aborted|timeout|timed out|temporarily unavailable/i.test(
      t,
    )
  ) {
    return true;
  }

  // HTTP status hints for gateway / overload (not 4xx app errors in message)
  if (/\b502\b|\b503\b|\b504\b|\b522\b|\b524\b/.test(t)) return true;

  return false;
}

/** Auth/session — not a network banner. */
function isSessionLike(raw: string): boolean {
  const low = raw.toLowerCase();
  return /please sign in again|session expired|unauthorized|not authenticated|invalid refresh|jwt expired|sign in required|must be logged in|invalid jwt/i.test(
    low,
  );
}

function isSignInLike(raw: string): boolean {
  const low = raw.toLowerCase();
  return (
    /invalid.*login|invalid.*credentials|wrong password|email not confirmed|invalid email|user (is )?not found|already registered/i.test(
      low,
    ) ||
    (raw.length < 140 &&
      /password|sign in|sign-in|sign up|signup|oauth/i.test(low) &&
      !isLikelyNetworkTransportFailure(raw))
  );
}

/**
 * Maps any thrown error or API failure to safe copy for the UI.
 * Avoids labeling generic API errors as "couldn't connect" — that caused
 * false positives when users were online (RLS, validation, PostgREST codes).
 */
export function toUserFacingMessage(err: unknown): string {
  const raw = extractMessage(err);
  const low = raw.toLowerCase();

  if (isSessionLike(raw)) {
    return USER_ERROR.session;
  }

  if (isSignInLike(raw)) {
    return USER_ERROR.signIn;
  }

  // True offline: browser says disconnected and we didn't get a rich app error
  if (navigatorReportsOffline()) {
    if (!raw.trim() || isLikelyNetworkTransportFailure(raw)) {
      return USER_ERROR.offlineShort;
    }
  }

  if (!raw.trim()) {
    return USER_ERROR.tryAgain;
  }

  if (isLikelyNetworkTransportFailure(raw)) {
    return USER_ERROR.cantConnect;
  }

  // PostgREST / Supabase logic errors — not "offline"
  if (
    /pgrst|postgrest|row-level|rls|policy|permission denied|duplicate key|violates foreign key|invalid input syntax|null value in column|jwt|not found|no rows|42501|23505|22p02/i.test(
      low,
    )
  ) {
    return USER_ERROR.tryAgain;
  }

  // Residual "network" word often appears in non-network contexts — don't treat alone
  if (
    /status code (401|403|404|406|409|422|400|429)\b|http 401|http 403|http 404/i.test(
      low,
    )
  ) {
    return USER_ERROR.tryAgain;
  }

  return USER_ERROR.tryAgain;
}

/**
 * Use for any unknown value destined for the UI (`res.error`, `data.error`, `catch (e)`).
 * Wraps strings so PostgREST/vendor text is filtered; passes through `Error` and message-like objects.
 */
export function surfaceErrorForUi(raw: unknown): string {
  if (raw instanceof Error) {
    return toUserFacingMessage(raw);
  }
  if (typeof raw === "string") {
    return toUserFacingMessage(new Error(raw));
  }
  if (raw != null && typeof raw === "object") {
    return toUserFacingMessage(raw);
  }
  return USER_ERROR.tryAgain;
}

/** When the source may be empty, show `fallback` instead of generic try-again. */
export function surfaceOptionalString(
  s: string | null | undefined,
  fallback: string,
): string {
  if (s == null || !String(s).trim()) return fallback;
  return surfaceErrorForUi(s);
}

/** IndexedDB / local-only storage failures (Doubt Tracker, etc.). */
export function toUserFacingLocalError(err: unknown): string {
  const raw = extractMessage(err);
  if (!raw.trim()) return USER_ERROR.localData;
  if (navigatorReportsOffline() && isLikelyNetworkTransportFailure(raw)) {
    return USER_ERROR.offlineShort;
  }
  return USER_ERROR.localData;
}
