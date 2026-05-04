/**
 * k6 spike test — 0 → 200 VUs in 30s, hold 2m, ramp down.
 * Same requests, checks, and per-endpoint tags as loadtest.js.
 *
 * Requires: BASE_URL
 * See README-loadtest.md before running against any shared environment.
 */

import http from "k6/http";
import { check, sleep } from "k6";

const randomIntBetween = (min, max) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

export const options = {
  stages: [
    { duration: "30s", target: 200 },
    { duration: "2m", target: 200 },
    { duration: "30s", target: 0 },
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

  if (__ENV.K6_ADMIN_SESSION_COOKIE) {
    res = http.get(`${BASE_URL}/api/admin/daily-cap`, {
      headers: adminHeaders(),
      tags: { name: "GET_/api/admin/daily-cap" },
    });
    assert200("GET_/api/admin/daily-cap", res);
    sleep(randomIntBetween(1, 2));
  }

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
      "[loadtest-spike] BASE_URL not set; defaulting to http://localhost:3000",
    );
  }
}
