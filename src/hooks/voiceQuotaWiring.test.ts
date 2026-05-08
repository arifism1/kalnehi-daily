/**
 * Static wiring checks for Web Speech voice quota (no double billing on parse/command routes).
 * Run: npm run test:voice-quota-wiring
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");

test("consume route: headroom checked before increment; auth gate present", () => {
  const fp = path.join(
    repoRoot,
    "src/app/api/voice-usage/consume/route.ts",
  );
  const src = fs.readFileSync(fp, "utf8");
  const idxFn = src.indexOf("export async function POST");
  assert.ok(idxFn !== -1);
  const s = src.slice(idxFn);
  const idxHeadroom = s.indexOf("ensureVoiceMinuteHeadroom");
  const idxIncrement = s.indexOf("incrementVoiceMinuteUsage");
  const idxAuth = s.indexOf("await supabase.auth.getUser()");
  assert.ok(idxAuth !== -1 && idxAuth < idxHeadroom && idxHeadroom < idxIncrement);
});

test("useDeviceSpeechRecognition: emits transcript before quota when reportUsage is onTranscript", () => {
  const fp = path.join(repoRoot, "src/hooks/useDeviceSpeechRecognition.ts");
  const s = fs.readFileSync(fp, "utf8");
  assert.match(s, /reportUsage\s*=\s*"none"/);
  assert.match(s, /\/api\/voice-usage\/consume/);
  const idxEmit = s.indexOf("onTranscriptRef.current?.(transcriptPayload)");
  const idxConsume = s.indexOf("/api/voice-usage/consume");
  assert.ok(idxEmit !== -1 && idxConsume !== -1 && idxEmit < idxConsume);
});

test("DailyReflectionClient + AddMistakeSheet: conditional onTranscript for Web Speech only", () => {
  for (const rel of [
    "src/components/reflection/DailyReflectionClient.tsx",
    "src/components/mistake-log/AddMistakeSheet.tsx",
  ]) {
    const s = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    assert.match(
      s,
      /reportUsage:\s*routing\.useWebSpeechStt\s*\?\s*"onTranscript"\s*:\s*"none"/,
    );
  }
});

test("Backlog Speak: long-form timing + Web Speech quota routing", () => {
  const s = fs.readFileSync(
    path.join(repoRoot, "src/components/backlog/BacklogTrackerClient.tsx"),
    "utf8",
  );
  assert.ok(s.includes("VOICE_LONG_FORM_MAX_SESSION_MS"));
  assert.ok(s.includes("VOICE_LONG_FORM_SILENCE_MS"));
  assert.ok(s.includes("useVoiceSttRouting"));
  assert.ok(s.includes("useMediaRecorderVoice"));
  assert.ok(s.includes("routing.useBrowserWhisperStt"));
  assert.match(
    s,
    /reportUsage:\s*routing\.useWebSpeechStt\s*\?\s*"onTranscript"\s*:\s*"none"/,
  );
});

test("parse-heavy surfaces do not enable reportUsage onTranscript globally", () => {
  const files = [
    "src/components/voice/DictateMyDay.tsx",
    "src/components/doubts/DoubtTracker.tsx",
    "src/components/voice/GlobalVoiceSheet.tsx",
    "src/components/revision/ScheduleRevisionReminderDialog.tsx",
  ];
  for (const rel of files) {
    const s = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    assert.ok(
      !s.includes('reportUsage: "onTranscript"'),
      `${rel}: must not hard-code onTranscript (default none avoids double billing)`,
    );
    assert.ok(
      !s.includes("routing.useWebSpeechStt ? \"onTranscript\""),
      `${rel}: must not use Web Speech quota side-channel`,
    );
  }
});

test("SubscriptionAccessProvider listens for kalnehi:profile-updated with silent refetch", () => {
  const s = fs.readFileSync(
    path.join(repoRoot, "src/hooks/useSubscriptionAccess.tsx"),
    "utf8",
  );
  assert.ok(s.includes("KALNEHI_PROFILE_UPDATED_EVENT"));
  assert.match(s, /addEventListener\(\s*KALNEHI_PROFILE_UPDATED_EVENT/);
  assert.ok(s.includes("refetch({ silent: true })"));
});
