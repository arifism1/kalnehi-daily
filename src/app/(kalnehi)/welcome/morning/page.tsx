import { redirect } from "next/navigation";

import { APP_HOME_PATH } from "@/config/appRoutes";

export default function WelcomeMorningRedirectPage() {
  redirect(APP_HOME_PATH);
}
