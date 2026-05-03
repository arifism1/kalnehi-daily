import type { Metadata } from "next";

import { MissedTasksPageClient } from "./MissedTasksPageClient";

export const metadata: Metadata = {
  title: "Missed Tasks — Kalnehi",
  description:
    "Overdue daily plan tasks and past-due Revision Tracker items — reschedule or complete in one place.",
};

export default function MissedTasksPage() {
  return <MissedTasksPageClient />;
}
