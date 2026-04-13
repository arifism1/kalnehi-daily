import { redirect } from "next/navigation";

/** Legacy URL: canonical route is `/self-type-day`. */
export default function SelfTypeLegacyPage() {
  redirect("/self-type-day");
}
