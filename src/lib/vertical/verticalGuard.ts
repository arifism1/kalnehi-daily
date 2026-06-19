/**
 * Server-side route guard. Ensures a route group only renders for its intended brand:
 * a visitor on kalnehi.com hitting a FIZAKI-only route (or vice versa) is redirected to
 * the resolved vertical's home instead of seeing the wrong brand's surface.
 */
import "server-only";

import { redirect } from "next/navigation";

import { getVerticalConfig, type VerticalId } from "@/verticals";

import { getServerVerticalId } from "./serverVertical";

export async function requireVertical(expected: VerticalId): Promise<void> {
  const current = await getServerVerticalId();
  if (current !== expected) {
    redirect(getVerticalConfig(current).defaultHomePath);
  }
}
