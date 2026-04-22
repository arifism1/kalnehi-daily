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
echo ""

echo "POST /api/prepbrain/chat (LLM path — expects 200 + text/event-stream with SSE done event)"
# Body: conversationId (camelCase) is optional; omit when starting a new thread.
# Successful completions stream chunk events, then a final data: { type: \"done\", ... }.
tmp_body=$(mktemp)
tmp_hdr=$(mktemp)
cleanup() { rm -f "$tmp_body" "$tmp_hdr"; }
trap cleanup EXIT
http_code=$(
  curl -sS -o "$tmp_body" -D "$tmp_hdr" -w "%{http_code}" \
    -X POST "$BASE_URL/api/prepbrain/chat" \
    "${HDR[@]}" \
    -d '{"messages":[{"role":"user","content":"What is the strongest topic in my syllabus overview?"}]}'
)
content_type=$(grep -i '^content-type:' "$tmp_hdr" 2>/dev/null | tr -d '\r' || true)
printf "  HTTP %s\n  %s\n" "$http_code" "$content_type"
if [[ "$http_code" == "200" ]]; then
  if echo "$content_type" | grep -qi 'text/event-stream'; then
    if ! grep -q '"type":"done"' "$tmp_body"; then
      echo "  ERROR: 200 and SSE content-type but no done event. First 600 bytes of body:" >&2
      head -c 600 "$tmp_body" >&2 || true
      echo "" >&2
      exit 1
    fi
    # Last SSE line for type done (ok true/false, usage, conversation_id, etc.)
    done_line=$(
      grep '^data: ' "$tmp_body" 2>/dev/null | grep '"type":"done"' | tail -1 | sed 's/^data: //' | tr -d '\r'
    )
    if [[ -z "${done_line// /}" ]]; then
      echo "  ERROR: could not extract done JSON" >&2
      exit 1
    fi
    if command -v jq >/dev/null 2>&1; then
      echo "  done event (jq):"
      echo "$done_line" | jq -c . 2>/dev/null | head -c 2000
      echo ""
    else
      echo "  done event (raw, first 2000 chars):"
      out="${done_line:0:2000}"
      printf "%s" "$out"
      if ((${#done_line} > 2000)); then echo "…"; else echo ""; fi
    fi
  else
    # Unusual: 200 with JSON (e.g. if handler changes)
    echo "  body (first 1000):"
    head -c 1000 "$tmp_body"
    echo ""
  fi
else
  echo "  error body (first 1000):"
  head -c 1000 "$tmp_body"
  echo ""
fi
echo ""
echo "POST /api/helpyji/chat (minimal body — adjust to match your API contract)"
curl -sS "${HDR[@]}" -X POST "$BASE_URL/api/helpyji/chat" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"session_id":"smoke-test"}' | head -c 1200
echo ""
echo ""
echo "Done. 403/429 on chat when not allowed; PrepBrain LLM path returns SSE — usage is in the final data: {type:done, usage:...}. Token finalize may complete shortly after the response ends."
