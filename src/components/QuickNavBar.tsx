"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { getMainNavItemsInQuickNavOrder, navActive } from "@/config/mainNavigation";

/**
 * Single horizontal row of icon links, most-used routes first; scroll for the rest.
 */
export function QuickNavBar() {
  const pathname = usePathname();
  const items = useMemo(() => getMainNavItemsInQuickNavOrder(), []);

  return (
    <nav className="w-full" aria-label="Quick navigation">
      <div className="-mx-1 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 [scrollbar-width:thin] sm:-mx-0">
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
    </nav>
  );
}
