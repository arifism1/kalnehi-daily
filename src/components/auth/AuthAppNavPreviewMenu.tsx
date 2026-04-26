"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { Bell, CheckCircle2, Download, LockKeyhole, Menu } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { PwaIosInstallModal } from "@/components/PwaIosInstallModal";
import { MAIN_NAV_SECTIONS } from "@/config/mainNavigation";
import { isStandalonePwa, usePwaInstall } from "@/hooks/usePwaInstall";
import { SITE_NAME } from "@/lib/seo-metadata";

/**
 * Auth-only preview of the signed-in main menu: same sections and labels as
 * {@link MAIN_NAV_SECTIONS}, plus the header “Alerts” shortcut. Rows are
 * non-navigable and show a lock affordance.
 */
export function AuthAppNavPreviewMenu() {
  const [open, setOpen] = useState(false);
  const { installed, canPromptInstall, needsIosInstallModal, promptInstall, iosDevice } =
    usePwaInstall();
  const [installBusy, setInstallBusy] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const installUnsupported = !installed && !canPromptInstall && !iosDevice;
  const showInstallCard = installed || canPromptInstall || needsIosInstallModal;

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
          <div className="flex shrink-0 items-center gap-2.5 border-b border-white/20 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-4 dark:border-white/10">
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
          <div className="border-b border-white/20 px-3 py-3 backdrop-blur-sm sm:px-4 dark:border-white/10">
            {showInstallCard ? (
              <div className="rounded-xl border border-kal-accent/35 bg-kal-accent-soft px-2.5 py-3 sm:px-3">
                <div className="flex items-start gap-2.5">
                  <span
                    className={clsx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      installed
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-kal-accent/25 text-kal-accent-dark dark:text-kal-accent",
                    )}
                  >
                    {installed ? (
                      <CheckCircle2 className="h-5 w-5" strokeWidth={2.25} />
                    ) : (
                      <Download className="h-5 w-5" strokeWidth={2.25} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-kal-text sm:text-[15px]">
                      {installed ? "App installed" : "Install Kalnehi Daily"}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-kal-muted">
                      {installed
                        ? "Already running as an installed app."
                        : "Pin it to your home screen for one-tap launch."}
                    </p>
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
                        "mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-colors active:scale-[0.99] motion-reduce:active:scale-100",
                        installed
                          ? "cursor-default border border-kal-border bg-white/70 text-kal-muted shadow-none"
                          : "bg-kal-accent text-white hover:bg-kal-accent-hover",
                      )}
                    >
                      {installed ? (
                        <CheckCircle2 className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.5} />
                      ) : (
                        <Download className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.5} />
                      )}
                      {installed
                        ? "App Installed"
                        : installBusy
                          ? "Opening..."
                          : canPromptInstall
                            ? "Install App"
                            : "Add to Home Screen"}
                    </button>
                  </div>
                </div>
              </div>
            ) : installUnsupported ? (
              <p className="rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-xs text-kal-muted">
                Install not supported in this browser.
              </p>
            ) : null}
          </div>

          <nav
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-2"
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
        <PwaIosInstallModal
          open={iosInstallOpen}
          onClose={() => setIosInstallOpen(false)}
        />
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
