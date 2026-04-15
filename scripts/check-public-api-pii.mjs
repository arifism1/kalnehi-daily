/**
 * Spot-check public / semi-public API responses for accidental bulk PII
 * (e.g. waitlist-style `{ count, emails: [...] }` leaks).
 *
 * Usage:
 *   node scripts/check-public-api-pii.mjs
 *   API_PII_CHECK_BASE=https://kalnehi.com node scripts/check-public-api-pii.mjs
 *   API_PII_CHECK_BASE=http://localhost:3000 node scripts/check-public-api-pii.mjs
 *
 * Loads `.env.local` then `.env` for NEXT_PUBLIC_SITE_URL when API_PII_CHECK_BASE is unset.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, "utf8");
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i === -1) continue;
        const k = t.slice(0, i).trim();
        let v = t.slice(i + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (process.env[k] === undefined) process.env[k] = v;
      }
    } catch {
      /* ignore */
    }
  }
}

function looksLikeEmailList(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const sample = value.slice(0, 5);
  const emailish = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return sample.every((x) => typeof x === "string" && emailish.test(x));
}

function assertNoBulkEmails(label, data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return;
  const emails = data.emails;
  if (Array.isArray(emails) && looksLikeEmailList(emails)) {
    throw new Error(
      `${label}: response contains suspicious top-level "emails" array (${emails.length} entries)`,
    );
  }
}

async function fetchJson(method, url, init) {
  const r = await fetch(url, init);
  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _nonJson: text.slice(0, 200) };
  }
  return { status: r.status, data, rawLen: text.length };
}

async function main() {
  loadEnvFiles();
  const base = (
    process.env.API_PII_CHECK_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://kalnehi.com"
  ).replace(/\/+$/, "");

  console.log(`[check-public-api-pii] base=${base}`);

  const checks = [
    {
      name: "GET /api/fcm/capabilities",
      run: () => fetchJson("GET", `${base}/api/fcm/capabilities`),
      expectStatus: [200],
    },
    {
      name: "GET /api/prepbrain/usage (unauthenticated)",
      run: () => fetchJson("GET", `${base}/api/prepbrain/usage`),
      expectStatus: [401],
    },
    {
      name: "GET /api/digital-asset-links",
      run: () => fetchJson("GET", `${base}/api/digital-asset-links`),
      expectStatus: [200, 503],
    },
    {
      name: "POST /api/contact-support (validation failure)",
      run: () =>
        fetchJson("POST", `${base}/api/contact-support`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "",
            email: "spot-check@example.com",
            subject: "bug",
            message: "x",
          }),
        }),
      expectStatus: [400],
    },
  ];

  for (const c of checks) {
    const { status, data } = await c.run();
    if (!c.expectStatus.includes(status)) {
      throw new Error(`${c.name}: expected status ${c.expectStatus.join("|")}, got ${status}`);
    }
    assertNoBulkEmails(c.name, data);
    const keys =
      data && typeof data === "object" && !Array.isArray(data)
        ? Object.keys(data).join(", ")
        : "(non-object)";
    console.log(`  OK ${c.name} -> ${status} keys=${keys}`);
  }

  console.log("[check-public-api-pii] all checks passed.");
}

main().catch((e) => {
  console.error("[check-public-api-pii] FAILED:", e.message || e);
  process.exit(1);
});
