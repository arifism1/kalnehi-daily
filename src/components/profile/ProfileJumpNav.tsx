"use client";

import clsx from "clsx";

const LINKS = [
  { href: "#profile-details", label: "Profile" },
  { href: "#profile-account", label: "Account" },
  { href: "#profile-session", label: "Session" },
] as const;

export function ProfileJumpNav() {
  return (
    <nav
      aria-label="Profile sections"
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
