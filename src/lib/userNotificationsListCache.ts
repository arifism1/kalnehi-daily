import {
  listUserNotificationsPage,
  type UserNotification,
} from "@/actions/notifications";

const TTL_MS = 50_000;

type Entry = {
  userId: string;
  fetchedAt: number;
  notifications: UserNotification[];
  hasMore: boolean;
};

let entry: Entry | null = null;
/** Bumps when cache is invalidated so in-flight prefetches do not write stale data. */
let generation = 0;
const inFlightByUser = new Map<string, Promise<void>>();

export type UserNotificationsListCachePeek =
  | { status: "miss" }
  | { status: "hit"; notifications: UserNotification[]; hasMore: boolean };

export function peekValidUserNotificationsList(
  userId: string,
): UserNotificationsListCachePeek {
  if (!entry || entry.userId !== userId) return { status: "miss" };
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    entry = null;
    return { status: "miss" };
  }
  return {
    status: "hit",
    notifications: entry.notifications,
    hasMore: entry.hasMore,
  };
}

export function primeUserNotificationsListCache(
  userId: string,
  notifications: UserNotification[],
  hasMore = false,
): void {
  entry = {
    userId,
    fetchedAt: Date.now(),
    notifications,
    hasMore,
  };
}

export function invalidateUserNotificationsListCache(): void {
  generation += 1;
  entry = null;
  inFlightByUser.clear();
}

/** Shared: returns a promise that settles when the first page (5 rows) is cached or the fetch ends. */
function startFirstPageFetchIfNeeded(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return Promise.resolve();
  if (peekValidUserNotificationsList(userId).status === "hit") {
    return Promise.resolve();
  }

  const existing = inFlightByUser.get(userId);
  if (existing) return existing;

  const gen = generation;
  const p = (async () => {
    try {
      const res = await listUserNotificationsPage(0, 5);
      if (gen !== generation) return;
      if (!res.ok) return;
      entry = {
        userId,
        fetchedAt: Date.now(),
        notifications: res.items,
        hasMore: res.hasMore,
      };
    } catch {
      /* page load will surface errors */
    } finally {
      inFlightByUser.delete(userId);
    }
  })();
  inFlightByUser.set(userId, p);
  return p;
}

/**
 * Fire-and-forget first page when the user hovers/focuses the bell (no await).
 */
export function prefetchUserNotificationsList(userId: string): void {
  void startFirstPageFetchIfNeeded(userId);
}

/**
 * Await until the first five notifications are in cache (or fetch failed / invalidated).
 * Call from the bell before navigating so the notifications page can hydrate immediately.
 */
export function ensureUserNotificationsFirstPageCached(
  userId: string,
): Promise<void> {
  return startFirstPageFetchIfNeeded(userId);
}
