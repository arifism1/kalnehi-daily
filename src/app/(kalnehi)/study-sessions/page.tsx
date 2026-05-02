import { redirect } from "next/navigation";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";

import StudySessionsRouteLazy from "./StudySessionsRouteLazy";

export const metadata = kalnehiPageMetadata("studySessions");

export default function StudySessionsPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_AI_STUDY_PARTNER !== "true") {
    redirect("/home");
  }
  return <StudySessionsRouteLazy />;
}
