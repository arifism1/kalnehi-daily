import { redirect } from "next/navigation";

export default function WelcomeMorningRedirectPage() {
  redirect("/home");
}
