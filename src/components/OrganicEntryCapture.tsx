"use client";

import { useEffect } from "react";

import { captureFirstTouchIfNeeded } from "@/lib/analytics";

/** Stores first landing URL + referrer for organic → signup attribution (sessionStorage). */
export function OrganicEntryCapture() {
  useEffect(() => {
    captureFirstTouchIfNeeded();
  }, []);
  return null;
}
