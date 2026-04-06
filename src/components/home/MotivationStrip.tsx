"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getAllPurposeImages,
  type PurposeImageRecord,
} from "@/lib/purposeStorage";
import { useSettingsStore } from "@/store/useSettingsStore";

type Row = PurposeImageRecord;

export function MotivationStrip() {
  const purposeMode = useSettingsStore((s) => s.purposeModeEnabled);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!purposeMode) return;
    let cancelled = false;
    void getAllPurposeImages().then((list) => {
      if (!cancelled) setRows(list);
    });
    const onChange = () => {
      void getAllPurposeImages().then((list) => setRows(list));
    };
    window.addEventListener("kalnehi-purpose-images-changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("kalnehi-purpose-images-changed", onChange);
    };
  }, [purposeMode]);

  if (!purposeMode) return null;

  const hasPhotos = rows.length > 0;

  return (
    <section
      aria-labelledby="motivation-heading"
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/35 px-3 py-4 shadow-lg shadow-black/25 backdrop-blur-md sm:rounded-3xl sm:px-5 sm:py-5"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-3">
        <h2
          id="motivation-heading"
          className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-emerald-400/85 sm:text-[0.65rem] sm:tracking-[0.28em]"
        >
          Capture your why
        </h2>
      </div>
      {!hasPhotos ? (
        <p className="text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
          Add fuel in{" "}
          <Link
            href="/settings#purpose-fuel"
            className="font-medium text-emerald-400/90 underline decoration-emerald-500/35 underline-offset-[3px] transition-colors hover:text-emerald-300 hover:decoration-emerald-400/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Settings
          </Link>{" "}
          — master the reason you execute
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rows.map((r) => (
            <figure
              key={r.slot}
              className="w-[28%] min-w-[88px] shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/80 shadow-inner"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.dataUrl}
                alt={r.label}
                className="aspect-square w-full object-cover"
              />
              <figcaption className="truncate border-t border-white/[0.06] px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {r.label}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
