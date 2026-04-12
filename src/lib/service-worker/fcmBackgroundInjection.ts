import { readFileSync } from "node:fs";
import { join } from "node:path";

function readFirebaseVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "node_modules", "firebase", "package.json"), "utf8"),
    ) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "12.0.0";
  } catch {
    return "12.0.0";
  }
}

/**
 * Background FCM handler for the service worker. Built from NEXT_PUBLIC_FIREBASE_*
 * at runtime in the Node route (never written into tracked static files).
 */
export function buildFcmBackgroundInjection(): string {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    return `
// --- Firebase Cloud Messaging (injected at runtime by /sw.js route) ---
// FCM: set NEXT_PUBLIC_FIREBASE_* — background push disabled until configured.
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
// --- Firebase Cloud Messaging (injected at runtime by /sw.js route) ---
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
          : "Kalnehi Daily";
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
