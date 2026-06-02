"use client";

import clsx from "clsx";
import { ArrowDown, CheckCircle2, ChevronDown, Menu, Share2, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PwaIosInstallModal } from "@/components/PwaIosInstallModal";
import { PwaUpdateCallout } from "@/components/pwa/PwaUpdateCallout";
import { ContactSupportSuccessToast } from "@/components/support/ContactSupportSuccessToast";
import { useContactSupport } from "@/components/support/ContactSupportProvider";
import {
  filterNavByEnabledFeatures,
  MAIN_NAV_SECTIONS,
  navActive,
  type MainNavItem,
  type MainNavSection,
} from "@/config/mainNavigation";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { SITE_NAME } from "@/lib/seo-metadata";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";

type MainNavigationMenuProps = {
  open: boolean;
  onClose: () => void;
};

function isNavItemActive(pathname: string, item: MainNavItem): boolean {
  if (item.menuAction) return false;
  return item.isActive ? item.isActive(pathname) : navActive(pathname, item.href);
}

function sectionContainsActiveRoute(
  pathname: string,
  section: MainNavSection,
): boolean {
  return section.items.some((item) => isNavItemActive(pathname, item));
}

function NavMenuItem({
  item,
  pathname,
  onClose,
  openContactFromMenu,
}: {
  item: MainNavItem;
  pathname: string;
  onClose: () => void;
  openContactFromMenu: () => void;
}) {
  if (item.menuAction === "contact-support") {
    return (
      <li key="contact-support">
        <button
          type="button"
          onClick={openContactFromMenu}
          className="flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-kal-card-muted active:bg-kal-card-muted sm:gap-3"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-kal-card-muted text-kal-muted sm:h-10 sm:w-10">
            <item.Icon className="size-[1.125rem] sm:h-5 sm:w-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-kal-text">
            {item.label}
          </span>
        </button>
      </li>
    );
  }

  const active = isNavItemActive(pathname, item);
  return (
    <li key={item.href}>
      <Link
        href={item.href}
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
            "flex size-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
            active
              ? "bg-kal-accent/20 text-kal-accent-dark dark:text-kal-accent"
              : "bg-kal-card-muted text-kal-muted",
          )}
        >
          <item.Icon className="size-[1.125rem] sm:h-5 sm:w-5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-kal-text">
          {item.label}
        </span>
      </Link>
    </li>
  );
}

export function MainNavigationMenu({ open, onClose }: MainNavigationMenuProps) {
  const { openContactSupport } = useContactSupport();
  const pathname = usePathname();
  const enabledFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);
  const navSections = useMemo(
    () => filterNavByEnabledFeatures(MAIN_NAV_SECTIONS, enabledFeatures),
    [enabledFeatures],
  );
  const {
    showPwaInstallUi,
    installed,
    canPromptInstall,
    needsIosInstallModal,
    promptInstall,
    iosDevice,
    installEligibilityKnown,
  } = usePwaInstall();
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const section of navSections) {
        next[section.title] = sectionContainsActiveRoute(pathname, section);
      }
      const unchanged =
        Object.keys(next).every((key) => prev[key] === next[key]) &&
        Object.keys(prev).every((key) => key in next);
      return unchanged ? prev : next;
    });
  }, [open, pathname, navSections]);

  const installHelpText =
    showPwaInstallUi &&
    !installed &&
    !canPromptInstall &&
    !needsIosInstallModal &&
    installEligibilityKnown
      ? "Open this in Chrome or Safari, then use Add to Home Screen."
      : null;

  const openContactFromMenu = useCallback(() => {
    onClose();
    openContactSupport();
  }, [onClose, openContactSupport]);

  const copyWithExecCommand = useCallback((value: string): boolean => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }, []);

  const handleShareApp = useCallback(async () => {
    const appUrl = window.location.origin;
    const shareData = {
      title: SITE_NAME,
      text: `Check out ${SITE_NAME}!`,
      url: appUrl,
    };

    const canUseNativeShare =
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(shareData));

    if (canUseNativeShare) {
      try {
        await navigator.share(shareData);
        setShareFeedback("Thanks for sharing!");
        return;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }
        // Non-cancel native-share errors fall through to clipboard fallback.
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(appUrl);
        setShareFeedback("Copied app link. Now you can share it by pasting the link.");
        return;
      }
    } catch {
      // Continue to legacy fallback.
    }

    if (copyWithExecCommand(appUrl)) {
      setShareFeedback("Copied app link. Now you can share it by pasting the link.");
      return;
    }

    window.prompt("Copy and share this app link:", appUrl);
    setShareFeedback("Opened copy prompt. Copy the link and share it.");
  }, [copyWithExecCommand, setShareFeedback]);

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
    if (!shareFeedback) return;
    const t = window.setTimeout(() => setShareFeedback(null), 4_000);
    return () => window.clearTimeout(t);
  }, [shareFeedback]);

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
        <div className="shrink-0 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm" style={{ borderColor: "var(--kal-border)" }}>
          <div className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-kal-accent-soft text-kal-accent">
              <Menu className="size-5" strokeWidth={2.25} />
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
          <div className="space-y-2 px-3 pb-3 sm:px-4">
            <PwaUpdateCallout variant="drawer" />
            {showPwaInstallUi ? (
              <>
                <button
                  type="button"
                  disabled={installed}
                  onClick={() => {
                    if (canPromptInstall) {
                      onClose();
                      void promptInstall();
                      return;
                    }
                    if (needsIosInstallModal) {
                      onClose();
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
                      className="size-[1.125rem] shrink-0 text-kal-muted"
                      strokeWidth={2.35}
                    />
                  ) : needsIosInstallModal ? (
                    <Smartphone className="size-[1.125rem] shrink-0" strokeWidth={2.35} />
                  ) : (
                    <ArrowDown className="size-[1.125rem] shrink-0" strokeWidth={2.5} />
                  )}
                  {installed ? (
                    <span className="font-bold tracking-tight">App Installed</span>
                  ) : canPromptInstall ? (
                    <span>Install App in One Click</span>
                  ) : (
                    <span>Install App to Home Screen</span>
                  )}
                </button>
                {installHelpText ? (
                  <p className="mt-1 rounded-xl border border-kal-border/80 bg-white/40 px-3 py-2 text-center text-xs text-kal-muted dark:border-white/10 dark:bg-white/5">
                    {installHelpText}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-2"
          aria-label="Main"
        >
          <ul className="space-y-1">
            {navSections.map((section, sectionIndex) => (
              <li
                key={section.title}
                className={clsx("list-none", sectionIndex > 0 && "mt-1")}
              >
                <details
                  className="group rounded-xl"
                  open={openSections[section.title] ?? false}
                >
                  <summary
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenSections((prev) => ({
                        ...prev,
                        [section.title]: !(prev[section.title] ?? false),
                      }));
                    }}
                    className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2.5 py-2 outline-none marker:hidden transition-colors hover:bg-kal-card-muted/60 focus-visible:ring-2 focus-visible:ring-kal-accent/40 [&::-webkit-details-marker]:hidden"
                  >
                    <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-kal-muted">
                      {section.title}
                    </p>
                    <ChevronDown
                      aria-hidden
                      className="size-3.5 shrink-0 text-kal-muted transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <ul className="space-y-px pb-1 pt-0.5">
                    {section.items.map((item) => (
                      <NavMenuItem
                        key={item.menuAction === "contact-support" ? "contact-support" : item.href}
                        item={item}
                        pathname={pathname}
                        onClose={onClose}
                        openContactFromMenu={openContactFromMenu}
                      />
                    ))}
                  </ul>
                </details>
              </li>
            ))}
            <li className="list-none px-2.5 pb-0.5 pt-3 sm:pt-3.5">
              <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-kal-muted">
                Share
              </p>
            </li>
            <li>
              <button
                type="button"
                onClick={() => void handleShareApp()}
                className="flex w-full min-h-[44px] touch-manipulation items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-kal-card-muted active:bg-kal-card-muted sm:gap-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-kal-card-muted text-kal-muted sm:h-10 sm:w-10">
                  <Share2 className="size-[1.125rem] sm:h-5 sm:w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-kal-text">
                  Share App
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
    {showPwaInstallUi ? (
      <PwaIosInstallModal
        open={iosInstallOpen}
        onClose={() => setIosInstallOpen(false)}
      />
    ) : null}
    <ContactSupportSuccessToast
      message={shareFeedback}
      onDismiss={() => setShareFeedback(null)}
    />
    </>
  );
}
