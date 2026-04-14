"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/guides", label: "Guides" },
  { href: "/best-study-practices", label: "Best Study Practices" },
  { href: "/what-can-kalnehi-do", label: "What Can Kalnehi Do?" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <nav className="relative flex items-center gap-2 text-sm" ref={menuRef}>
      {/* Inline "Guides" link — visible on wider screens */}
      <Link
        href="/guides"
        className="hidden rounded-lg px-2 py-1.5 text-kal-text-secondary hover:text-kal-text sm:inline-flex"
      >
        Guides
      </Link>
      <Link
        href="/what-can-kalnehi-do"
        className="hidden max-w-[10.5rem] truncate rounded-lg px-2 py-1.5 text-xs font-medium text-kal-text-secondary hover:text-kal-text md:inline-flex lg:max-w-none lg:text-sm"
        title="What Can Kalnehi Do?"
      >
        What Can Kalnehi Do?
      </Link>
      <Link
        href="/best-study-practices"
        className="hidden max-w-[9rem] truncate rounded-lg px-2 py-1.5 text-xs font-medium text-kal-text-secondary hover:text-kal-text md:inline-flex lg:max-w-none lg:text-sm"
        title="Best Study Practices"
      >
        Best Study Practices
      </Link>

      {/* Hamburger toggle */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="marketing-nav-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-kal-border bg-kal-card/70 text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/50"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Get started CTA */}
      <Link
        href="/auth"
        className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-kal-accent px-4 text-sm font-bold text-kal-accent-foreground transition hover:brightness-105 active:scale-[0.99]"
      >
        Get started
      </Link>

      {/* Dropdown menu
          Mobile: fixed, full-width with side margins, just below the header (top-14 = 56px).
          sm+: absolute, right-aligned, fixed width. */}
      {open && (
        <div
          id="marketing-nav-menu"
          role="menu"
          className="fixed left-3 right-3 top-14 z-50 overflow-hidden rounded-2xl border border-kal-border bg-kal-card shadow-[0_16px_48px_-12px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.2)]"
        >
          <ul className="py-1.5">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <li key={href} role="none">
                  <Link
                    href={href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`flex w-full items-center gap-2.5 px-4 py-3.5 text-[0.9rem] leading-snug transition active:bg-kal-accent/10 sm:py-3 sm:text-sm ${
                      active
                        ? "font-semibold text-kal-accent"
                        : "font-medium text-kal-text"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                        active ? "bg-kal-accent" : "bg-kal-border"
                      }`}
                      aria-hidden
                    />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-kal-border px-4 py-3">
            <Link
              href="/auth"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-kal-accent px-4 text-sm font-bold text-kal-accent-foreground transition hover:brightness-105 active:scale-[0.99]"
            >
              Start your 3-day trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
