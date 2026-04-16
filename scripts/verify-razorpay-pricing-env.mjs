/**
 * Verifies local (.env / .env.local) Razorpay keys and plan resolution for pricing checkout.
 * Mirrors resolve logic in src/actions/subscription.ts (monthly INR amounts in paise).
 *
 * Usage:
 *   node scripts/verify-razorpay-pricing-env.mjs
 *   NODE_ENV=production node scripts/verify-razorpay-pricing-env.mjs   # stricter Pro (no dev fallback)
 *
 * Requires: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 * Optional: RAZORPAY_PLAN_ID_BASIC, RAZORPAY_PLAN_ID_PRO, RAZORPAY_PLAN_ID_PRO_MAX
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Razorpay from "razorpay";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Must match src/lib/subscriptionTiers.ts TIERS[*].monthlyPricePaise */
const TIER_EXPECTED_PAISE = {
  basic: 9900,
  pro: 29900,
  pro_max: 49900,
};

const RAZORPAY_PLAN_ID_FORMAT_RE = /^plan_[A-Za-z0-9]+$/;
const RAZORPAY_PLAN_ID_PRO_FALLBACK = "plan_SbOStQOx52JVpG";

const ENV_NAMES = {
  basic: "RAZORPAY_PLAN_ID_BASIC",
  pro: "RAZORPAY_PLAN_ID_PRO",
  pro_max: "RAZORPAY_PLAN_ID_PRO_MAX",
};

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

function resolvePlanIdFromEnvOnly(tier) {
  const envName = ENV_NAMES[tier];
  const trimmed = process.env[envName]?.trim() ?? "";
  if (trimmed && RAZORPAY_PLAN_ID_FORMAT_RE.test(trimmed)) {
    return { source: "env", planId: trimmed };
  }
  if (trimmed && !RAZORPAY_PLAN_ID_FORMAT_RE.test(trimmed)) {
    return { source: "invalid_env", envName };
  }
  if (tier === "pro" && trimmed === "") {
    if (process.env.NODE_ENV === "production") {
      return { source: "needs_api_or_env", envName };
    }
    if (RAZORPAY_PLAN_ID_FORMAT_RE.test(RAZORPAY_PLAN_ID_PRO_FALLBACK)) {
      return { source: "dev_fallback", planId: RAZORPAY_PLAN_ID_PRO_FALLBACK };
    }
  }
  return { source: "needs_api_or_env", envName };
}

loadEnvFiles();

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!keyId || !keySecret) {
  console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET. Add them to .env.local (see .env.example).");
  process.exit(1);
}

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

let allPlans = [];
try {
  for (let skip = 0; skip < 1000; skip += 100) {
    const res = await razorpay.plans.all({ count: 100, skip });
    const items = res.items ?? [];
    if (items.length === 0) break;
    allPlans = allPlans.concat(items);
  }
} catch (e) {
  console.error("Razorpay plans.all failed:", e?.message ?? e);
  process.exit(1);
}

function matchesForPaise(expectedPaise) {
  const out = [];
  for (const p of allPlans) {
    const id = p.id?.trim();
    const amt = Number(p.item?.amount);
    const cur = (p.item?.currency ?? "INR").toUpperCase();
    const period = (p.period ?? "").toLowerCase();
    if (
      id &&
      RAZORPAY_PLAN_ID_FORMAT_RE.test(id) &&
      cur === "INR" &&
      amt === expectedPaise &&
      period === "monthly"
    ) {
      out.push(id);
    }
  }
  return out;
}

let exitCode = 0;
const tiers = ["basic", "pro", "pro_max"];

console.log("Razorpay pricing env check");
console.log(`NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);
console.log("—");

for (const tier of tiers) {
  const expectedPaise = TIER_EXPECTED_PAISE[tier];
  const envName = ENV_NAMES[tier];
  const fromEnv = resolvePlanIdFromEnvOnly(tier);

  if (fromEnv.source === "invalid_env") {
    console.error(`[${tier}] FAIL: ${envName} is set but does not look like plan_xxx`);
    exitCode = 1;
    continue;
  }

  if (fromEnv.planId) {
    console.log(`[${tier}] OK via ${fromEnv.source} (${fromEnv.planId}) — ${expectedPaise} paise/mo`);
    continue;
  }

  const matches = matchesForPaise(expectedPaise);
  if (matches.length === 1) {
    console.log(
      `[${tier}] OK via API fallback (unique monthly INR plan ${matches[0]}) — ${expectedPaise} paise/mo`,
    );
    continue;
  }
  if (matches.length > 1) {
    console.error(
      `[${tier}] FAIL: ambiguous — ${matches.length} plans match ${expectedPaise} paise/mo. Set ${envName} to one plan id.`,
    );
    exitCode = 1;
    continue;
  }

  console.error(
    `[${tier}] FAIL: no monthly INR plan found for ${expectedPaise} paise. Set ${envName} in Vercel Production or create the plan in Razorpay.`,
  );
  exitCode = 1;
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  console.log("—");
  console.warn("Note: SUPABASE_SERVICE_ROLE_KEY is unset — server checkout also needs it for profile updates.");
}

process.exit(exitCode);
