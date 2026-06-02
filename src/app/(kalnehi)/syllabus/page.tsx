import Link from "next/link";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { SyllabusEmptyIllustration } from "@/components/illustrations/SyllabusEmptyIllustration";

import { SyllabusShell } from "./SyllabusShell";
import { resolveSyllabusExam } from "@/lib/examProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = kalnehiPageMetadata("syllabus");

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
    return <SyllabusShell />;
  }

  return (
    <div className="kal-glass-panel mx-auto max-w-lg rounded-2xl px-8 py-10 text-center">
      <SyllabusEmptyIllustration className="mx-auto size-44" />
      <h1 className="kal-feature-title mt-4">Choose your target exam</h1>
      <p className="mt-2 text-sm leading-relaxed text-kal-muted">
        Set <strong className="text-kal-text">Target exam</strong> in Profile
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
