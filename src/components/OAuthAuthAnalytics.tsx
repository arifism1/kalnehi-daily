"use client";

import { useEffect } from "react";

import { trackAuthSuccess } from "@/lib/analytics";

/**
 * One-shot: OAuth callback redirects with `kalnehi_auth_event=login|sign_up`.
 * Strips the param synchronously before analytics so React Strict Mode does not double-fire.
 */
export function OAuthAuthAnalytics() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("kalnehi_auth_event");
    if (raw !== "login" && raw !== "sign_up") return;

    params.delete("kalnehi_auth_event");
    const qs = params.toString();
    const path = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", path);

    trackAuthSuccess(raw);
  }, []);

  return null;
}
