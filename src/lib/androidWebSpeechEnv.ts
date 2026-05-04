/**
 * Android WebView exposes `webkitSpeechRecognition` as a stub that can crash the
 * renderer when `start()` runs. Chrome / full browsers omit `; wv)` from the UA.
 *
 * @see https://developer.chrome.com/docs/multidevice/webview/webview-for-google
 */
export function isAndroidWebViewUserAgent(userAgent: string): boolean {
  if (!userAgent || !/Android/i.test(userAgent)) return false;
  return /;\s*wv\)/i.test(userAgent);
}

export function isAndroidUserAgent(userAgent: string): boolean {
  return Boolean(userAgent && /Android/i.test(userAgent));
}

/** Android browser where Web Speech `start()` is allowed (not WebView). */
export function isAndroidChromeLikeSpeechHost(userAgent: string): boolean {
  return isAndroidUserAgent(userAgent) && !isAndroidWebViewUserAgent(userAgent);
}

type SpeechRecognitionCtor = NonNullable<
  (Window & typeof globalThis)["webkitSpeechRecognition"]
>;

/**
 * Safe Web Speech constructor for the current host.
 * On Android Chrome/PWA, prefer `webkitSpeechRecognition` (often more stable).
 */
export function getSpeechRecognitionCtor(
  win: Window & typeof globalThis,
): SpeechRecognitionCtor | null {
  const ua = typeof win.navigator !== "undefined" ? win.navigator.userAgent : "";
  if (isAndroidWebViewUserAgent(ua)) return null;
  if (isAndroidChromeLikeSpeechHost(ua)) {
    return win.webkitSpeechRecognition ?? win.SpeechRecognition ?? null;
  }
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}
