/**
 * Server-side vertical access for Server Components, Route Handlers, and actions.
 * Reads the `x-vertical` header set by the proxy; falls back to the Host header,
 * then NEXT_PUBLIC_VERTICAL, then the default. Always returns a valid config.
 */
import "server-only";

import { headers } from "next/headers";

import {
  getVerticalConfig,
  isVerticalId,
  type VerticalConfig,
  type VerticalId,
} from "@/verticals";

import { VERTICAL_HEADER, resolveVertical } from "./resolveVertical";

export async function getServerVerticalId(): Promise<VerticalId> {
  const h = await headers();
  const headerVertical = h.get(VERTICAL_HEADER);
  if (isVerticalId(headerVertical)) return headerVertical;
  return resolveVertical(h.get("host"));
}

export async function getServerVertical(): Promise<VerticalConfig> {
  return getVerticalConfig(await getServerVerticalId());
}
