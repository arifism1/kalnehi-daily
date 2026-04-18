import { redirect } from "next/navigation";

/** Back-compat: smart / voice notifications live on the notification hub. */
export default function RemindersRedirect() {
  redirect("/notification");
}
