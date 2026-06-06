"use server";

import {
  recordDpdpSignupConsent,
  type DpdpConsentMethod,
} from "@/lib/dpdp/consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function recordConsentAction(method: DpdpConsentMethod) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Unauthorized." };
  }

  return recordDpdpSignupConsent({ userId: user.id, method });
}
