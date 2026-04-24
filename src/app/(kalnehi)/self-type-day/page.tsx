import { redirect } from "next/navigation";

export default function SelfTypeDayRoutePage() {
  redirect("/daily-plan?open=self-type");
}
