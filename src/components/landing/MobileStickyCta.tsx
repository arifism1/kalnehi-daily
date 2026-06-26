"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Bottom-pinned CTA for mobile only. Appears once the user scrolls past the
 * hero so it never doubles up with the hero's own primary button.
 */
export function MobileStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("[data-hero-section]");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "0px 0px -85% 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 transition-transform duration-300 lg:hidden"
      style={{
        transform: visible ? "translateY(0)" : "translateY(100%)",
        background: "linear-gradient(to top, var(--kal-page) 60%, transparent)",
      }}
      aria-hidden={!visible}
    >
      <Link
        href="/auth"
        tabIndex={visible ? 0 : -1}
        className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-kal-accent text-base font-bold text-white shadow-[0_4px_20px_rgba(255,122,0,0.35)] transition active:scale-[0.99]"
      >
        Start free — 7 days on us
      </Link>
    </div>
  );
}
