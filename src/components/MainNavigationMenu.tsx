"use client";

import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  CircleHelp,
  Download,
  Flame,
  Home,
  Inbox,
  Menu,
  Mic,
  RotateCcw,
  ScrollText,
  Settings,
  Timer,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { isStandalonePwa, usePwaInstall } from "@/hooks/usePwaInstall";

type MainNavigationMenuProps = {
  open: boolean;
  onClose: () => void;
};

function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/profile", label: "Profile", Icon: UserRound },
  { href: "/", label: "Dashboard (Home)", Icon: Home },
  { href: "/syllabus", label: "Syllabus Tracker", Icon: BookOpen },
  { href: "/plan", label: "Execution Planner", Icon: CalendarDays },
  { href: "/daily-log", label: "Daily Log", Icon: ScrollText },
  { href: "/dictate-day", label: "Dictate My Day", Icon: Mic },
  { href: "/study-sessions", label: "Study Sessions", Icon: Video },
  { href: "/progress", label: "Progress", Icon: BarChart3 },
  { href: "/doubts", label: "Doubt Tracker", Icon: CircleHelp },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/revision", label: "Revision Engine", Icon: RotateCcw },
  { href: "/heatmap", label: "Heatmap", Icon: Flame },
  { href: "/timer", label: "Timer", Icon: Timer },
  { href: "/pending", label: "Pending Tasks", Icon: Inbox },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function MainNavigationMenu({ open, onClose }: MainNavigationMenuProps) {
  const pathname = usePathname();
  const { installed, canPromptInstall, showIosInstructions, promptInstall } =
    usePwaInstall();
  const [installBusy, setInstallBusy] = useState(false);

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
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          "absolute inset-x-0 bottom-0 flex max-h-[min(92vh,100dvh)] flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#0a0f1c] shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-200 ease-out sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-bl-3xl sm:border-l sm:border-t-0",
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full",
        )}
      >
        <div className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-600" aria-hidden />
        </div>
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Menu className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-400/90">
              Navigate
            </p>
            <p className="text-base font-semibold text-white">Kalnehi Daily</p>
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
          aria-label="Main"
        >
          <ul className="space-y-0.5">
            {LINKS.map(({ href, label, Icon }) => {
              const active = navActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={clsx(
                      "flex min-h-[56px] items-center gap-4 rounded-2xl px-3 py-3 transition-colors",
                      active
                        ? "bg-emerald-500/12 ring-1 ring-emerald-500/25"
                        : "hover:bg-slate-800/80 active:bg-slate-800",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                        active
                          ? "bg-emerald-500/25 text-emerald-200"
                          : "bg-slate-800/90 text-zinc-400",
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-white">
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}

            <li className="pt-1">
              <div
                className={clsx(
                  "rounded-2xl border px-3 py-4",
                  installed
                    ? "border-emerald-500/25 bg-emerald-950/20"
                    : "border-emerald-500/35 bg-emerald-950/25",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <Download className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-white">
                      Install App
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                      Add to Home Screen — faster launch, fewer distractions.
                    </p>
                    {installed ? (
                      <p className="mt-3 text-sm font-medium text-emerald-400/95">
                        You&apos;re running the installed app.
                      </p>
                    ) : (
                      <>
                        {canPromptInstall && (
                          <button
                            type="button"
                            disabled={installBusy}
                            onClick={async () => {
                              setInstallBusy(true);
                              await promptInstall();
                              setInstallBusy(false);
                              if (isStandalonePwa()) onClose();
                            }}
                            className="mt-3 w-full min-h-[48px] rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 active:bg-emerald-500 disabled:opacity-50"
                          >
                            {installBusy ? "Opening…" : "Add to Home Screen"}
                          </button>
                        )}
                        {showIosInstructions && !canPromptInstall && (
                          <div className="mt-3 rounded-xl bg-slate-900/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-300">
                            <p className="font-medium text-emerald-200/90">
                              iPhone &amp; iPad (Safari)
                            </p>
                            <ol className="mt-2 list-decimal space-y-1 pl-4 text-zinc-400">
                              <li>Tap the Share button</li>
                              <li>
                                Tap{" "}
                                <span className="text-zinc-200">
                                  Add to Home Screen
                                </span>
                              </li>
                              <li>Open Kalnehi from your home screen</li>
                            </ol>
                          </div>
                        )}
                        {!canPromptInstall && !showIosInstructions && (
                          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                            Android / desktop: use your browser menu → Install
                            app, or Add to Home screen.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
