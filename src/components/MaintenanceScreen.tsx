"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Props = {
  title: string;
  message: string;
  eta: string | null;
};

export function MaintenanceScreen({ title, message, eta }: Props) {
  const [status, setStatus] = useState<"idle" | "checking" | "back" | "still-offline">("idle");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleRefresh = useCallback(async () => {
    if (cooldown > 0 || status === "checking") return;
    setStatus("checking");
    setCooldown(10);
    try {
      const res = await fetch("/api/app-status", { cache: "no-store" });
      const json = await res.json();
      if (json?.app_enabled === true) {
        setStatus("back");
        setTimeout(() => window.location.reload(), 400);
      } else {
        setStatus("still-offline");
      }
    } catch {
      setStatus("still-offline");
    }
  }, [cooldown, status]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-kal-page px-6 py-16 text-center">
      <div className="flex max-w-sm flex-col items-center gap-6">
        {/* Logo */}
        <Image
          src="/icon-192x192.png"
          alt="Kalnehi Daily"
          width={56}
          height={56}
          className="rounded-2xl opacity-90"
          priority
        />

        {/* Title */}
        <h1 className="font-serif text-3xl font-normal text-kal-text">{title}</h1>

        {/* Message */}
        <p className="text-base leading-relaxed text-kal-text-secondary">{message}</p>

        {/* ETA */}
        {eta && (
          <p className="text-sm text-kal-muted">
            Expected back: {eta}
          </p>
        )}

        {/* Divider */}
        <div className="h-px w-24 bg-kal-border" />

        {/* Refresh button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={cooldown > 0 || status === "checking" || status === "back"}
            className="rounded-xl border border-kal-border-strong bg-transparent px-6 py-2.5 text-sm font-medium text-kal-text transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "checking"
              ? "Checking…"
              : status === "back"
                ? "Back online — reloading…"
                : cooldown > 0
                  ? `Refresh (${cooldown}s)`
                  : "Refresh"}
          </button>

          {status === "still-offline" && (
            <p className="text-xs text-kal-muted">Still offline — we&apos;ll be back soon.</p>
          )}
        </div>

        {/* Social note */}
        <p className="text-xs text-kal-muted">
          Follow{" "}
          <a
            href="https://instagram.com/kalnehi"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-kal-text"
          >
            @kalnehi
          </a>{" "}
          on Instagram for updates.
        </p>

        {/* Tagline */}
        <p className="text-[11px] tracking-wide text-kal-muted/60">Win Daily.</p>
      </div>
    </div>
  );
}
