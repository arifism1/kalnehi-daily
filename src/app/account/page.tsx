import type { Metadata } from "next";
import { Suspense } from "react";

import { KalSpinner } from "@/components/loading/KalSpinner";

import { AccountBuffer } from "./AccountBuffer";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

function AccountFallback() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-kal-page px-6 py-16">
      <KalSpinner size="lg" message="Loading…" />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountFallback />}>
      <AccountBuffer />
    </Suspense>
  );
}
