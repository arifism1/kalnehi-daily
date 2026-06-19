import Link from "next/link";

import { CookieSettingsTrigger } from "@/components/consent/CookieSettingsTrigger";
import { fizakiConfig } from "@/verticals/fizaki.config";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

export function FizakiLandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-kal-border bg-kal-page-end">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-bold text-kal-accent">
              {fizakiConfig.brand.productName}
            </p>
            <p className="mt-1 text-sm text-kal-muted">{fizakiConfig.brand.tagline}</p>
            <a
              href={`mailto:${fizakiConfig.brand.supportEmail}`}
              className="mt-3 inline-block text-sm text-kal-text-secondary hover:text-kal-accent"
            >
              {fizakiConfig.brand.supportEmail}
            </a>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Legal">
            {LEGAL_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-kal-text-secondary transition-colors hover:text-kal-accent"
              >
                {label}
              </Link>
            ))}
            <CookieSettingsTrigger className="text-sm text-kal-text-secondary transition-colors hover:text-kal-accent" />
          </nav>
        </div>
        <p className="mt-8 border-t border-kal-border pt-6 text-xs text-kal-muted">
          © {year} {fizakiConfig.brand.productName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
