import { permanentRedirect } from "next/navigation";

export default function BacklogTrackerRedirectPage() {
  permanentRedirect("/backlogs?tab=schedule");
}
