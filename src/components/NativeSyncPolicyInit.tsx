"use client";

import { useEffect } from "react";

import { initNativeSyncPolicyListener } from "@/lib/nativeSyncPolicy";

/** Registers Capacitor network type listener for native sync gating. */
export function NativeSyncPolicyInit() {
  useEffect(() => {
    initNativeSyncPolicyListener();
  }, []);
  return null;
}
