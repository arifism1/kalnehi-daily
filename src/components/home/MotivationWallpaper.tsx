"use client";

import { useEffect, useState } from "react";

import { getMotivationBundleCached } from "@/lib/motivationLocal";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Soft motivational backdrop on the home dashboard when a vision photo is set as wallpaper.
 */
export function MotivationWallpaper() {
  const userId = useAuthStore((s) => s.user?.id);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSrc(null);
      return;
    }
    const load = async () => {
      const bundle = await getMotivationBundleCached(userId);
      const wid = bundle?.prefs?.wallpaper_photo_id;
      if (!wid) {
        setSrc(null);
        return;
      }
      const photo = bundle?.photos.find((p) => p.id === wid);
      setSrc(photo?.image_data_url ?? null);
    };
    void load();
    const onChange = () => void load();
    window.addEventListener("kalnehi-motivation-changed", onChange);
    return () => window.removeEventListener("kalnehi-motivation-changed", onChange);
  }, [userId]);

  if (!src) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-14 z-0 h-[min(42vh,22rem)] opacity-[0.14] sm:top-[3.5rem]"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-kal-page via-kal-page/85 to-kal-page" />
    </div>
  );
}
