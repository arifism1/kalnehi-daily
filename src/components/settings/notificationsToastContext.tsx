"use client";

import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "neutral";

const NotificationsToastContext = createContext<
  ((message: string, tone?: ToastTone) => void) | null
>(null);

export function useNotificationsToast() {
  const ctx = useContext(NotificationsToastContext);
  return useMemo(
    () => ctx ?? ((_message: string, _tone?: ToastTone) => {}),
    [ctx],
  );
}

export function NotificationsToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
  } | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <NotificationsToastContext.Provider value={showToast}>
      {children}
      {toast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-[80] w-[min(92vw,24rem)] -translate-x-1/2 opacity-95"
          role="status"
        >
          <div
            className={clsx(
              "pointer-events-auto rounded-2xl border px-4 py-3 text-center text-sm font-medium shadow-lg backdrop-blur-md",
              toast.tone === "success"
                ? "border-emerald-400/35 bg-emerald-950/90 text-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/85"
                : "border-white/20 bg-zinc-900/90 text-zinc-100 dark:bg-zinc-950/90",
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </NotificationsToastContext.Provider>
  );
}
