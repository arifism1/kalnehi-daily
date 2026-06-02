"use client";

import clsx from "clsx";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getNotificationUnreadTotal } from "@/actions/notifications";
import { prefetchUserNotificationsList } from "@/lib/userNotificationsListCache";
import { useAuthStore } from "@/store/useAuthStore";

export function NotificationBellLink({
  pathname,
  compact = false,
}: {
  pathname: string | null;
  /** Tighter sizing when grouped beside the voice mic in the top bar. */
  compact?: boolean;
}) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(() => {
    if (!userId) {
      setTotal(0);
      return;
    }
    void (async () => {
      const res = await getNotificationUnreadTotal();
      if (res.ok) setTotal(res.total);
    })();
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const maybePrefetchList = useCallback(() => {
    if (!userId || pathname === "/notifications") return;
    prefetchUserNotificationsList(userId);
  }, [userId, pathname]);

  const handleBellClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname === "/notifications") return;
      // Let the browser handle new tab / modified clicks; still warm cache in the background.
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        if (userId) prefetchUserNotificationsList(userId);
        return;
      }
      if (!userId) return;
      e.preventDefault();
      prefetchUserNotificationsList(userId);
      router.push("/notifications");
    },
    [userId, pathname, router],
  );

  const label =
    total > 0 ? `Notifications, ${total} unread` : "Notifications";
  const badgeText = total > 99 ? "99+" : String(total);

  return (
    <Link
      href="/notifications"
      onClick={handleBellClick}
      onPointerEnter={maybePrefetchList}
      onPointerDown={maybePrefetchList}
      onFocus={maybePrefetchList}
      className={clsx(
        "relative flex items-center justify-center rounded-xl border backdrop-blur-md transition-colors active:scale-[0.98]",
        compact
          ? "size-10 min-h-[40px] min-w-[40px] sm:size-11 sm:min-h-[44px] sm:min-w-[44px]"
          : "size-11 min-h-[44px] min-w-[44px]",
        pathname === "/notifications"
          ? "border-kal-accent/35 bg-kal-accent-soft text-kal-accent shadow-sm"
          : "border-white/30 bg-white/45 text-kal-accent hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/50",
      )}
      aria-label={label}
    >
      <Bell className="size-4.5 shrink-0" strokeWidth={2.25} aria-hidden />
      {total > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-kal-accent px-1 text-[10px] font-bold leading-none text-white tabular-nums shadow-sm"
          aria-hidden
        >
          {badgeText}
        </span>
      ) : null}
    </Link>
  );
}
