"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAllPurposeImages,
  type PurposeImageRecord,
} from "@/lib/purposeStorage";
import { useSettingsStore } from "@/store/useSettingsStore";

type Row = PurposeImageRecord;

const LIGHTBOX_MS = 220;

export function MotivationStrip() {
  const purposeMode = useSettingsStore((s) => s.purposeModeEnabled);
  const [rows, setRows] = useState<Row[]>([]);
  const [lightbox, setLightbox] = useState<Row | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setLightbox(null);
      closeTimerRef.current = null;
    }, LIGHTBOX_MS);
  }, []);

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

  useEffect(() => {
    if (!lightbox) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setLightboxVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, closeLightbox]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!purposeMode) return null;

  const hasPhotos = rows.length > 0;

  return (
    <section
      aria-labelledby="motivation-heading"
      className="overflow-hidden rounded-2xl border border-kal-border bg-kal-card px-5 py-5 kal-shadow-card sm:rounded-2xl sm:px-6 sm:py-6"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-3">
        <h2
          id="motivation-heading"
          className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-kal-accent sm:text-[0.65rem] sm:tracking-[0.28em]"
        >
          Capture your why
        </h2>
      </div>
      {!hasPhotos ? (
        <p className="text-center text-xs leading-relaxed text-kal-muted sm:text-sm">
          Add fuel in{" "}
          <Link
            href="/settings#purpose-fuel"
            className="font-medium text-kal-accent underline decoration-kal-accent/35 underline-offset-[3px] transition-colors hover:text-kal-accent-hover hover:decoration-kal-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-kal-card"
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
              className="w-[28%] min-w-[88px] shrink-0 overflow-hidden rounded-2xl border border-kal-border bg-kal-card-muted kal-shadow-card"
            >
              <button
                type="button"
                onClick={() => {
                  if (closeTimerRef.current) {
                    clearTimeout(closeTimerRef.current);
                    closeTimerRef.current = null;
                  }
                  setLightboxVisible(false);
                  setLightbox(r);
                }}
                className="block w-full cursor-zoom-in outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-kal-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-kal-card-muted"
                aria-label={`View ${r.label} larger`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.dataUrl}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              </button>
              <figcaption className="truncate border-t border-kal-border px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-kal-muted">
                {r.label}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.label}
        >
          <button
            type="button"
            aria-label="Close enlarged photo"
            className={`absolute inset-0 bg-black/65 transition-opacity duration-200 ease-out ${
              lightboxVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeLightbox}
          />
          <div
            className={`relative z-[201] flex max-h-[90vh] max-w-[min(90vw,56rem)] flex-col items-center transition-all duration-200 ease-out ${
              lightboxVisible
                ? "scale-100 opacity-100"
                : "scale-95 opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute -right-1 -top-1 z-[202] flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 bg-kal-card text-kal-text shadow-lg transition-colors hover:bg-kal-card-muted sm:right-0 sm:top-0 sm:translate-x-1/2 sm:-translate-y-1/2"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.dataUrl}
              alt={lightbox.label}
              className="max-h-[min(85vh,90dvh)] max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl ring-1 ring-black/5"
            />
            <p className="mt-3 max-w-full truncate text-center text-xs font-semibold uppercase tracking-wide text-white drop-shadow-sm sm:text-sm">
              {lightbox.label}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
