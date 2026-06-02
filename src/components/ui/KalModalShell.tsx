"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { useVisualViewportSheetHeight } from "@/hooks/useVisualViewportSheetHeight";
import { ModalPortal } from "@/components/ui/ModalPortal";

const KAL_MODAL_OPEN_CLASS = "kal-modal-open";

export type KalModalShellProps = {
  onClose: () => void;
  /** Backdrop + panel stack; default 72 (sheets). */
  zIndex?: number;
  title?: string;
  titleId?: string;
  subtitle?: string;
  /** Replaces built-in title row when set. */
  header?: ReactNode;
  closeLabel?: string;
  busy?: boolean;
  panelClassName?: string;
  scrollClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  role?: "dialog" | "alertdialog";
  ariaLabel?: string;
  /** Shrink sheet when mobile keyboard opens. */
  adaptToVisualViewport?: boolean;
};

export function KalModalShell({
  onClose,
  zIndex = 72,
  title,
  titleId = "kal-modal-title",
  subtitle,
  header,
  closeLabel = "Close",
  busy = false,
  panelClassName,
  scrollClassName,
  children,
  footer,
  role = "dialog",
  ariaLabel,
  adaptToVisualViewport = true,
}: KalModalShellProps) {
  useVisualViewportSheetHeight(adaptToVisualViewport);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add(KAL_MODAL_OPEN_CLASS);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove(KAL_MODAL_OPEN_CLASS);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, busy]);

  const panelZ = zIndex + 1;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 flex items-end justify-center sm:items-center"
        style={{ zIndex }}
      >
        <button
          type="button"
          aria-label={closeLabel}
          className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
          onClick={busy ? undefined : onClose}
          disabled={busy}
        />
        <div
          role={role}
          aria-modal="true"
          aria-label={ariaLabel ?? title}
          aria-labelledby={title && !ariaLabel ? titleId : undefined}
          aria-busy={busy}
          className={clsx(
            "relative flex min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-kal-border bg-kal-bg-elevated shadow-2xl sm:rounded-[1.75rem]",
            "max-h-[min(var(--kal-sheet-max-h,92dvh),52rem)]",
            panelClassName,
          )}
          style={{ zIndex: panelZ }}
        >
          {header ?? (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-kal-border bg-kal-bg-elevated p-4 sm:px-5">
              <div className="min-w-0">
                {title ? (
                  <h2
                    id={titleId}
                    className="text-lg font-semibold tracking-tight text-kal-text"
                  >
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p className="mt-0.5 truncate text-xs text-kal-muted">{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-kal-border text-kal-text-secondary hover:bg-kal-card-muted hover:text-kal-text"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          )}

          <div
            className={clsx(
              "relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 [-webkit-overflow-scrolling:touch] sm:px-5",
              scrollClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-kal-border bg-kal-bg-elevated">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </ModalPortal>
  );
}
