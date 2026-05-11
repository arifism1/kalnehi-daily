"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { KalnehiMark } from "@/components/KalnehiMark";

const EXAM_LINKS = [
  { href: "/jee", label: "JEE" },
  { href: "/neet", label: "NEET" },
  { href: "/upsc", label: "UPSC" },
  { href: "/cat", label: "CAT" },
  { href: "/gate", label: "GATE" },
  { href: "/ca-intermediate", label: "CA Inter" },
  { href: "/clat", label: "CLAT" },
  { href: "/cuet", label: "CUET" },
] as const;

const FEATURE_LINKS = [
  { href: "/features/prepbrain-ai", label: "Mastermind" },
  { href: "/features/syllabus-tracker", label: "Syllabus Tracker" },
  { href: "/features/spaced-revision", label: "Revision Tracker" },
  { href: "/features/voice-control", label: "Voice Control" },
  { href: "/features/marks-engine", label: "Marks Engine" },
  { href: "/features", label: "All features →" },
] as const;

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/tools", label: "Free Tools" },
] as const;

function NavFeaturesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Features
        <svg className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-kal-border bg-kal-card shadow-[0_16px_40px_-12px_rgba(0,0,0,0.2)] backdrop-blur-xl"
        >
          {FEATURE_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-kal-text transition-colors hover:bg-kal-accent-soft hover:text-kal-accent-dark"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [examsOpen, setExamsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const examsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 40);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!examsOpen) return;
    const handler = (e: MouseEvent) => {
      if (examsRef.current && !examsRef.current.contains(e.target as Node)) {
        setExamsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [examsOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  return (
    <>
      <header
        className={clsx(
          "fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] transition-all duration-300",
          scrolled
            ? "border-b border-kal-border bg-kal-card/90 shadow-[0_2px_8px_rgba(100,75,40,0.06)] backdrop-blur-xl dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Wordmark */}
          <Link
            href="/"
            aria-label="Kalnehi Daily — home"
            className="flex shrink-0 items-center rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
          >
            <KalnehiMark
              aria-hidden
              className="h-8 w-auto max-w-[7.5rem] object-contain object-left sm:h-9"
            />
          </Link>

          {/* Center nav — desktop */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {/* Exams dropdown */}
            <div className="relative" ref={examsRef}>
              <button
                type="button"
                id="landing-exams-trigger"
                onClick={() => setExamsOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text"
                aria-expanded={examsOpen}
                aria-controls="landing-exams-menu"
                aria-haspopup="menu"
              >
                Exams
                <svg
                  className={clsx("h-3.5 w-3.5 transition-transform", examsOpen && "rotate-180")}
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {examsOpen && (
                <div
                  id="landing-exams-menu"
                  role="menu"
                  aria-labelledby="landing-exams-trigger"
                  className="absolute left-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-kal-border bg-kal-card shadow-[0_16px_40px_-12px_rgba(0,0,0,0.2)] backdrop-blur-xl"
                >
                  {EXAM_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      onClick={() => setExamsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-kal-text transition-colors hover:bg-kal-accent-soft hover:text-kal-accent-dark"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/50" aria-hidden />
                      {label}
                    </Link>
                  ))}
                  <Link
                    href="/jee-study-planner"
                    role="menuitem"
                    onClick={() => setExamsOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-kal-accent-dark transition-colors hover:bg-kal-accent-soft border-t border-kal-border"
                  >
                    See all exams →
                  </Link>
                </div>
              )}
            </div>

            {/* Features dropdown */}
            <NavFeaturesDropdown />

            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/auth"
              className="hidden text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent px-5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105 active:scale-[0.99]"
            >
              <span className="hidden sm:inline">Start free — 7 days on us</span>
              <span className="sm:hidden">Start free</span>
            </Link>

            {/* Hamburger — mobile */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-kal-border bg-kal-card/70 text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="border-t border-kal-border bg-kal-card/95 backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-kal-text transition-colors hover:bg-kal-accent-soft hover:text-kal-accent-dark"
                  >
                    {label}
                  </Link>
                ))}
                <div className="mt-1 border-t border-kal-border pt-1">
                  <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                    Exams
                  </p>
                  {EXAM_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-kal-text transition-colors hover:bg-kal-accent-soft hover:text-kal-accent-dark flex items-center gap-2.5"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/50" aria-hidden />
                      {label}
                    </Link>
                  ))}
                </div>
                <div className="mt-1 border-t border-kal-border pt-1">
                  <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                    Features
                  </p>
                  {FEATURE_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-kal-text transition-colors hover:bg-kal-accent-soft hover:text-kal-accent-dark flex items-center gap-2.5"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-2 pt-2">
                  <Link
                    href="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border text-sm font-semibold text-kal-text"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-full bg-kal-accent text-sm font-bold text-white"
                  >
                    Start free — 7 days on us
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

    </>
  );
}
