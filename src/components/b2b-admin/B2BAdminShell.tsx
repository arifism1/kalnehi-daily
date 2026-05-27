"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { OrgContext } from "@/lib/auth/withOrganization";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/batches", label: "Batches", icon: "⊞" },
  { href: "/students", label: "Students", icon: "◎" },
  { href: "/assignments", label: "Assignments", icon: "✎" },
  { href: "/analytics", label: "Analytics", icon: "▲" },
] as const;

interface B2BAdminShellProps {
  children: React.ReactNode;
  ctx: OrgContext;
  orgName: string;
}

export function B2BAdminShell({ children, ctx, orgName }: B2BAdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex bg-[var(--kal-page)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[var(--kal-border)] flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-[var(--kal-border)]">
          <p className="text-[10px] uppercase tracking-widest text-[var(--kal-muted)] mb-0.5">
            Institute Portal
          </p>
          <p className="font-semibold text-[var(--kal-text)] text-sm leading-tight truncate">
            {orgName}
          </p>
          <p className="text-[11px] text-[var(--kal-muted)] capitalize mt-0.5">
            {ctx.role}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-[var(--kal-accent-soft)] text-[var(--kal-accent)] font-medium"
                    : "text-[var(--kal-text-secondary)] hover:bg-[var(--kal-card-muted)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--kal-border)]">
          <p className="text-[10px] text-[var(--kal-muted)] uppercase tracking-widest">
            Powered by Kalnehi
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
