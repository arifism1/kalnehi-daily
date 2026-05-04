import { permanentRedirect } from "next/navigation";

export default function LegacyTaskListRedirect() {
  permanentRedirect("/backlog-list");
}
