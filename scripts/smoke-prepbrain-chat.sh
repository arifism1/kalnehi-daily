#!/usr/bin/env bash
# App smoke: PrepBrain + HelpyJi chat (requires local dev server + valid session cookie).
# Usage:
#   export BASE_URL=http://localhost:3000
#   export SESSION_COOKIE='sb-...-auth-token=...'
#   ./scripts/smoke-prepbrain-chat.sh
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000}"
if [[ -z "${SESSION_COOKIE:-}" ]]; then
  echo "Set SESSION_COOKIE to your Supabase auth cookie from the browser (Application > Cookies)." >&2
  exit 1
fi
HDR=(-H "Cookie: $SESSION_COOKIE" -H "Content-Type: application/json")

echo "GET /api/prepbrain/usage"
curl -sS "${HDR[@]}" "$BASE_URL/api/prepbrain/usage" | head -c 800
echo ""

echo "POST /api/prepbrain/chat (non-small_talk: syllabus question)"
curl -sS "${HDR[@]}" -X POST "$BASE_URL/api/prepbrain/chat" \
  -d '{"messages":[{"role":"user","content":"What is the strongest topic in my syllabus overview?"}],"conversation_id":null}' | head -c 1200
echo ""

echo "POST /api/helpyji/chat (minimal body — adjust to match your API contract)"
curl -sS "${HDR[@]}" -X POST "$BASE_URL/api/helpyji/chat" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"session_id":"smoke-test"}' | head -c 1200
echo ""
echo "Done. Expect 403 on chat when tokens exhausted; usage JSON should reflect post-finalize counters."
