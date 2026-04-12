import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SITE_NAME } from "@/lib/seo-metadata";

const POLICY_LINKS: { href: string; label: string; description: string }[] =
  [
    {
      href: "/privacy",
      label: "Privacy Policy",
      description: "What we collect and how we use your data.",
    },
    {
      href: "/terms",
      label: "Terms & Conditions",
      description: `Rules for using ${SITE_NAME}.`,
    },
    {
      href: "/refund",
      label: "Refund & Cancellation Policy",
      description: "Subscriptions, trials, and refunds.",
    },
    {
      href: "/shipping",
      label: "Shipping Policy",
      description: "Digital delivery — no physical goods.",
    },
    {
      href: "/return",
      label: "Return Policy",
      description: "Digital products — no returns.",
    },
    {
      href: "/about",
      label: "About Us",
      description: "Who we are and how to reach us.",
    },
  ];

export default function PoliciesHubPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 pb-8">
      <header className="space-y-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Legal
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
          Our Policies
        </h1>
        <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-[15px]">
          Important documents for {SITE_NAME}. Tap a topic to read the full
          text.
        </p>
      </header>

      <ul className="kal-glass-panel divide-y divide-white/15 overflow-hidden rounded-2xl dark:divide-white/10">
        {POLICY_LINKS.map(({ href, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex min-h-[72px] items-center gap-3 px-4 py-4 transition-colors hover:bg-white/40 active:bg-white/55 dark:hover:bg-zinc-900/50 dark:active:bg-zinc-900/60 sm:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-kal-text group-hover:text-kal-accent">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-kal-muted sm:text-sm">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-kal-muted transition-transform group-hover:translate-x-0.5 group-hover:text-kal-accent"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
