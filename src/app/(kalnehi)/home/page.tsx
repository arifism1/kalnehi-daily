import { redirect } from "next/navigation";

import { APP_DASHBOARD_PATH } from "@/config/appRoutes";

export default function HomeRedirectPage() {
  redirect(APP_DASHBOARD_PATH);
}
