import { redirect } from "next/navigation";

export default function DictateDayPage() {
  redirect("/daily-plan?open=dictate");
}
