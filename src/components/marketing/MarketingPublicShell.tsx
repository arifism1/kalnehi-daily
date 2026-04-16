import Image from "next/image";
import Link from "next/link";

import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { SITE_NAME } from "@/lib/seo-metadata";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export function MarketingPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-kal-page text-kal-text">
      <header className="sticky top-0 z-40 border-b border-kal-border bg-kal-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[3.5rem] sm:px-6 md:gap-6 md:px-8">
          <Link
            href="/guides"
            title={SITE_NAME}
            className="flex min-w-0 items-center gap-2 rounded-xl py-1 font-semibold text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
          >
            <Image
              src="/icon-192x192.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
              priority
            />
            <span className="min-w-0 truncate text-left text-[11px] font-semibold leading-snug sm:max-w-[min(100%,22rem)] sm:whitespace-normal sm:text-balance sm:text-xs md:max-w-md md:text-sm lg:max-w-lg">
              {SITE_NAME}
            </span>
          </Link>
          <MarketingNav />
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
        {children}
      </div>
      <footer className="border-t border-kal-border bg-kal-card-muted/50 py-6 text-center text-xs text-kal-muted">
        <p>
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} {SITE_NAME}</p>
      </footer>
      <PwaInstallPrompt />
    </div>
  );
}
