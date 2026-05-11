import { format } from "date-fns";

import { HomeClient } from "@/components/home/HomeClient";
import {
  pickDailyPhraseIndex,
  type DailyMotivationalPhraseRow,
} from "@/lib/dailyMotivationalPhrase";
import { kalnehiPageMetadata } from "@/lib/seo-metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = kalnehiPageMetadata("home");

export default async function HomePage() {
  const todayYmd = format(new Date(), "yyyy-MM-dd");

  let dailyPhrase: DailyMotivationalPhraseRow | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("daily_motivational_phrases")
      .select("id, phrase, author, category")
      .eq("active", true)
      .order("phrase", { ascending: true });
    if (!error && data?.length) {
      const idx = pickDailyPhraseIndex(todayYmd, data.length);
      dailyPhrase = data[idx] ?? null;
    }
  } catch {
    dailyPhrase = null;
  }

  return <HomeClient dailyPhrase={dailyPhrase} />;
}
