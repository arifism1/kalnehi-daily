import Link from "next/link";
import { BookOpen } from "lucide-react";

import { SyllabusTracker } from "@/components/syllabus/SyllabusTracker";
import { resolveSyllabusExam } from "@/lib/examProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SyllabusPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let examLabel: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("primary_exam, target_exam")
      .eq("user_id", user.id)
      .maybeSingle();
    examLabel = resolveSyllabusExam(profile);
  }

  if (user && examLabel) {
    return <SyllabusTracker />;
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-kal-border bg-kal-card px-8 py-12 text-center kal-shadow-card">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-kal-border bg-kal-card-muted">
        <BookOpen className="h-8 w-8 text-kal-muted" aria-hidden />
      </div>
      <h1 className="mt-6 text-lg font-bold text-kal-text">Choose your target exam</h1>
      <p className="mt-2 text-sm leading-relaxed text-kal-muted">
        Set <strong className="text-kal-text">Target exam</strong> in your profile
        so we load the matching syllabus (NEET UG, JEE Main, and more as we ship
        catalogs).
      </p>
      <Link
        href="/profile"
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-kal-accent px-6 text-sm font-semibold text-kal-accent-foreground transition-opacity hover:bg-kal-accent-hover"
      >
        Open profile
      </Link>
    </div>
  );
}
