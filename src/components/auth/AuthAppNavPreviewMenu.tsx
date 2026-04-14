"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { Bell, LockKeyhole, Menu } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { MAIN_NAV_SECTIONS } from "@/config/mainNavigation";
import { SITE_NAME } from "@/lib/seo-metadata";

/**
 * Auth-only preview of the signed-in main menu: same sections and labels as
 * {@link MAIN_NAV_SECTIONS}, plus the header “Alerts” shortcut. Rows are
 * non-navigable and show a lock affordance.
 */
export function AuthAppNavPreviewMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-kal-border/80 bg-kal-card/95 text-kal-text-secondary shadow-sm backdrop-blur-md transition-colors hover:border-kal-accent/35 hover:bg-kal-card hover:text-kal-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40 sm:right-6"
        aria-expanded={open}
        aria-controls="auth-app-nav-preview-panel"
        aria-label="Preview app navigation (sign in to use)"
      >
        <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>

      <div
        id="auth-app-nav-preview-panel"
        role="dialog"
        aria-modal="true"
        aria-label="App navigation preview"
        className={clsx(
          "fixed inset-0 z-[60] transition-[visibility] duration-200",
          open ? "visible" : "invisible delay-200",
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={clsx(
            "absolute inset-0 bg-[var(--kal-overlay)] transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={clsx(
            "absolute bottom-0 right-0 top-0 flex h-full w-[min(92vw,24rem)] max-w-md flex-col overflow-hidden rounded-l-[1.25rem] border border-white/20 border-r-0 bg-white/80 backdrop-blur-xl transition-transform duration-200 ease-out dark:border-white/10 dark:bg-zinc-950/85 sm:w-[min(80vw,24rem)]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex shrink-0 items-center gap-2.5 border-b border-white/20 px-3 py-2.5 backdrop-blur-sm sm:px-4 dark:border-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kal-accent-soft text-kal-accent">
              <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-kal-accent-dark">
                Inside the app
              </p>
              <p className="text-xs font-semibold leading-snug text-kal-text sm:text-[13px] sm:leading-tight">
                {SITE_NAME}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-kal-muted">
                Preview only — sign in to open these screens.
              </p>
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-kal-border/50 bg-kal-card-muted/90 text-kal-muted"
              title="Locked until you sign in"
              aria-hidden
            >
              <LockKeyhole className="h-4 w-4" strokeWidth={2.25} />
            </span>
          </div>

          <nav
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-2"
            aria-label="App areas after sign-in (preview)"
          >
            <ul className="space-y-px">
              <li className="list-none px-2.5 pb-0.5 pt-1.5">
                <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-kal-muted">
                  Header
                </p>
              </li>
              <li>
                <LockedNavRow label="Notifications (Alerts)" Icon={Bell} />
              </li>

              {MAIN_NAV_SECTIONS.map((section, sectionIndex) => (
                <Fragment key={section.title}>
                  <li
                    className={clsx(
                      "list-none px-2.5 pb-0.5",
                      sectionIndex === 0 ? "pt-3 sm:pt-3.5" : "pt-1.5",
                      sectionIndex > 0 && "mt-2.5 sm:mt-3",
                    )}
                  >
                    <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-kal-muted">
                      {section.title}
                    </p>
                  </li>
                  {section.items.map(({ href, label, Icon, menuAction }) => (
                    <li key={menuAction === "contact-support" ? "contact-support" : href}>
                      <LockedNavRow label={label} Icon={Icon} />
                    </li>
                  ))}
                </Fragment>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

function LockedNavRow({ label, Icon }: { label: string; Icon: LucideIcon }) {
  return (
    <button
      type="button"
      disabled
      className="flex w-full min-h-[44px] cursor-not-allowed items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left opacity-[0.92] sm:gap-3"
      aria-disabled="true"
      title="Sign in to use this"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kal-card-muted text-kal-muted sm:h-10 sm:w-10">
        <Icon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-kal-text">
        {label}
      </span>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-gradient-to-br from-amber-500/12 to-amber-600/5 text-amber-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-amber-400/20 dark:from-amber-400/15 dark:to-amber-500/5 dark:text-amber-100/85"
        aria-hidden
      >
        <LockKeyhole className="h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={2.35} />
      </span>
    </button>
  );
}
