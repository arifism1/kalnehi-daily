"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PwaInstallPrompt = dynamic(
  () =>
    import("@/components/PwaInstallPrompt").then((m) => ({
      default: m.PwaInstallPrompt,
    })),
  { ssr: false },
);

export function PwaInstallPromptDeferred() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(() => setShow(true), { timeout: 3500 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return <PwaInstallPrompt />;
}
