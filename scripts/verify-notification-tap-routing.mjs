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
const resolvePath = join(root, "src/lib/fcm/resolveNotificationPath.ts");
const nativeListenerPath = join(root, "src/components/FcmNativeListener.tsx");
const foregroundPath = join(root, "src/components/FcmForegroundListener.tsx");
const layoutPath = join(root, "src/app/layout.tsx");

mustInclude(copyPath, "data: { kind, path: resolveSystemPushPath(kind) }", "Missing canonical payload path");
mustInclude(sendPath, "fcmOptions:", "Missing cross-platform fcmOptions link");
mustInclude(sendPath, "resolveNotificationPath", "Missing shared path resolver in send helper");
mustInclude(swInjectPath, 'self.addEventListener("notificationclick"', "Missing notification click listener");
mustInclude(swInjectPath, "kalnehiResolveNotificationPath", "Missing notification path resolver");
mustInclude(swInjectPath, "self.clients.openWindow", "Missing openWindow fallback");
mustInclude(swInjectPath, "buildNotificationPathFallbackMap", "SW injection must use shared fallback map");
mustInclude(resolvePath, "export function resolveNotificationPath", "Missing resolveNotificationPath export");
mustInclude(nativeListenerPath, "notificationActionPerformed", "Native listener must handle notification taps");
mustInclude(nativeListenerPath, "tokenReceived", "Native listener must handle token refresh");
mustInclude(nativeListenerPath, "resolveNotificationPath", "Native listener must use shared path resolver");
mustInclude(foregroundPath, "resolveNotificationPath", "Foreground listener must use shared path resolver");
mustInclude(foregroundPath, "notification.onclick", "Foreground listener must handle notification clicks");
mustInclude(layoutPath, "FcmNativeListener", "Layout must mount FcmNativeListener");

console.log("[verify-notification-tap-routing] OK: tap routing hooks are wired.");
