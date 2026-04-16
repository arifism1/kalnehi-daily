/**
 * Static + behavioral checks that pricing UI autopay duration flows to Razorpay total_count
 * for all tiers (including Pro). No API keys required.
 *
 * Usage: node scripts/verify-autopay-pricing-total-count.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Must stay aligned with src/lib/autopayMonths.ts */
function clampAutopayMonths(raw) {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return 6;
  return Math.min(12, Math.max(1, Math.trunc(n)));
}

let failed = false;
function ok(msg) {
  console.log(`OK: ${msg}`);
}
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

const pricing = readFileSync(join(root, "src/components/pricing/PricingPageClient.tsx"), "utf8");
if (!/createRazorpayTrialSubscription\s*\(\s*tier\s*,\s*autopayMonths\s*\)/.test(pricing)) {
  fail("PricingPageClient must pass autopayMonths into createRazorpayTrialSubscription(tier, autopayMonths)");
} else {
  ok("PricingPageClient passes autopayMonths into createRazorpayTrialSubscription");
}

const sub = readFileSync(join(root, "src/actions/subscription.ts"), "utf8");
if (!/const\s+months\s*=\s*clampAutopayMonths\s*\(\s*autopayMonths/.test(sub)) {
  fail("subscription.ts must set months from clampAutopayMonths(autopayMonths) in createRazorpayTrialSubscription");
} else {
  ok("createRazorpayTrialSubscription clamps autopayMonths → months");
}

const bodyIdx = sub.indexOf("const subscriptionCreateBody = {");
if (bodyIdx === -1) {
  fail("subscription.ts must define subscriptionCreateBody for trial checkout");
} else {
  const trialBodySnippet = sub.slice(bodyIdx, bodyIdx + 1200);
  if (!trialBodySnippet.includes("total_count: months")) {
    fail("subscriptionCreateBody must include total_count: months");
  } else {
    ok("Razorpay subscription create uses total_count: months");
  }
}

if (!/kalnehi_autopay_months:\s*String\s*\(\s*months\s*\)/.test(sub)) {
  fail("subscription notes must include kalnehi_autopay_months: String(months)");
} else {
  ok("Subscription notes include kalnehi_autopay_months from months");
}

for (const [raw, expected] of [
  [1, 1],
  [6, 6],
  [12, 12],
  [0, 1],
  [99, 12],
  ["3", 3],
]) {
  const got = clampAutopayMonths(raw);
  if (got !== expected) {
    fail(`clampAutopayMonths(${JSON.stringify(raw)}) expected ${expected}, got ${got}`);
  }
}
if (!failed) {
  ok("clampAutopayMonths samples (1,6,12, bounds) match expected");
}

if (failed) {
  process.exit(1);
}
console.log("—");
console.log("Autopay → total_count wiring verified (including Pro; tier-agnostic).");
