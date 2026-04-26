import { permanentRedirect } from "next/navigation";

export default function DailyLogRedirectPage() {
  permanentRedirect("/daily-debrief");
}
