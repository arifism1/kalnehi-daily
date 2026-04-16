"use client";

import clsx from "clsx";
import { ArrowDown, CheckCircle2, Menu, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";

import { PwaIosInstallModal } from "@/components/PwaIosInstallModal";
import { ContactSupportModal } from "@/components/support/ContactSupportModal";
import { ContactSupportSuccessToast } from "@/components/support/ContactSupportSuccessToast";
import { filterNavByEnabledFeatures, MAIN_NAV_SECTIONS, navActive } from "@/config/mainNavigation";
import { isStandalonePwa, usePwaInstall } from "@/hooks/usePwaInstall";
import { SITE_NAME } from "@/lib/seo-metadata";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";

type MainNavigationMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MainNavigationMenu({ open, onClose }: MainNavigationMenuProps) {
  const pathname = usePathname();
  const enabledFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);
  const navSections = filterNavByEnabledFeatures(MAIN_NAV_SECTIONS, enabledFeatures);
  const {
    installed,
    canPromptInstall,
    needsIosInstallModal,
    promptInstall,
    iosDevice,
  } = usePwaInstall();
  const [installBusy, setInstallBusy] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const installUnsupported = !installed && !canPromptInstall && !iosDevice;
  const showInstallRow = installed || canPromptInstall || needsIosInstallModal;

  const openContactFromMenu = useCallback(() => {
    onClose();
    setContactOpen(true);
  }, [onClose]);

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

  useEffect(() => {
    if (!contactSuccess) return;
    const t = window.setTimeout(() => setContactSuccess(null), 5_000);
    return () => window.clearTimeout(t);
  }, [contactSuccess]);

  return (
    <>
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
          "absolute bottom-0 right-0 top-0 flex h-full w-[min(92vw,24rem)] max-w-md flex-col overflow-hidden rounded-l-[1.25rem] border border-white/30 border-r-0 backdrop-blur-2xl transition-transform duration-200 ease-out dark:border-white/10 sm:w-[min(80vw,24rem)]",
          "bg-[rgba(255,252,248,0.93)] dark:bg-[rgba(25,18,10,0.92)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="shrink-0 border-b backdrop-blur-sm" style={{ borderColor: "var(--kal-border)" }}>
          <div className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kal-accent-soft text-kal-accent">
              <Menu className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-kal-accent-dark">
                Navigate
              </p>
              <p className="text-xs font-semibold leading-snug text-kal-text sm:text-[13px] sm:leading-tight">
                {SITE_NAME}
              </p>
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4">
            {showInstallRow ? (
              <button
                type="button"
                disabled={installBusy || installed}
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
                className={clsx(
                  "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition active:scale-[0.99] motion-reduce:active:scale-100",
                  installed
                    ? "cursor-not-allowed border border-kal-border/60 bg-kal-card-muted/80 font-medium text-kal-muted opacity-80 shadow-none dark:border-white/10 dark:bg-white/[0.06]"
                    : "border border-kal-accent/35 bg-kal-accent-soft font-semibold text-kal-accent-dark shadow-sm ring-1 ring-kal-accent/10 hover:border-kal-accent/50 hover:bg-[color-mix(in_srgb,var(--kal-accent-soft)_92%,var(--kal-accent))] hover:ring-kal-accent/20 dark:border-kal-accent/30 dark:bg-kal-accent-soft/15 dark:text-kal-accent dark:ring-white/5 dark:hover:bg-kal-accent-soft/25 dark:hover:border-kal-accent/45",
                )}
              >
                {installed ? (
                  <CheckCircle2
                    className="h-[1.125rem] w-[1.125rem] shrink-0 text-kal-muted"
                    strokeWidth={2.35}
                  />
                ) : needsIosInstallModal ? (
                  <Smartphone className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2.35} />
                ) : (
                  <ArrowDown className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2.5} />
                )}
                {installed ? (
                  <span className="font-bold tracking-tight">App Installed</span>
                ) : installBusy ? (
                  <span>Installing…</span>
                ) : canPromptInstall ? (
                  <span>Install App in One Click</span>
                ) : (
                  <span>Install App to Home Screen</span>
                )}
              </button>
            ) : installUnsupported ? (
              <p className="rounded-xl border border-kal-border/80 bg-white/40 px-3 py-2 text-center text-xs text-kal-muted dark:border-white/10 dark:bg-white/5">
                Install not supported in this browser.
              </p>
            ) : null}
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-2"
          aria-label="Main"
        >
          <ul className="space-y-px">
            {navSections.map((section, sectionIndex) => (
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
                {section.items.map(
                  ({ href, label, Icon, isActive, menuAction }) => {
                    if (menuAction === "contact-support") {
                      return (
                        <li key="contact-support">
                          <button
                            type="button"
                            onClick={openContactFromMenu}
                            className="flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-kal-card-muted active:bg-kal-card-muted sm:gap-3"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kal-card-muted text-kal-muted sm:h-10 sm:w-10">
                              <Icon
                                className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
                                strokeWidth={2}
                              />
                            </span>
                            <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-kal-text">
                              {label}
                            </span>
                          </button>
                        </li>
                      );
                    }
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
                            <Icon
                              className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
                              strokeWidth={2}
                            />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-kal-text">
                            {label}
                          </span>
                        </Link>
                      </li>
                    );
                  },
                )}
              </Fragment>
            ))}

          </ul>
        </nav>
      </div>
    </div>
    <PwaIosInstallModal
      open={iosInstallOpen}
      onClose={() => setIosInstallOpen(false)}
    />
    <ContactSupportModal
      open={contactOpen}
      onClose={() => setContactOpen(false)}
      onSent={() => setContactSuccess("Message sent — we'll reply soon.")}
    />
    <ContactSupportSuccessToast
      message={contactSuccess}
      onDismiss={() => setContactSuccess(null)}
    />
    </>
  );
}
