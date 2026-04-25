/**
 * Injects Firebase Messaging (compat) into public/sw.js for background FCM.
 * Reads NEXT_PUBLIC_FIREBASE_* from .env / .env.local / process.env (CI).
 * Run via npm prebuild / dev script.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const swPath = join(root, "public", "sw.js");
const MARKER = "/* __KALNEHI_FCM_INJECT__ */";

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

function readFirebaseVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(join(root, "node_modules", "firebase", "package.json"), "utf8"),
    );
    return typeof pkg.version === "string" ? pkg.version : "12.0.0";
  } catch {
    return "12.0.0";
  }
}

function buildInjection() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !messagingSenderId ||
    !appId
  ) {
    return `
// --- Firebase Cloud Messaging (injected by scripts/merge-service-worker.mjs) ---
// FCM: set NEXT_PUBLIC_FIREBASE_* in .env — background push disabled until configured.
`;
  }

  const ver = readFirebaseVersion();
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();
  const cfg = {
    apiKey,
    authDomain,
    projectId,
    storageBucket: storageBucket || undefined,
    messagingSenderId,
    appId,
    measurementId: measurementId || undefined,
  };
  const cfgJson = JSON.stringify(cfg);

  return `
// --- Firebase Cloud Messaging (injected by scripts/merge-service-worker.mjs) ---
importScripts("https://www.gstatic.com/firebasejs/${ver}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${ver}/firebase-messaging-compat.js");
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(${cfgJson});
  }
  if (firebase.messaging && firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title =
        payload.notification && payload.notification.title
          ? payload.notification.title
          : "Kalnehi Daily - Voice Controlled Exam Prep Tracker";
      const body =
        payload.notification && payload.notification.body
          ? payload.notification.body
          : "";
      const options = {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        data: payload.data || {},
        tag: payload.data && payload.data.tag ? String(payload.data.tag) : "kalnehi-fcm",
      };
      return self.registration.showNotification(title, options);
    });
  }
} catch (e) {
  console.error("[kalnehi sw] FCM background init failed", e);
}
`;
}

function ensureMarker(src) {
  if (src.includes(MARKER)) return src;
  const re =
    /\n\/\/ --- Firebase Cloud Messaging \(injected by scripts\/merge-service-worker\.mjs\) ---[\s\S]*$/m;
  if (re.test(src)) {
    return src.replace(re, `\n\n${MARKER}`);
  }
  return `${src.trimEnd()}\n\n${MARKER}\n`;
}

function main() {
  loadEnvFiles();
  let src = readFileSync(swPath, "utf8");
  src = ensureMarker(src);
  const injection = buildInjection();
  if (!src.includes(MARKER)) {
    console.warn("[merge-service-worker] could not place marker — skipping");
    return;
  }
  src = src.replace(MARKER, injection);
  writeFileSync(swPath, src, "utf8");
  console.log("[merge-service-worker] updated public/sw.js with FCM block");
}

main();
