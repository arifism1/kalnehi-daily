import { redirect } from "next/navigation";

/** Legacy/alternate URL: Smart Notifications hub lives at `/notification`. */
export default function RemindersRedirectPage() {
  redirect("/notification");
}
