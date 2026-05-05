/**
 * Static wiring checks for Doubt Tracker voice → VoiceDoubtPreviewSheet → createDoubt.
 * Run: `npm run test:doubt-voice`
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("DoubtTracker: single open path after tagged API success; guards before open", () => {
  const fp = path.join(__dirname, "DoubtTracker.tsx");
  const s = fs.readFileSync(fp, "utf8");
  const opens = s.match(/setVoicePreviewOpen\(true\)/g) ?? [];
  assert.equal(
    opens.length,
    1,
    "Voice preview sheet should open from exactly one success path",
  );
  const idxOpen = s.indexOf("setVoicePreviewOpen(true)");
  assert.ok(s.includes("if (!parseRes.ok || !data.ok)"));
  const idxErr = s.indexOf("if (!parseRes.ok || !data.ok)");
  assert.ok(idxErr !== -1 && idxErr < idxOpen);

  assert.ok(s.indexOf("if (!cleaned)") < idxOpen);
  assert.ok(s.indexOf("if (!user?.id)") < idxOpen);
  assert.match(s, /<VoiceDoubtPreviewSheet[\s\S]*open=\{voicePreviewOpen\}/);
});

test("VoiceDoubtPreviewSheet: save creates doubt in store", () => {
  const fp = path.join(__dirname, "VoiceDoubtPreviewSheet.tsx");
  const s = fs.readFileSync(fp, "utf8");
  assert.match(s, /createDoubt\(\s*\{/);
});

test("doubt-voice-tag API: empty transcript returns 400 before auth", () => {
  const fp = path.join(
    __dirname,
    "../../app/api/doubt-voice-tag/route.ts",
  );
  const s = fs.readFileSync(fp, "utf8");
  const idxEmpty = s.indexOf("if (!raw)");
  const idxSupabaseCall = s.indexOf("await createSupabaseServerClient");
  assert.ok(
    idxEmpty !== -1 &&
      idxSupabaseCall !== -1 &&
      idxEmpty < idxSupabaseCall,
  );
});
