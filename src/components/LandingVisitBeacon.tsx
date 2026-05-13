"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { getFirstTouch, trackMetaLandingPageView } from "@/lib/analytics";

const ALLOWED = new Set(["/", "/kalnehi-daily", "/pricing"]);
const VISITOR_KEY = "kal_landing_visitor_v1";

function visitorId(): string {
  if (typeof sessionStorage === "undefined") return "";
  let id = sessionStorage.getItem(VISITOR_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function LandingVisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !ALLOWED.has(pathname)) return;

    const flag = `kal_landing_sent:${pathname}`;
    try {
      if (sessionStorage.getItem(flag)) return;
    } catch {
      return;
    }

    const vid = visitorId();
    if (!vid) return;

    const ft = getFirstTouch();
    const referrer =
      ft?.referrer ??
      (typeof document !== "undefined" ? document.referrer || "" : "");

    trackMetaLandingPageView(pathname);

    void fetch("/api/public/landing-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_session_id: vid,
        path: pathname,
        referrer,
        utm: ft?.utm ?? {},
      }),
      keepalive: true,
    }).then(() => {
      try {
        sessionStorage.setItem(flag, "1");
      } catch {
        /* private mode */
      }
    });
  }, [pathname]);

  return null;
}
