import PrepBrainRouteLazy from "../prepbrain/PrepBrainRouteLazy";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("mastermind");

export default function MastermindPage() {
  return <PrepBrainRouteLazy />;
}
