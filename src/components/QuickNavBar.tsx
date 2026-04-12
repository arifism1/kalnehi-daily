"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { getMainNavItemsInQuickNavOrder, navActive } from "@/config/mainNavigation";

type EdgeHints = { left: boolean; right: boolean };

/**
 * Single horizontal row of icon links, most-used routes first; scroll for the rest.
 */
export function QuickNavBar() {
  const pathname = usePathname();
  const items = useMemo(() => getMainNavItemsInQuickNavOrder(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edgeHints, setEdgeHints] = useState<EdgeHints>({ left: false, right: false });

  const updateEdgeHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const scrollable = maxScroll > 1;
    if (!scrollable) {
      setEdgeHints({ left: false, right: false });
      return;
    }
    const { scrollLeft } = el;
    setEdgeHints({
      left: scrollLeft > 2,
      right: scrollLeft < maxScroll - 2,
    });
  }, []);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => updateEdgeHints());
    return () => cancelAnimationFrame(id);
  }, [pathname, updateEdgeHints]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateEdgeHints());
    ro.observe(el);
    el.addEventListener("scroll", updateEdgeHints, { passive: true });
    window.addEventListener("resize", updateEdgeHints);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateEdgeHints);
      window.removeEventListener("resize", updateEdgeHints);
    };
  }, [updateEdgeHints]);

  return (
    <nav className="mx-auto min-w-0 w-max max-w-full" aria-label="Quick navigation">
      <div className="relative -mx-1 min-w-0 sm:-mx-0">
        <div
          ref={scrollRef}
          className="min-h-0 min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex flex-nowrap items-center gap-1.5 px-1 pb-0.5 sm:gap-2 sm:px-0">
            {items.map((item) => {
              const active = item.isActive
                ? item.isActive(pathname)
                : navActive(pathname, item.href);
              const { Icon } = item;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={clsx(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-colors sm:h-9 sm:w-9",
                    active
                      ? "border-kal-accent/35 bg-kal-accent-soft text-kal-accent shadow-sm ring-1 ring-kal-accent/25"
                      : "border-white/35 bg-white/50 text-kal-text-secondary hover:border-kal-accent/25 hover:bg-white/70 hover:text-kal-text dark:border-white/12 dark:bg-zinc-900/55 dark:hover:border-kal-accent/30 dark:hover:bg-zinc-900/75",
                  )}
                >
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
        <div
          className={clsx(
            "pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-white/50 to-transparent transition-opacity duration-200 dark:from-zinc-950/55 sm:w-7",
            edgeHints.left ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
        <div
          className={clsx(
            "pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-white/50 to-transparent transition-opacity duration-200 dark:from-zinc-950/55 sm:w-7",
            edgeHints.right ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
      </div>
    </nav>
  );
}
