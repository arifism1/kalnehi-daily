"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_GROUPS: {
  label: string;
  items: { label: string; href: string }[];
}[] = [
  {
    label: "Live",
    items: [{ label: "Overview", href: "/admin/overview" }],
  },
  {
    label: "Growth",
    items: [
      { label: "Acquisition", href: "/admin/acquisition" },
      { label: "Referrals", href: "/admin/referrals" },
      { label: "Activation", href: "/admin/activation" },
      { label: "Engagement", href: "/admin/engagement" },
      { label: "Conversion", href: "/admin/conversion" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Revenue", href: "/admin/revenue" },
      { label: "Retention", href: "/admin/retention" },
      { label: "AI usage", href: "/admin/ai-usage" },
    ],
  },
  {
    label: "Product",
    items: [
      { label: "Feature health", href: "/admin/feature-health" },
      { label: "Notifications", href: "/admin/notifications" },
      { label: "Batch analytics", href: "/admin/batches" },
      { label: "PWA installs", href: "/admin/pwa" },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "User lookup", href: "/admin/users" },
      { label: "User activity", href: "/admin/user-activity" },
      { label: "Exam segments", href: "/admin/exam-segments" },
    ],
  },
  {
    label: "Technical",
    items: [
      { label: "System health", href: "/admin/system-health" },
      { label: "Config", href: "/admin/config" },
      { label: "System", href: "/admin/system" },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-kal-page text-kal-text flex">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-kal-border bg-kal-card/40 lg:flex">
        <div className="border-b border-kal-border px-4 py-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-kal-accent">Admin</span>
          <p className="mt-0.5 text-sm font-semibold text-kal-text">Kalnehi Daily</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-kal-text-secondary mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/admin/overview"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={clsx(
                          "block rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-kal-accent/15 text-kal-accent"
                            : "text-kal-text-secondary hover:bg-kal-card hover:text-kal-text",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-kal-border p-3">
          <Link
            href="/home"
            className="block rounded-lg px-2 py-2 text-xs text-kal-muted hover:text-kal-text"
          >
            ← Back to app
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-kal-border bg-kal-card/90 backdrop-blur-sm lg:hidden">
          <div className="flex h-12 items-center justify-between gap-2 px-3">
            <span className="text-xs font-bold uppercase tracking-widest text-kal-accent">Admin</span>
            <Link href="/home" className="text-xs text-kal-muted">
              App
            </Link>
          </div>
          <div className="border-t border-kal-border divide-y divide-kal-border/50">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex items-center overflow-x-auto px-3 py-1.5 gap-1.5">
                <span className="shrink-0 w-14 text-[10px] font-bold uppercase tracking-wider text-kal-text-secondary">
                  {group.label}
                </span>
                {group.items.map((item) => {
                  const active =
                    item.href === "/admin/overview"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                        active
                          ? "bg-kal-accent text-white"
                          : "bg-kal-card text-kal-text-secondary",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
