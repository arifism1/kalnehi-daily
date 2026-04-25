"use client";

import { PwaUpdateCallout } from "@/components/pwa/PwaUpdateCallout";

/**
 * Bottom "app updated" surface (all viewports: mobile, tablet, desktop; all
 * engines that support service workers, including installed PWAs and browser
 * tabs).
 */
export function ServiceWorkerRegister() {
  return <PwaUpdateCallout variant="toast" />;
}
