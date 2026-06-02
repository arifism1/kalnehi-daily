"use client";

import { createPortal } from "react-dom";

/** Renders children on `document.body` so `position: fixed` modals escape inner scroll containers. */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
