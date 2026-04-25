"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PwaServiceWorkerUpdateContextValue = {
  updateReady: boolean;
  reloading: boolean;
  dismiss: () => void;
  applyReload: () => void;
};

const PwaServiceWorkerUpdateContext =
  createContext<PwaServiceWorkerUpdateContextValue | null>(null);

/**
 * Single place for production `/sw.js` registration and the "new build ready"
 * signal (`controllerchange` after a prior controller), shared by
 * {@link ServiceWorkerRegister} and {@link MainNavigationMenu}.
 */
export function PwaServiceWorkerUpdateProvider({ children }: { children: ReactNode }) {
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* ignore — private mode, blocked, etc. */
      });

    /** Helps iOS/Android/desktop discover new SW versions when the user returns to the app. */
    const checkForNewWorker = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        void reg?.update();
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForNewWorker();
    };
    window.addEventListener("focus", checkForNewWorker);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("focus", checkForNewWorker);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const dismiss = useCallback(() => {
    setUpdateReady(false);
  }, []);

  const applyReload = useCallback(() => {
    setReloading(true);
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      updateReady,
      reloading,
      dismiss,
      applyReload,
    }),
    [updateReady, reloading, dismiss, applyReload],
  );

  return (
    <PwaServiceWorkerUpdateContext.Provider value={value}>
      {children}
    </PwaServiceWorkerUpdateContext.Provider>
  );
}

export function usePwaServiceWorkerUpdate(): PwaServiceWorkerUpdateContextValue {
  const ctx = useContext(PwaServiceWorkerUpdateContext);
  if (!ctx) {
    throw new Error(
      "usePwaServiceWorkerUpdate must be used within PwaServiceWorkerUpdateProvider",
    );
  }
  return ctx;
}
