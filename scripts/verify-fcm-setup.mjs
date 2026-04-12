/**
 * Owner/dev check: required env for Firebase FCM + at least one way to show "Send test notification".
 * Loads .env.local then .env (same order as merge-service-worker.mjs). Does not print secret values.
 * Usage: node scripts/verify-fcm-setup.mjs
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

function ok(v) {
  return typeof v === "string" && v.trim().length > 0;
}

loadEnvFiles();

const requiredPublic = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY",
];

const requiredServer = [
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = [];
for (const k of requiredPublic) {
  if (!ok(process.env[k])) missing.push(k);
}
for (const k of requiredServer) {
  if (!ok(process.env[k])) missing.push(k);
}

const devToolsVisible =
  process.env.NEXT_PUBLIC_FCM_DEV_TOOLS?.trim() === "1" ||
  ok(process.env.NEXT_PUBLIC_DEV_EMAIL) ||
  ok(process.env.FCM_ADMIN_EMAILS) ||
  ok(process.env.FCM_ADMIN_USER_IDS);

if (missing.length) {
  console.error("[verify-fcm-setup] Missing or empty:", missing.join(", "));
  process.exit(1);
}

if (!devToolsVisible) {
  console.warn(
    "[verify-fcm-setup] OK: FCM env present. Warning: no dev/admin gate — add one of NEXT_PUBLIC_FCM_DEV_TOOLS=1, NEXT_PUBLIC_DEV_EMAIL, FCM_ADMIN_EMAILS, or FCM_ADMIN_USER_IDS to see 'Send test notification' in Settings.",
  );
  process.exit(0);
}

console.log(
  "[verify-fcm-setup] OK: FCM env complete and owner/dev test UI can show (FCM_DEV_TOOLS, DEV_EMAIL, or FCM_ADMIN_*).",
);
process.exit(0);
