import { permanentRedirect } from "next/navigation";

export default function BacklogListRedirectPage() {
  permanentRedirect("/backlogs");
}
