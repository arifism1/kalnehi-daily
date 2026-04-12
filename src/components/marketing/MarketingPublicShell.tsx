import Image from "next/image";
import Link from "next/link";

export function MarketingPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-kal-page text-kal-text">
      <header className="sticky top-0 z-40 border-b border-kal-border bg-kal-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:h-[3.5rem] sm:px-6">
          <Link
            href="/guides"
            className="flex items-center gap-2 rounded-xl py-1 font-semibold text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
          >
            <Image
              src="/icon-192x192.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="text-sm sm:text-base">Kalnehi Daily</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/guides"
              className="rounded-lg px-2 py-1.5 text-kal-text-secondary hover:text-kal-text"
            >
              Guides
            </Link>
            <Link
              href="/auth"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-kal-accent px-4 text-sm font-bold text-kal-accent-foreground"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
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
        <p className="mt-2">© {new Date().getFullYear()} Kalnehi Daily</p>
      </footer>
    </div>
  );
}
