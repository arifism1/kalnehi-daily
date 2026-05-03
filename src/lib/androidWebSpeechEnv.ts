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
