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
      scopes: ["profile", "email"],
      serverClientId:
        "7508986538-9k57efg0stt20qta09askndn0s24isu7.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
