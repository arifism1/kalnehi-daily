import { redirect } from "next/navigation";

/** @deprecated Use /settings — profile and preferences were merged. */
export default function ProfilePage() {
  redirect("/settings");
}
