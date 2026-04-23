"use client";

import { useEffect } from "react";

import { captureReferralParams } from "@/lib/referral-capture";

/** Captures ref= and UTM params from Instagram/ManyChat magic links on every page load. */
export function ReferralCapture() {
  useEffect(() => {
    captureReferralParams();
  }, []);
  return null;
}
