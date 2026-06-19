"use client";

import clsx from "clsx";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FIZAKI_NAV_LINKS } from "@/components/fizaki/landing/copy";
import { fizakiConfig } from "@/verticals/fizaki.config";

function scrollToDemo() {
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
}

export function FizakiLandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
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

  return (
    <header
      className={clsx(
        "fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] transition-all duration-300",
        scrolled
          ? "border-b border-kal-border bg-kal-card/90 shadow-sm backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${fizakiConfig.brand.productName} — home`}
          className="flex shrink-0 flex-col rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
        >
          <span className="text-lg font-bold tracking-tight text-kal-accent">
            {fizakiConfig.brand.shortName}
          </span>
          <span className="hidden text-[10px] font-medium text-kal-muted sm:block">
            {fizakiConfig.brand.tagline}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {FIZAKI_NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/auth"
            className="hidden text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text sm:inline-flex"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={scrollToDemo}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent px-5 text-sm font-bold text-kal-accent-foreground shadow-[0_4px_16px_rgba(59,77,219,0.28)] transition hover:brightness-105 active:scale-[0.99]"
          >
            Book a demo
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="inline-flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-kal-border bg-kal-card/70 text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-kal-border bg-kal-card/95 backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto max-w-7xl p-4 sm:px-6">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {FIZAKI_NAV_LINKS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-kal-text transition-colors hover:bg-kal-accent-soft hover:text-kal-accent-dark"
                >
                  {label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 pt-2">
                <Link
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border text-sm font-semibold text-kal-text"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    scrollToDemo();
                  }}
                  className="flex min-h-[44px] items-center justify-center rounded-full bg-kal-accent text-sm font-bold text-kal-accent-foreground"
                >
                  Book a demo
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
