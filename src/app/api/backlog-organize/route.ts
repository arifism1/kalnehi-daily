import { NextResponse } from "next/server";

import { callChatCompletion, type AiChatMessage, type ModelCandidate } from "@/lib/aiChatClient";
import {
  resolveSyllabusExam,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import { resolvePrepbrainGroqModels } from "@/lib/groqPrepbrainModel";
import { parseCuetDomainSubjectsJson, syllabusSubjectInCuetDomains } from "@/lib/cuetDomainSubjects";
import { fetchSyllabusMasterRowsForExam } from "@/lib/syllabusMasterQuery";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USER_ERROR } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

const CATALOG_CAP = 160;
const MAX_BODY = 48_000;

type OrganizeItem = {
  title: string;
  syllabus_master_id: string | null;
  group_label: string | null;
};

function stripJsonFence(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const candidate = fence ? fence[1]!.trim() : t;
  // Extract the outermost JSON object even when prose surrounds it
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first !== -1 && last > first) return candidate.slice(first, last + 1);
  return candidate;
}

function parseOrganizeResponse(text: string): OrganizeItem[] {
  const cleaned = stripJsonFence(text);
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== "object" || !("items" in parsed)) {
    return [];
  }
  const itemsRaw = (parsed as { items: unknown }).items;
  if (!Array.isArray(itemsRaw)) return [];
  const out: OrganizeItem[] = [];
  for (const row of itemsRaw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!title) continue;
    const syllabus_master_id =
      typeof o.syllabus_master_id === "string" ? o.syllabus_master_id.trim() : null;
    const group_label =
      typeof o.group_label === "string" ? o.group_label.trim().slice(0, 120) : null;
    out.push({
      title: title.slice(0, 500),
      syllabus_master_id: syllabus_master_id || null,
      group_label: group_label || null,
    });
  }
  return out;
}

/**
 * POST /api/backlog-organize
 * Body: { transcript: string, mode?: "partial" | "final" }
 */
export async function POST(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }
  const transcript = typeof (body as { transcript?: string }).transcript === "string"
    ? (body as { transcript: string }).transcript.trim().slice(0, 24_000)
    : "";
  if (transcript.length < 3) {
    return NextResponse.json({ ok: false, error: "Say or type what’s pending first." }, { status: 400 });
  }
  const mode =
    (body as { mode?: string }).mode === "partial" ? "partial" : "final";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: USER_ERROR.session }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("primary_exam, target_exam, cuet_domain_subjects, upsc_optional_subjects")
    .eq("user_id", user.id)
    .maybeSingle();

  const examLabel = resolveSyllabusExam(profile) ?? null;
  const examKey = examLabel ? syllabusCatalogExamName(examLabel) : null;
  const upscOptional = Array.isArray(profile?.upsc_optional_subjects)
    ? profile?.upsc_optional_subjects[0]?.trim() || null
    : null;

  let catalogLines: { id: string; subject: string; chapter: string; microtopic: string }[] = [];
  if (examKey) {
    try {
      const rows = await fetchSyllabusMasterRowsForExam(supabase, examKey, upscOptional);
      let filtered = rows;
      if (examKey === "CUET" && profile?.cuet_domain_subjects) {
        const domains = parseCuetDomainSubjectsJson(profile.cuet_domain_subjects);
        if (domains.length > 0) {
          filtered = rows.filter((r) =>
            syllabusSubjectInCuetDomains(r.subject ?? "", domains),
          );
        }
      }
      catalogLines = filtered.slice(0, CATALOG_CAP).map((r) => ({
        id: r.id,
        subject: String(r.subject ?? "").slice(0, 80),
        chapter: String(r.chapter ?? "").slice(0, 120),
        microtopic: String(r.microtopic ?? "").slice(0, 200),
      }));
    } catch (e) {
      console.error("[backlog-organize] catalog fetch", e);
    }
  }

  const catalogJson = JSON.stringify(catalogLines);
  const modeNote =
    mode === "partial"
      ? "Return 1-6 rough items quickly from what they said so far; chips for live UI. Match syllabus UUID only when clearly obvious."
      : "Return a complete structured list of distinct backlog items. Match syllabus_master_id from the catalog when reasonably confident; else null.";

  const system = `You extract exam backlog items from a student venting about what's pending.
Exam context: ${examLabel ?? "unknown"}.
${modeNote}
Rules:
- Output ONLY valid JSON: {"items":[{"title":string,"syllabus_master_id":string|null,"group_label":string|null}]}
- title: short actionable line (subject – topic) when possible.
- group_label: subject / track label for grouping (e.g. Organic Chemistry). May be null.
- Do NOT output durations, time estimates, schedules, or study suggestions — only titles and syllabus mapping.
- Ignore conversational filler ("Hi", "okay so", "I need to", etc.) — extract only the study tasks.
- No markdown, no prose outside JSON.
Catalog microtopics (id, subject, chapter, microtopic) — use id as syllabus_master_id when matched:
${catalogJson}`;

  const messages: AiChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: transcript },
  ];

  const models: ModelCandidate[] = resolvePrepbrainGroqModels({ request, user });
  let textOut = "";
  try {
    const result = await callChatCompletion(models, messages, {
      temperature: mode === "partial" ? 0.2 : 0.25,
      max_tokens: mode === "partial" ? 550 : 1200,
    });
    textOut = result.text ?? "";
  } catch (e) {
    console.error("[backlog-organize] LLM", e);
    return NextResponse.json(
      { ok: false, error: "Could not organize right now. Try again." },
      { status: 503 },
    );
  }

  let items: OrganizeItem[] = [];
  try {
    items = parseOrganizeResponse(textOut);
  } catch (e) {
    console.warn("[backlog-organize] parse", e);
    items = [];
  }

  const chipLabels = items.map((i) =>
    i.group_label ? `${i.group_label}: ${i.title}` : i.title,
  );

  if (mode === "final" && items.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Couldn't extract backlog tasks from that text. Try again, rephrase, or use Exact lines.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    items,
    chips: chipLabels.slice(0, 8),
    exam_label: examLabel,
  });
}
