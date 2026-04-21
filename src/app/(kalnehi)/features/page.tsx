import type { Metadata } from "next";

import { AllFeaturesClient } from "./AllFeaturesClient";

export const metadata: Metadata = {
  title: "All Features — Kalnehi",
  description: "Browse and open all 18 Kalnehi features in one place.",
};

export default function FeaturesPage() {
  return <AllFeaturesClient />;
}
