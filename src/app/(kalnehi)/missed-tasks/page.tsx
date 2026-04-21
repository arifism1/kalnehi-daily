import type { Metadata } from "next";

import { MissedTasksPageClient } from "./MissedTasksPageClient";

export const metadata: Metadata = {
  title: "Missed Tasks — Kalnehi",
  description: "Review and reschedule tasks you haven't completed from previous days.",
};

export default function MissedTasksPage() {
  return <MissedTasksPageClient />;
}
