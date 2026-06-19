"use client";

/**
 * FIZAKI app chrome: lightweight top bar + role-aware bottom nav. Mobile-first to keep
 * the voice-first, low-friction UX. Uses the shared --kal-* tokens (re-themed to the
 * FIZAKI palette by the route-group layout), so it inherits the design system.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useVertical } from "@/components/vertical/VerticalProvider";
import type { FizakiRole } from "@/lib/fizaki/roles";

interface NavItem {
  href: string;
  label: string;
}

function navForRole(role: FizakiRole): NavItem[] {
  switch (role) {
    case "manager":
      return [
        { href: "/manager", label: "Team" },
        { href: "/pipeline", label: "Pipeline" },
        { href: "/playbook", label: "Playbook" },
        { href: "/coach", label: "Coach" },
      ];
    case "admin":
      return [
        { href: "/import", label: "Import" },
        { href: "/playbook", label: "Playbook" },
        { href: "/manager", label: "Team" },
      ];
    case "rep":
    default:
      return [
        { href: "/today", label: "Today" },
        { href: "/playbook", label: "Playbook" },
        { href: "/pipeline", label: "Pipeline" },
        { href: "/coach", label: "Coach" },
      ];
  }
}

export function FizakiChrome({
  role,
  children,
}: {
  role: FizakiRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { config } = useVertical();
  const items = navForRole(role);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-kal-border bg-kal-card px-4 py-3 backdrop-blur">
        <Link href={config.defaultHomePath} className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-kal-accent">
            {config.brand.shortName}
          </span>
          <span className="text-xs font-medium text-kal-muted">
            {config.brand.tagline}
          </span>
        </Link>
        <span className="rounded-full bg-kal-accent-soft px-2.5 py-1 text-xs font-semibold capitalize text-kal-accent">
          {role}
        </span>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-kal-border bg-kal-card backdrop-blur">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
                active ? "text-kal-accent" : "text-kal-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
