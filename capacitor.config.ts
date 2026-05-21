import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for Kalnehi Daily Android app.
 *
 * Architecture: remote-URL mode — the WebView loads https://www.kalnehi.com.
 * The Next.js/Vercel server is unchanged; Capacitor provides the Android native
 * shell, native FCM, deep-link handling, and Play Store packaging.
 *
 * appendUserAgent must stay in sync with ANDROID_APP_UA_MARKER in
 * src/lib/androidAppUa.ts so the proxy and server-side Android detection work.
 */
const config: CapacitorConfig = {
  appId: "com.kalnehi.daily",
  appName: "Kalnehi Daily",
  // webDir is unused in server/remote-URL mode but is required by Capacitor CLI.
  webDir: "out",
  server: {
    url: "https://www.kalnehi.com",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    appendUserAgent: "KalnehiAndroidApp",
    backgroundColor: "#FAF7F2",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FAF7F2",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#FF7A00",
    },
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
