/**
 * k6 load test — ramp 10 → 50 → 100 → 200 VUs.
 *
 * Requires: BASE_URL (e.g. https://staging.example.com)
 * Optional: K6_SESSION_COOKIE — raw Cookie header for a staging test user
 * Optional: K6_ADMIN_SESSION_COOKIE — only for isolated admin GET smoke (dangerous on prod)
 * Optional: K6_CRON_SECRET — strongly discouraged; cron jobs have real side effects
 *
 * Dry run: BASE_URL=... k6 run --vus 1 --duration 30s loadtest.js
 */

import http from "k6/http";
import { check, sleep } from "k6";

const randomIntBetween = (min, max) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "2m", target: 50 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function sessionHeaders() {
  const h = { Accept: "application/json" };
  const c = __ENV.K6_SESSION_COOKIE;
  if (c) h.Cookie = c;
  return h;
}

function adminHeaders() {
  const h = { Accept: "application/json" };
  const c = __ENV.K6_ADMIN_SESSION_COOKIE;
  if (c) h.Cookie = c;
  return h;
}

function jsonHeaders() {
  return { ...sessionHeaders(), "Content-Type": "application/json" };
}

function assert200(name, res) {
  check(res, {
    [`${name} status is 200`]: (r) => r.status === 200,
    [`${name} duration < 2000ms`]: (r) => r.timings.duration < 2000,
  });
}

export default function () {
  const hdr = sessionHeaders();
  const jsonHdr = jsonHeaders();

  // ── Public GETs ─────────────────────────────────────────────
  let res = http.get(`${BASE_URL}/api/app-status`, {
    headers: hdr,
    tags: { name: "GET_/api/app-status" },
  });
  assert200("GET_/api/app-status", res);
  sleep(randomIntBetween(1, 2));

  res = http.get(`${BASE_URL}/api/digital-asset-links`, {
    headers: hdr,
    tags: { name: "GET_/api/digital-asset-links" },
  });
  assert200("GET_/api/digital-asset-links", res);
  sleep(randomIntBetween(1, 2));

  res = http.get(`${BASE_URL}/api/fcm/capabilities`, {
    headers: hdr,
    tags: { name: "GET_/api/fcm/capabilities" },
  });
  assert200("GET_/api/fcm/capabilities", res);
  sleep(randomIntBetween(1, 2));

  res = http.get(
    `${BASE_URL}/api/og?type=default&title=LoadTest&subtitle=k6`,
    {
      headers: { Accept: "image/*,*/*" },
      tags: { name: "GET_/api/og" },
    },
  );
  assert200("GET_/api/og", res);
  sleep(randomIntBetween(1, 2));

  // ── Authenticated GETs (skip entire block if no session cookie) ──
  if (__ENV.K6_SESSION_COOKIE) {
    res = http.get(`${BASE_URL}/api/feature-flags`, {
      headers: hdr,
      tags: { name: "GET_/api/feature-flags" },
    });
    assert200("GET_/api/feature-flags", res);
    sleep(randomIntBetween(1, 2));

    res = http.get(`${BASE_URL}/api/user/custom-reminders`, {
      headers: hdr,
      tags: { name: "GET_/api/user/custom-reminders" },
    });
    assert200("GET_/api/user/custom-reminders", res);
    sleep(randomIntBetween(1, 2));

    res = http.get(`${BASE_URL}/api/prepbrain/usage`, {
      headers: hdr,
      tags: { name: "GET_/api/prepbrain/usage" },
    });
    assert200("GET_/api/prepbrain/usage", res);
    sleep(randomIntBetween(1, 2));

    res = http.get(`${BASE_URL}/api/user/system-push`, {
      headers: hdr,
      tags: { name: "GET_/api/user/system-push" },
    });
    assert200("GET_/api/user/system-push", res);
    sleep(randomIntBetween(1, 2));
  }

  // ── Safe POST (staging preferred — touches DB) ──────────────
  res = http.post(
    `${BASE_URL}/api/referral/event`,
    JSON.stringify({
      event_type: "link_clicked",
      referral_code: "LOADTEST",
    }),
    {
      headers: jsonHdr,
      tags: { name: "POST_/api/referral/event" },
    },
  );
  assert200("POST_/api/referral/event", res);
  sleep(randomIntBetween(1, 2));

  // ── Optional admin smoke (GET only; still risky on prod) ─────
  if (__ENV.K6_ADMIN_SESSION_COOKIE) {
    res = http.get(`${BASE_URL}/api/admin/daily-cap`, {
      headers: adminHeaders(),
      tags: { name: "GET_/api/admin/daily-cap" },
    });
    assert200("GET_/api/admin/daily-cap", res);
    sleep(randomIntBetween(1, 2));
  }

  // ── Optional cron (NOT recommended — real side effects) ─────
  if (__ENV.K6_CRON_SECRET) {
    res = http.get(`${BASE_URL}/api/cron/reset-ai-tokens`, {
      headers: {
        Authorization: `Bearer ${__ENV.K6_CRON_SECRET}`,
      },
      tags: { name: "GET_/api/cron/reset-ai-tokens" },
    });
    assert200("GET_/api/cron/reset-ai-tokens", res);
    sleep(randomIntBetween(1, 2));
  }
}

export function setup() {
  if (!__ENV.BASE_URL) {
    console.warn(
      "[loadtest] BASE_URL not set; defaulting to http://localhost:3000",
    );
  }
}
