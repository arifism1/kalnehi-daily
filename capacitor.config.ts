import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Remote shell: WebView loads production; webDir is required but unused at runtime.
 * After changing config: `npx cap sync android` then open with `npx cap open android`.
 */
const config: CapacitorConfig = {
  appId: "com.kalnehi.daily",
  appName: "Kalnehi Daily",
  webDir: "public",
  server: {
    url: "https://www.kalnehi.com/",
    cleartext: true,
  },
  android: {
    appendUserAgent: "KalnehiAndroidApp",
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    GoogleAuth: {
      clientId:
        "543640707010-phpkve2satg1tj3sk2acp3t6eu7klds8.apps.googleusercontent.com",
      scopes: "profile,email",
      serverClientId:
        "543640707010-phpkve2satg1tj3sk2acp3t6eu7klds8.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
