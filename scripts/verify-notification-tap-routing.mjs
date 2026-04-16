/**
 * Regression check for push tap routing wiring.
 * Usage: node scripts/verify-notification-tap-routing.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function mustInclude(filePath, snippet, message) {
  const source = readFileSync(filePath, "utf8");
  if (!source.includes(snippet)) {
    throw new Error(`${message} (${filePath})`);
  }
}

const copyPath = join(root, "src/lib/systemPush/copy.ts");
const sendPath = join(root, "src/lib/fcm/sendNotifications.ts");
const swInjectPath = join(root, "src/lib/service-worker/fcmBackgroundInjection.ts");

mustInclude(copyPath, "data: { kind, path: resolveSystemPushPath(kind) }", "Missing canonical payload path");
mustInclude(sendPath, "link: resolveWebpushLink(payload.data)", "Missing dynamic webpush fcmOptions link");
mustInclude(swInjectPath, 'self.addEventListener("notificationclick"', "Missing notification click listener");
mustInclude(swInjectPath, "kalnehiResolveNotificationPath", "Missing notification path resolver");
mustInclude(swInjectPath, "self.clients.openWindow", "Missing openWindow fallback");

console.log("[verify-notification-tap-routing] OK: tap routing hooks are wired.");
