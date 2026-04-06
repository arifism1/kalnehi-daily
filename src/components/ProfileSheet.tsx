"use client";

import clsx from "clsx";
import { LogOut, Settings, UserCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

import { CameraPlannerSettings } from "@/components/settings/CameraPlannerSettings";
import { SettingsToggles } from "@/components/settings/SettingsToggles";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ProfileSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const signOut = useCallback(async () => {
    setSignOutConfirmOpen(false);
    onClose();
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.replace("/auth");
    router.refresh();
  }, [router, onClose]);

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account"
      className={clsx(
        "fixed inset-0 z-[60] transition-[visibility] duration-200",
        open ? "visible" : "invisible delay-200",
      )}
    >
      <ConfirmDialog
        open={signOutConfirmOpen}
        title="Sign out?"
        description="You will be logged out of Kalnehi Daily."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={() => void signOut()}
      />
      <button
        type="button"
        aria-label="Close"
        className={clsx(
          "absolute inset-0 bg-black/55 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          "absolute inset-x-0 bottom-0 max-h-[min(85vh,28rem)] overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#0a0f1c] shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-200 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex max-h-[min(85vh,28rem)] flex-col">
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-10 rounded-full bg-slate-600" aria-hidden />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3 border-b border-slate-700/80 pb-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full border border-slate-600 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-800">
                  <UserCircle className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <p className="truncate text-sm text-zinc-300">
                {session?.user?.email ?? "Signed in"}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/profile"
                onClick={onClose}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 py-2.5 text-sm font-semibold text-zinc-200 active:bg-slate-800"
              >
                <UserRound className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/settings"
                onClick={onClose}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 py-2.5 text-sm font-semibold text-zinc-200 active:bg-slate-800"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>

            <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">
              Quick toggles
            </p>
            <div className="mt-2">
              <SettingsToggles />
            </div>
            <div className="mt-4">
              <CameraPlannerSettings />
            </div>

            {session && (
              <button
                type="button"
                onClick={() => setSignOutConfirmOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-950/40 py-3.5 text-[15px] font-semibold text-rose-400 active:bg-rose-950/60"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
