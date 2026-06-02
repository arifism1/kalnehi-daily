"use client";

import clsx from "clsx";

const LINKS = [
  { href: "#settings-app", label: "App" },
  { href: "#settings-notifications", label: "Notifications" },
  { href: "#settings-session", label: "Session" },
] as const;

export function SettingsJumpNav() {
  return (
    <nav
      aria-label="Settings sections"
      className="hidden gap-2 overflow-x-auto pb-1 sm:flex sm:flex-wrap"
    >
      {LINKS.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className={clsx(
            "shrink-0 rounded-full border border-kal-border/70 bg-kal-card/50 px-3 py-1.5",
            "text-xs font-semibold text-kal-text-secondary transition-colors",
            "hover:border-kal-accent/40 hover:text-kal-accent",
          )}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
