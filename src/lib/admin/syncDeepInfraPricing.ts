"use server";

import { revalidatePath } from "next/cache";

import { fetchDeepInfraModelPriceInrPerM } from "@/lib/admin/deepInfraPublicPricing";
import { getAllAdminConfig, setAdminConfig } from "@/lib/waitlist/batchEngine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { MASTERMIND_DEEPINFRA_MODEL } from "@/lib/groqPrepbrainModel";

export type DeepInfraSyncedModel = {
  kind: "deepinfra_chat" | "mastermind_mistral";
  modelSlug: string;
  inputInrPerM: number;
  outputInrPerM: number;
};

export type SyncDeepInfraResult =
  | { ok: true; synced: DeepInfraSyncedModel[]; partialErrors?: string[] }
  | { ok: false; error: string };

export async function syncDeepInfraPricing(): Promise<SyncDeepInfraResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email);
  if (!isAdmin) return { ok: false, error: "Admin access required." };

  const cfg = await getAllAdminConfig();
  const usdToInr = parseFloat(cfg.ai_usd_to_inr_rate ?? "95");
  const usdToInrRate = Number.isFinite(usdToInr) && usdToInr > 0 ? usdToInr : 95;

  const chatSlug = process.env.DEEPINFRA_CHAT_MODEL?.trim();
  const synced: DeepInfraSyncedModel[] = [];
  const partialErrors: string[] = [];

  if (chatSlug) {
    const result = await fetchDeepInfraModelPriceInrPerM(chatSlug, usdToInrRate, {
      revalidateSeconds: false,
    });
    if ("error" in result) {
      partialErrors.push(`Chat model (${chatSlug}): ${result.error}`);
    } else {
      await Promise.all([
        setAdminConfig("ai_deepinfra_input_inr_per_m", String(result.inputInrPerM), user.id),
        setAdminConfig("ai_deepinfra_output_inr_per_m", String(result.outputInrPerM), user.id),
      ]);
      synced.push({
        kind: "deepinfra_chat",
        modelSlug: chatSlug,
        inputInrPerM: result.inputInrPerM,
        outputInrPerM: result.outputInrPerM,
      });
    }
  }

  const mistralResult = await fetchDeepInfraModelPriceInrPerM(MASTERMIND_DEEPINFRA_MODEL, usdToInrRate, {
    revalidateSeconds: false,
  });
  if ("error" in mistralResult) {
    partialErrors.push(`Mastermind Mistral (${MASTERMIND_DEEPINFRA_MODEL}): ${mistralResult.error}`);
  } else {
    await Promise.all([
      setAdminConfig("ai_deepinfra_mistral_input_inr_per_m", String(mistralResult.inputInrPerM), user.id),
      setAdminConfig("ai_deepinfra_mistral_output_inr_per_m", String(mistralResult.outputInrPerM), user.id),
    ]);
    synced.push({
      kind: "mastermind_mistral",
      modelSlug: MASTERMIND_DEEPINFRA_MODEL,
      inputInrPerM: mistralResult.inputInrPerM,
      outputInrPerM: mistralResult.outputInrPerM,
    });
  }

  if (synced.length === 0) {
    return {
      ok: false,
      error:
        partialErrors.length > 0
          ? partialErrors.join(" · ")
          : "No models could be synced.",
    };
  }

  revalidatePath("/admin/config");
  revalidatePath("/admin/ai-usage");

  return {
    ok: true,
    synced,
    partialErrors: partialErrors.length > 0 ? partialErrors : undefined,
  };
}
