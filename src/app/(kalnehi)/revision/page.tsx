import { redirect } from "next/navigation";

export default function LegacyRevisionRedirect() {
  redirect("/revision-engine");
}
