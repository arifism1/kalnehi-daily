import { redirect } from "next/navigation";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("studySessions");

/** Route kept for backwards compatibility; on-camera sessions UI is launch-hidden. */
export default function StudySessionsPage() {
  redirect("/home");
}
