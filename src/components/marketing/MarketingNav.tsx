"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Menu, X } from "lucide-react";

import { PwaIosInstallModal } from "@/components/PwaIosInstallModal";
import { isStandalonePwa, usePwaInstall } from "@/hooks/usePwaInstall";
import { SITE_NAME } from "@/lib/seo-metadata";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/kalnehi-daily", label: "Overview" },
  { href: "/guides", label: "Guides" },
  { href: "/best-study-practices", label: "Best Study Practices" },
  { href: "/what-can-kalnehi-do", label: "What Can Kalnehi Do?" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const { installed, canPromptInstall, needsIosInstallModal, promptInstall, iosDevice } =
    usePwaInstall();
  const [installBusy, setInstallBusy] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const installUnsupported = !installed && !canPromptInstall && !iosDevice;
  const showInstallButton = installed || canPromptInstall || needsIosInstallModal;

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
    <nav
      className="relative flex shrink-0 items-center gap-3 text-sm sm:gap-4"
      ref={menuRef}
    >
      {/* Inline "Home" + "Guides" — visible on wider screens */}
      <Link
        href="/"
        className="hidden whitespace-nowrap rounded-lg px-2.5 py-1.5 text-kal-text-secondary hover:text-kal-text sm:inline-flex"
      >
        Home
      </Link>
      <Link
        href="/guides"
        className="hidden whitespace-nowrap rounded-lg px-2.5 py-1.5 text-kal-text-secondary hover:text-kal-text sm:inline-flex"
      >
        Guides
      </Link>
      <Link
        href="/what-can-kalnehi-do"
        className="hidden whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-kal-text-secondary hover:text-kal-text lg:inline-flex"
        title="What Can Kalnehi Do?"
      >
        What Can Kalnehi Do?
      </Link>
      <Link
        href="/best-study-practices"
        className="hidden whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-kal-text-secondary hover:text-kal-text lg:inline-flex"
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
          className="fixed left-3 right-3 top-14 z-50 overflow-hidden rounded-2xl border border-kal-border bg-kal-card shadow-[0_16px_48px_-12px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.2)]"
        >
          <div className="border-b border-kal-border px-4 pb-2 pt-3">
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-kal-accent-dark">
              Navigate
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-kal-text sm:text-[13px] sm:leading-tight">
              {SITE_NAME}
            </p>
          </div>
          <div className="border-b border-kal-border px-4 pb-3 pt-2">
            {showInstallButton ? (
              <button
                type="button"
                disabled={installBusy || installed}
                onClick={async () => {
                  if (canPromptInstall) {
                    setInstallBusy(true);
                    await promptInstall();
                    setInstallBusy(false);
                    if (isStandalonePwa()) setOpen(false);
                    return;
                  }
                  if (needsIosInstallModal) {
                    setIosInstallOpen(true);
                  }
                }}
                className={clsx(
                  "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.99] motion-reduce:active:scale-100",
                  installed
                    ? "cursor-default border border-kal-border/70 bg-kal-card-muted text-kal-muted opacity-90 shadow-none"
                    : "border border-kal-accent/25 bg-kal-accent-soft/90 text-kal-accent-dark shadow-sm hover:border-kal-accent/40 hover:bg-kal-accent-soft",
                )}
              >
                {installed ? (
                  <CheckCircle2 className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2.35} />
                ) : (
                  <Download className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2.35} />
                )}
                {installed
                  ? "App Installed"
                  : installBusy
                    ? "Opening..."
                    : canPromptInstall
                      ? "Install App"
                      : "Add to Home Screen"}
              </button>
            ) : installUnsupported ? (
              <p className="rounded-xl border border-kal-border/80 bg-kal-card-muted px-3 py-2 text-center text-xs text-kal-muted">
                Install not supported in this browser.
              </p>
            ) : null}
          </div>
          <ul className="py-1.5" role="menu" aria-label="Site pages">
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
              Start your free trial
            </Link>
          </div>
        </div>
      )}
      <PwaIosInstallModal
        open={iosInstallOpen}
        onClose={() => setIosInstallOpen(false)}
      />
    </nav>
  );
}
