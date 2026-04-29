import type { Metadata } from "next";

import { UpgradeCheckout } from "./UpgradeCheckout";

export const metadata: Metadata = {
  title: "Upgrade · Kalnehi Preparation OS",
  robots: { index: false, follow: false },
};

export default function UpgradePage() {
  return <UpgradeCheckout />;
}
