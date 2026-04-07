 "use client";

import { Bell } from "lucide-react";
import Link from "next/link";

import { useAuthStore } from "@/store/useAuthStore";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  kind: "reminder" | "deadline" | "message";
};

const notifications: NotificationItem[] = [];

export default function NotificationsPage() {
  const userId = useAuthStore((s) => s.user?.id);

  if (!userId) {
    return (
      <section className="mx-auto w-full max-w-2xl rounded-[1.25rem] border border-kal-border bg-kal-card p-6 text-center kal-shadow-card sm:p-8">
        <p className="text-lg font-semibold text-kal-text">Sign in required</p>
        <p className="mt-2 text-sm text-kal-muted">
          Please sign in to view your notifications.
        </p>
        <Link
          href="/auth"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-kal-accent-hover"
        >
          Go to sign in
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Alerts
        </p>
        <h1 className="mt-1 text-2xl font-bold text-kal-text">Notifications</h1>
      </header>

      {notifications.length === 0 ? (
        <section className="rounded-[1.25rem] border border-kal-border bg-kal-card p-6 text-center kal-shadow-card sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-kal-accent-soft text-kal-accent">
            <Bell className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 text-lg font-semibold text-kal-text">
            No notifications yet
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            Daily reminders, deadlines, and important updates will appear here.
          </p>
        </section>
      ) : (
        <section className="rounded-[1.25rem] border border-kal-border bg-kal-card p-2 kal-shadow-card sm:p-3">
          <ul aria-label="Notifications list" className="divide-y divide-kal-border">
            {notifications.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-kal-text">{item.title}</p>
                <p className="mt-0.5 text-sm text-kal-muted">{item.message}</p>
                <p className="mt-1 text-[11px] text-kal-text-secondary">
                  {item.createdAt}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
