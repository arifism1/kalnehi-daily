/**
 * Sandbox / QA: print Razorpay subscription billing-cycle fields after trial → charge → before upgrade.
 * Use to confirm remaining_count / paid_count / total_count match expectations for createPlanUpgradeOrder.
 *
 * Loads .env.local then .env (same pattern as verify-fcm-setup.mjs).
 *
 * Usage:
 *   node scripts/verify-razorpay-subscription-counts.mjs sub_xxxxxxxxxxxx
 *   RAZORPAY_DEBUG_SUBSCRIPTION_ID=sub_xxx node scripts/verify-razorpay-subscription-counts.mjs
 *
 * Requires: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Razorpay from "razorpay";

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

loadEnvFiles();

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
const subId =
  process.argv[2]?.trim() ||
  process.env.RAZORPAY_DEBUG_SUBSCRIPTION_ID?.trim() ||
  "";

if (!keyId || !keySecret) {
  console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.");
  process.exit(1);
}

if (!subId || !/^sub_[a-zA-Z0-9]+$/.test(subId)) {
  console.error(
    "Pass subscription id as first argument or set RAZORPAY_DEBUG_SUBSCRIPTION_ID (e.g. sub_xxxxx).",
  );
  process.exit(1);
}

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

try {
  const sub = await razorpay.subscriptions.fetch(subId);
  const s = /** @type {Record<string, unknown>} */ (sub);
  const pick = (k) => s[k];
  console.log(JSON.stringify({ id: pick("id"), status: pick("status") }, null, 0));
  console.log(
    JSON.stringify(
      {
        total_count: pick("total_count"),
        paid_count: pick("paid_count"),
        remaining_count: pick("remaining_count"),
        current_start: pick("current_start"),
        current_end: pick("current_end"),
        notes: pick("notes"),
      },
      null,
      2,
    ),
  );
  const total = Number(pick("total_count"));
  const paid = Number(pick("paid_count"));
  const rem = Number(pick("remaining_count"));
  if (Number.isFinite(total) && Number.isFinite(paid)) {
    console.log(`computed total - paid = ${total - paid}`);
  }
  if (Number.isFinite(rem)) {
    console.log(`Upgrade createPlanUpgradeOrder would use total_count ≈ ${Math.max(1, Math.trunc(rem))} (from remaining_count or fallback logic in app).`);
  }
} catch (e) {
  console.error("Fetch failed:", e?.message || e);
  process.exit(1);
}
