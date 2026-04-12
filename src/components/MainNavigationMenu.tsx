"use client";

import clsx from "clsx";
import { Download, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { PwaIosInstallModal } from "@/components/PwaIosInstallModal";
import { MAIN_NAV_SECTIONS, navActive } from "@/config/mainNavigation";
import { isStandalonePwa, usePwaInstall } from "@/hooks/usePwaInstall";

type MainNavigationMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MainNavigationMenu({ open, onClose }: MainNavigationMenuProps) {
  const pathname = usePathname();
  const { showInstallButton, canPromptInstall, needsIosInstallModal, promptInstall } =
    usePwaInstall();
  const [installBusy, setInstallBusy] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open && !iosInstallOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (iosInstallOpen) setIosInstallOpen(false);
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, iosInstallOpen, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className={clsx(
        "fixed inset-0 z-[55] transition-[visibility] duration-200",
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
        onClick={onClose}
      />
      <div
        className={clsx(
          "absolute bottom-0 right-0 top-0 flex h-full w-[min(92vw,24rem)] max-w-md flex-col overflow-hidden rounded-l-[1.25rem] border border-white/20 border-r-0 bg-white/80 backdrop-blur-xl transition-transform duration-200 ease-out dark:border-white/10 dark:bg-zinc-950/85 sm:w-[min(80vw,24rem)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-white/20 px-3 py-2.5 backdrop-blur-sm sm:px-4 dark:border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kal-accent-soft text-kal-accent">
            <Menu className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-kal-accent">
              Navigate
            </p>
            <p className="text-sm font-semibold leading-tight text-kal-text sm:text-[15px]">
              Kalnehi Daily
            </p>
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-2"
          aria-label="Main"
        >
          <ul className="space-y-px">
            {MAIN_NAV_SECTIONS.map((section, sectionIndex) => (
              <Fragment key={section.title}>
                <li
                  className={clsx(
                    "list-none px-2.5 pb-0.5 pt-1.5",
                    sectionIndex > 0 && "mt-2.5 sm:mt-3",
                  )}
                >
                  <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-kal-muted">
                    {section.title}
                  </p>
                </li>
                {section.items.map(({ href, label, Icon, isActive }) => {
                  const active = isActive
                    ? isActive(pathname)
                    : navActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className={clsx(
                          "flex min-h-[44px] items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors sm:gap-3",
                          active
                            ? "bg-kal-accent-soft ring-1 ring-kal-accent/25"
                            : "hover:bg-kal-card-muted active:bg-kal-card-muted",
                        )}
                      >
                        <span
                          className={clsx(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
                            active
                              ? "bg-kal-accent/20 text-kal-accent-dark dark:text-kal-accent"
                              : "bg-kal-card-muted text-kal-muted",
                          )}
                        >
                          <Icon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-kal-text">
                          {label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </Fragment>
            ))}

            {showInstallButton ? (
              <li className="pt-2">
                <div className="rounded-xl border border-kal-accent/40 bg-kal-accent-soft px-2.5 py-3 sm:px-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kal-accent/25 text-kal-accent-dark dark:text-kal-accent">
                      <Download className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-kal-text sm:text-[15px]">
                        Kalnehi on your home screen
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-kal-muted">
                        Launch in one tap — same calm experience, full screen.
                      </p>
                      <button
                        type="button"
                        disabled={installBusy}
                        onClick={async () => {
                          if (canPromptInstall) {
                            setInstallBusy(true);
                            await promptInstall();
                            setInstallBusy(false);
                            if (isStandalonePwa()) onClose();
                            return;
                          }
                          if (needsIosInstallModal) {
                            setIosInstallOpen(true);
                          }
                        }}
                        className="mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-kal-accent-hover active:scale-[0.99] disabled:opacity-50 motion-reduce:active:scale-100"
                      >
                        <Download className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.5} />
                        {installBusy ? "Opening…" : "Install App"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
      <PwaIosInstallModal
        open={iosInstallOpen}
        onClose={() => setIosInstallOpen(false)}
      />
    </div>
  );
}
