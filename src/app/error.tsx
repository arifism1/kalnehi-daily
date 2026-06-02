"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { RefreshCw, AlertTriangle } from "lucide-react";

/**
 * Next.js App Router route-level error boundary.
 * Catches unhandled render errors in any (kalnehi) or other nested route segment.
 * Required for Google Play "Minimum Functionality" — without this, uncaught errors
 * show a white Next.js default page with no recovery path.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Kalnehi] Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-kal-page px-6 py-16">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-kal-accent/10">
          <AlertTriangle className="h-8 w-8 text-kal-accent" aria-hidden />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-kal-text">
            Something went wrong
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            We couldn&apos;t load this page. This usually happens when your
            connection is spotty. Your data is safe — tap retry to reload.
          </p>
        </div>

        <button
          type="button"
          onClick={reset}
          className="kal-btn-accent flex min-h-[48px] w-full items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>

        <button
          type="button"
          onClick={() => router.push(APP_HOME_PATH)}
          className="text-sm font-medium text-kal-accent underline underline-offset-2"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
