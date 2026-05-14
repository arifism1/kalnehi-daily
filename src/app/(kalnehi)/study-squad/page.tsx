import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { getStudySquadSyllabusPool } from "@/lib/studySquadSyllabusPool.server";

import StudySquadRouteLazy from "./StudySquadRouteLazy";

export const metadata = kalnehiPageMetadata("studySquad");

export default async function StudySquadPage() {
  const pool = await getStudySquadSyllabusPool();

  return (
    <StudySquadRouteLazy
      syllabusLabels={pool.labels}
      syllabusLabelsKey={pool.labelsKey}
    />
  );
}
