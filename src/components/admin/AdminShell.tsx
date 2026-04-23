"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { label: "Batches", href: "/admin/batches" },
  { label: "Config", href: "/admin/config" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-kal-page text-kal-text">
      <header className="border-b border-kal-border bg-kal-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-kal-accent">
              Admin
            </span>
            <span className="text-kal-border">·</span>
            <span className="text-sm font-semibold text-kal-text">Kalnehi Daily</span>
          </div>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-kal-accent/10 text-kal-accent"
                    : "text-kal-text-secondary hover:bg-kal-card hover:text-kal-text",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/home" className="text-xs text-kal-muted hover:text-kal-text">
            ← App
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
