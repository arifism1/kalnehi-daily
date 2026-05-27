import type { SupabaseClient } from "@supabase/supabase-js";

import { asUntypedServiceRole, type TypedServiceRole } from "@/lib/supabase/serviceRoleUntyped";

const DEEPINFRA_EMBEDDINGS_URL = "https://api.deepinfra.com/v1/openai/embeddings";
export const PREPBRAIN_EMBEDDING_MODEL =
  process.env.PREPBRAIN_EMBEDDING_MODEL?.trim() || "BAAI/bge-large-en-v1.5";
export const PREPBRAIN_EMBEDDING_DIM = 1024;

export type PrepbrainEmbeddingSourceType =
  | "study_session"
  | "doubt"
  | "syllabus_topic"
  | "daily_reflection";

export async function createPrepbrainEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.DEEPINFRA_API_KEY?.trim();
  if (!apiKey || !text.trim()) return null;

  const resp = await fetch(DEEPINFRA_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PREPBRAIN_EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  });

  if (!resp.ok) return null;
  const json = (await resp.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const vec = json.data?.[0]?.embedding;
  if (!vec?.length) return null;
  return vec;
}

export async function upsertPrepbrainEmbedding(
  admin: TypedServiceRole,
  row: {
    userId: string;
    sourceType: PrepbrainEmbeddingSourceType;
    sourceId: string;
    content: string;
    embedding: number[];
    sourceUpdatedAt?: string | null;
  },
): Promise<void> {
  const db = asUntypedServiceRole(admin);
  await db.from("prepbrain_embeddings").upsert(
    {
      user_id: row.userId,
      source_type: row.sourceType,
      source_id: row.sourceId,
      content: row.content.slice(0, 4000),
      embedding: JSON.stringify(row.embedding),
      source_updated_at: row.sourceUpdatedAt ?? null,
    },
    { onConflict: "user_id,source_type,source_id" },
  );
}

export async function fetchPrepbrainRagContext(
  admin: TypedServiceRole,
  userId: string,
  queryText: string,
  matchCount = 5,
): Promise<string> {
  const embedding = await createPrepbrainEmbedding(queryText);
  if (!embedding) return "";

  const { data, error } = await asUntypedServiceRole(admin).rpc("match_prepbrain_user_context", {
    p_user_id: userId,
    p_query_embedding: JSON.stringify(embedding),
    p_match_threshold: 0.45,
    p_match_count: matchCount,
  });

  if (error || !data?.length) return "";

  const lines = (data as Array<{ source_type: string; content: string; similarity: number }>)
    .map(
      (r, i) =>
        `${i + 1}. [${r.source_type}] ${r.content.slice(0, 400)} (sim ${Number(r.similarity).toFixed(2)})`,
    )
    .join("\n");

  return `--- RELEVANT CONTEXT FROM YOUR HISTORY ---\n${lines}\n--- END RELEVANT CONTEXT ---`;
}
